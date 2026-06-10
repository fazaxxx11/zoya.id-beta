-- Migration: Add performance indexes (non-destructive, idempotent)
-- Created: 2026-06-10 Sprint 1 hardening

-- Profiles: admin role lookups
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Orders: dashboard queries, billing history
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON public.orders(status, created_at DESC);

-- Assessments: user history, student lookups
CREATE INDEX IF NOT EXISTS idx_assessments_created_at ON public.assessments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assessments_student ON public.assessments(student_name);

-- Payment intents: status filtering, recent updates
CREATE INDEX IF NOT EXISTS idx_payment_intents_status ON public.payment_intents(status);
CREATE INDEX IF NOT EXISTS idx_payment_intents_updated ON public.payment_intents(updated_at DESC);

-- Note: saved_analyses(user_id, created_at DESC) already exists — do NOT duplicate
