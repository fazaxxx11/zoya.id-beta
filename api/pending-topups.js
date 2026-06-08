import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Helper to verify authentication
async function requireAuth(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header');
  }

  const token = authHeader.split(' ')[1];
  
  // Verify JWT and get user
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    throw new Error('Invalid token');
  }

  return user;
}

// Calculate bonus based on amount
function calculateBonus(amount) {
  if (amount >= 25000) {
    const bonus = Math.floor(amount * 1.0); // 100% bonus
    return Math.min(bonus, 250000); // Max 250000 bonus
  }
  return 0;
}

export default async function handler(req, res) {
  try {
    const user = await requireAuth(req);

    if (req.method === 'GET') {
      // Get user's own pending topups
      const { data, error } = await supabase
        .from('pending_topups')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching pending topups:', error);
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to fetch pending topups' 
        });
      }

      return res.status(200).json({ 
        success: true, 
        data 
      });

    } else if (req.method === 'POST') {
      const { amount, method = 'transfer', note = '' } = req.body;

      // Validate amount
      if (!amount || typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Valid amount greater than 0 is required' 
        });
      }

      // Calculate bonus
      const bonus = calculateBonus(amount);

      // Create pending topup
      const { data, error } = await supabase
        .from('pending_topups')
        .insert({
          user_id: user.id,
          amount,
          bonus,
          method,
          note,
          status: 'pending'
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating pending topup:', error);
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to create pending topup request' 
        });
      }

      return res.status(201).json({ 
        success: true, 
        data 
      });

    } else {
      return res.status(405).json({ 
        success: false, 
        error: 'Method not allowed' 
      });
    }

  } catch (error) {
    console.error('Pending topups error:', error);
    
    if (error.message === 'Missing or invalid authorization header' ||
        error.message === 'Invalid token') {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error: ' + error.message 
    });
  }
}