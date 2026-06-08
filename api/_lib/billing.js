import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Pricing configuration
const STATISTICS_PRICES = {
  deskriptif: { price: 5000, tier: 'dasar', name: 'Statistik Deskriptif' },
  normalitas: { price: 5000, tier: 'dasar', name: 'Uji Normalitas' },
  korelasi: { price: 5000, tier: 'dasar', name: 'Korelasi' },
  ttest: { price: 5000, tier: 'dasar', name: 'T-Test' },
  validitas: { price: 7000, tier: 'menengah', name: 'Validitas & Reliabilitas' },
  regresi: { price: 8000, tier: 'menengah', name: 'Regresi Sederhana' },
  anova: { price: 8000, tier: 'menengah', name: 'One-way ANOVA' },
  chisquare: { price: 6000, tier: 'menengah', name: 'Chi-Square' },
  mannwhitney: { price: 6000, tier: 'menengah', name: 'Mann-Whitney U' },
  wilcoxon: { price: 6000, tier: 'menengah', name: 'Wilcoxon Signed-Rank' },
  kruskal: { price: 7000, tier: 'menengah', name: 'Kruskal-Wallis' },
  ngain: { price: 6000, tier: 'menengah', name: 'Uji N-Gain (Hake)' },
  itemanalysis: { price: 7000, tier: 'menengah', name: 'Analisis Butir Soal' },
  regresiganda: { price: 12000, tier: 'lanjutan', name: 'Regresi Berganda' },
  twowayanova: { price: 12000, tier: 'lanjutan', name: 'Two-way ANOVA' },
  mediation: { price: 12000, tier: 'lanjutan', name: 'Analisis Mediasi (Hayes)' },
  logistic: { price: 12000, tier: 'lanjutan', name: 'Regresi Logistik' },
  efa: { price: 12000, tier: 'lanjutan', name: 'Analisis Faktor (EFA)' },
  qualitative: { price: 8000, tier: 'menengah', name: 'Analisis Kualitatif (Coding)' },
  sampling: { price: 5000, tier: 'dasar', name: 'Kalkulator Sampel' },
  kuesioner: { price: 5000, tier: 'dasar', name: 'Generator Kuesioner' },
};

const ASSESSMENT_TIERS = [
  { maxStudents: 5, price: 5000, label: '1-5 siswa' },
  { maxStudents: 15, price: 10000, label: '6-15 siswa' },
  { maxStudents: 30, price: 18000, label: '16-30 siswa' },
];
const ASSESSMENT_OVERFLOW = { startsAt: 30, basePrice: 25000, perStudent: 500 };

/**
 * Check if user has access to a tool
 * @param {object} supabaseAdmin - Supabase admin client
 * @param {string} userId - User ID
 * @param {string} toolId - Tool identifier
 * @param {number} sampleSize - Sample size for statistics tools
 * @returns {Promise<object>} Access check result
 */
export async function checkToolAccess(supabaseAdmin, userId, toolId, sampleSize) {
  try {
    // Check for BETA_FREE environment variable
    if (process.env.BETA_FREE === 'true') {
      return {
        allowed: true,
        price: 0,
        balance: 0,
        reason: 'BETA_FREE mode enabled'
      };
    }

    // Get user profile to check admin status
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (profileError) {
      throw new Error(`Failed to fetch user profile: ${profileError.message}`);
    }

    // Admin users always allowed with price=0
    if (profile.role === 'admin') {
      return {
        allowed: true,
        price: 0,
        balance: 0,
        reason: 'Admin user'
      };
    }

    // Get user wallet balance
    const { data: wallet, error: walletError } = await supabaseAdmin
      .from('wallets')
      .select('balance, bonus')
      .eq('user_id', userId)
      .single();

    if (walletError) {
      throw new Error(`Failed to fetch wallet: ${walletError.message}`);
    }

    const balance = (wallet.balance || 0) + (wallet.bonus || 0);

    // Calculate price based on tool type
    let price = 0;
    
    if (toolId === 'assessment') {
      price = calculateAssessmentPrice(sampleSize);
    } else if (STATISTICS_PRICES[toolId]) {
      price = calculateStatisticsPrice(toolId, sampleSize);
    } else {
      return {
        allowed: false,
        price: 0,
        balance,
        reason: 'Invalid tool ID'
      };
    }

    // Check if user has sufficient balance
    const allowed = balance >= price;

    return {
      allowed,
      price,
      balance,
      reason: allowed ? undefined : 'Insufficient balance'
    };

  } catch (error) {
    console.error('Error in checkToolAccess:', error);
    return {
      allowed: false,
      price: 0,
      balance: 0,
      reason: `Internal error: ${error.message}`
    };
  }
}

/**
 * Charge user for tool usage
 * @param {object} supabaseAdmin - Supabase admin client
 * @param {string} userId - User ID
 * @param {string} toolId - Tool identifier
 * @param {number} sampleSize - Sample size for statistics tools
 * @param {string} orderId - Optional order ID (will be generated if not provided)
 * @returns {Promise<object>} Charge result
 */
export async function chargeForTool(supabaseAdmin, userId, toolId, sampleSize, orderId = null) {
  try {
    // First check if user has access
    const accessCheck = await checkToolAccess(supabaseAdmin, userId, toolId, sampleSize);
    
    if (!accessCheck.allowed) {
      return {
        success: false,
        error: 'Access denied',
        reason: accessCheck.reason,
        price: accessCheck.price,
        balance: accessCheck.balance
      };
    }

    // If price is 0 (admin or BETA_FREE), just create order record
    if (accessCheck.price === 0) {
      const orderData = {
        userId,
        service: toolId === 'assessment' ? 'assessment' : 'statistics',
        tier: STATISTICS_PRICES[toolId]?.tier || 'assessment',
        amount: 0,
        paymentMethod: 'wallet',
        status: 'completed'
      };
      
      const createdOrder = await createOrder(supabaseAdmin, orderData);
      
      return {
        success: true,
        paid: 0,
        orderId: createdOrder.id || orderId,
        balance: accessCheck.balance
      };
    }

    // Generate order ID if not provided
    const finalOrderId = orderId || `order_${crypto.randomUUID()}`;
    
    // Try to use RPC function first
    try {
      const { data: rpcResult, error: rpcError } = await supabaseAdmin
        .rpc('deduct_wallet_and_create_order', {
          p_user_id: userId,
          p_amount: accessCheck.price,
          p_order_id: finalOrderId,
          p_service: toolId === 'assessment' ? 'assessment' : 'statistics',
          p_tier: STATISTICS_PRICES[toolId]?.tier || 'assessment',
          p_tool_id: toolId,
          p_sample_size: sampleSize
        });

      if (rpcError) {
        throw new Error(`RPC failed: ${rpcError.message}`);
      }

      return {
        success: true,
        paid: accessCheck.price,
        orderId: finalOrderId,
        balance: rpcResult.new_balance || (accessCheck.balance - accessCheck.price)
      };

    } catch (rpcError) {
      console.log('RPC not available, falling back to manual transaction:', rpcError.message);
      
      // Fallback to manual transaction
      return await manualDeductAndCreateOrder(
        supabaseAdmin, 
        userId, 
        toolId, 
        sampleSize, 
        accessCheck.price, 
        finalOrderId
      );
    }

  } catch (error) {
    console.error('Error in chargeForTool:', error);
    return {
      success: false,
      error: 'Charge failed',
      reason: error.message
    };
  }
}

/**
 * Manual fallback for deducting wallet and creating order
 */
async function manualDeductAndCreateOrder(supabaseAdmin, userId, toolId, sampleSize, price, orderId) {
  // Start a transaction by using multiple operations
  // First, deduct from wallet
  const { data: wallet, error: walletError } = await supabaseAdmin
    .from('wallets')
    .select('balance, bonus')
    .eq('user_id', userId)
    .single();

  if (walletError) {
    throw new Error(`Failed to fetch wallet: ${walletError.message}`);
  }

  let newBalance = (wallet.balance || 0);
  let newBonus = (wallet.bonus || 0);
  let deductedFromBonus = 0;
  let deductedFromBalance = 0;

  // Deduct from bonus first, then from balance
  if (newBonus >= price) {
    newBonus -= price;
    deductedFromBonus = price;
  } else {
    deductedFromBonus = newBonus;
    const remaining = price - newBonus;
    newBonus = 0;
    
    if (newBalance >= remaining) {
      newBalance -= remaining;
      deductedFromBalance = remaining;
    } else {
      throw new Error('Insufficient balance after bonus deduction');
    }
  }

  // Update wallet
  const { error: updateError } = await supabaseAdmin
    .from('wallets')
    .update({
      balance: newBalance,
      bonus: newBonus,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId);

  if (updateError) {
    throw new Error(`Failed to update wallet: ${updateError.message}`);
  }

  // Create order record
  const orderData = {
    userId,
    service: toolId === 'assessment' ? 'assessment' : 'statistics',
    tier: STATISTICS_PRICES[toolId]?.tier || 'assessment',
    amount: price,
    paymentMethod: 'wallet',
    status: 'completed',
    metadata: {
      toolId,
      sampleSize,
      deductedFromBonus,
      deductedFromBalance,
      finalBalance: newBalance,
      finalBonus: newBonus
    }
  };

  const createdOrder = await createOrder(supabaseAdmin, orderData);

  return {
    success: true,
    paid: price,
    orderId: createdOrder.id || orderId,
    balance: newBalance + newBonus
  };
}

/**
 * Create an order record
 * @param {object} supabaseAdmin - Supabase admin client
 * @param {object} orderData - Order data
 * @returns {Promise<object>} Created order
 */
export async function createOrder(supabaseAdmin, { userId, service, tier, amount, paymentMethod, status, metadata = {} }) {
  try {
    const orderRecord = {
      user_id: userId,
      service,
      tier,
      amount,
      payment_method: paymentMethod,
      status,
      metadata,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabaseAdmin
      .from('orders')
      .insert([orderRecord])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create order: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error in createOrder:', error);
    throw error;
  }
}

/**
 * Calculate assessment price based on student count
 * @param {number} studentCount - Number of students
 * @returns {number} Price in Rupiah
 */
export function calculateAssessmentPrice(studentCount) {
  if (studentCount <= 0) return 0;
  
  // Check tiers
  for (const tier of ASSESSMENT_TIERS) {
    if (studentCount <= tier.maxStudents) {
      return tier.price;
    }
  }
  
  // Overflow pricing
  if (studentCount > ASSESSMENT_OVERFLOW.startsAt) {
    const overflowStudents = studentCount - ASSESSMENT_OVERFLOW.startsAt;
    return ASSESSMENT_OVERFLOW.basePrice + (overflowStudents * ASSESSMENT_OVERFLOW.perStudent);
  }
  
  // Fallback (should not happen)
  return ASSESSMENT_TIERS[ASSESSMENT_TIERS.length - 1].price;
}

/**
 * Calculate statistics tool price
 * @param {string} toolId - Tool identifier
 * @param {number} sampleSize - Sample size
 * @returns {number} Price in Rupiah
 */
export function calculateStatisticsPrice(toolId, sampleSize) {
  const toolConfig = STATISTICS_PRICES[toolId];
  if (!toolConfig) {
    throw new Error(`Invalid tool ID: ${toolId}`);
  }
  
  // Base price from config
  let price = toolConfig.price;
  
  // Add sample size multiplier for certain tools
  if (sampleSize > 100) {
    // For large samples, add 10% for every 100 over 100
    const overage = Math.floor((sampleSize - 100) / 100);
    price += Math.floor(price * 0.1 * overage);
  }
  
  return price;
}