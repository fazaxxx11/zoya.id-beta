import { createClient } from '@supabase/supabase-js';
import { checkToolAccess } from './_lib/billing.js';
import { validate, BillingCheckSchema } from './_lib/validate.js';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check for Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.split(' ')[1];
    
    // Initialize Supabase client with the user's token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Validate request body
    const validation = validate(BillingCheckSchema, req.body || {});
    if (!validation.valid) {
      return res.status(400).json({ error: 'Payload tidak valid', details: validation.errors });
    }
    const { toolId, sampleSize } = validation.data;

    // Initialize admin client for server-side operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Check tool access
    const result = await checkToolAccess(
      supabaseAdmin,
      user.id,
      toolId,
      sampleSize || 0
    );

    // Return the result
    return res.status(200).json(result);

  } catch (error) {
    console.error('Error in billing-check endpoint:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};