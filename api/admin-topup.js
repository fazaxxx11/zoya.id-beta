import { createClient } from '@supabase/supabase-js';

// Initialize Supabase admin client with service role key
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Helper to verify admin role
async function requireAdmin(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header');
  }

  const token = authHeader.split(' ')[1];
  
  // Verify JWT and get user
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    throw new Error('Invalid token');
  }

  // Check if user is admin in profiles table
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || profile?.role !== 'admin') {
    throw new Error('Admin access required');
  }

  return user;
}

export default async function handler(req, res) {
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify admin access
    const adminUser = await requireAdmin(req);
    
    const { topupId, action, rejectReason } = req.body;
    
    // Validate input
    if (!topupId || !action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing or invalid parameters: topupId and action (approve/reject) required' 
      });
    }

    if (action === 'reject' && !rejectReason) {
      return res.status(400).json({ 
        success: false, 
        error: 'rejectReason required for reject action' 
      });
    }

    if (action === 'approve') {
      // Get the pending topup details
      const { data: pendingTopup, error: fetchError } = await supabaseAdmin
        .from('pending_topups')
        .select('user_id, amount, bonus')
        .eq('id', topupId)
        .eq('status', 'pending')
        .single();

      if (fetchError || !pendingTopup) {
        return res.status(404).json({ 
          success: false, 
          error: 'Pending topup not found or already processed' 
        });
      }

      // Call the top_up_wallet RPC function
      const { error: topupError } = await supabaseAdmin.rpc('top_up_wallet', {
        p_user_id: pendingTopup.user_id,
        p_amount: pendingTopup.amount + pendingTopup.bonus,
        p_reference_id: topupId
      });

      if (topupError) {
        console.error('Topup error:', topupError);
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to process topup: ' + topupError.message 
        });
      }

      // Update pending topup status to approved
      const { error: updateError } = await supabaseAdmin
        .from('pending_topups')
        .update({
          status: 'approved',
          admin_id: adminUser.id,
          processed_at: new Date().toISOString()
        })
        .eq('id', topupId);

      if (updateError) {
        console.error('Update error:', updateError);
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to update pending topup status' 
        });
      }

      return res.status(200).json({ 
        success: true, 
        message: 'Topup approved successfully' 
      });

    } else if (action === 'reject') {
      // Update pending topup status to rejected
      const { error: updateError } = await supabaseAdmin
        .from('pending_topups')
        .update({
          status: 'rejected',
          admin_id: adminUser.id,
          reject_reason: rejectReason,
          processed_at: new Date().toISOString()
        })
        .eq('id', topupId)
        .eq('status', 'pending');

      if (updateError) {
        console.error('Update error:', updateError);
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to reject pending topup' 
        });
      }

      return res.status(200).json({ 
        success: true, 
        message: 'Topup rejected successfully' 
      });
    }

  } catch (error) {
    console.error('Admin topup error:', error);
    
    if (error.message === 'Missing or invalid authorization header' ||
        error.message === 'Invalid token') {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }
    
    if (error.message === 'Admin access required') {
      return res.status(403).json({ 
        success: false, 
        error: 'Admin access required' 
      });
    }

    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error: ' + error.message 
    });
  }
}