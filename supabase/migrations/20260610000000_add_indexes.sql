-- Migration: Add high-impact indexes for performance
-- Uses CREATE INDEX IF NOT EXISTS for idempotency

-- Orders: frequently queried by user_id + status + created_at
CREATE INDEX IF NOT EXISTS idx_orders_user_status_created
  ON orders (user_id, status, created_at DESC);

-- Assessments: user lookups + order association
CREATE INDEX IF NOT EXISTS idx_assessments_user_order
  ON assessments (user_id, order_id);

-- Payment intents: user billing history + status filtering
CREATE INDEX IF NOT EXISTS idx_payment_intents_user_status_created
  ON payment_intents (user_id, status, created_at DESC);

-- Pending topups: admin queue processing by status + created_at
CREATE INDEX IF NOT EXISTS idx_pending_topups_status_created
  ON pending_topups (status, created_at DESC);
