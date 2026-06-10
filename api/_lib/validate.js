// api/_lib/validate.js
// Zod schemas + validation helper for all AI endpoints
// Validates request body BEFORE auth/rate-limit to reject garbage early

import { z } from 'zod';

// ── Common schemas ────────────────────────────────────────────────
const NonEmptyString = z.string().min(1).max(50_000);
const LimitedString = (max = 2000) => z.string().max(max);

// ── /api/assess ───────────────────────────────────────────────────
// Mode baru: {rubrik, jawaban, studentName?, title?, context?}
// Mode lama: {messages, max_tokens?}

const RubrikItem = z.object({
  id: NonEmptyString.optional(),
  name: NonEmptyString,
  weight: z.number().min(0).max(100),
  description: LimitedString(1000).optional(),
});

const JawabanItem = z.object({
  rubrikId: NonEmptyString.optional(),
  text: LimitedString(10_000),
});

const AssessStructuredBody = z.object({
  rubrik: z.array(RubrikItem).min(1).max(50),
  jawaban: z.array(JawabanItem).min(1).max(200),
  studentName: LimitedString(200).optional(),
  title: LimitedString(500).optional(),
  context: LimitedString(5000).optional(),
});

const ChatMessage = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: LimitedString(10_000),
});

const AssessLegacyBody = z.object({
  messages: z.array(ChatMessage).min(1).max(100),
  max_tokens: z.number().int().min(100).max(4000).optional(),
});

export const AssessSchema = z.union([AssessStructuredBody, AssessLegacyBody]);

// ── /api/interpret-stats ──────────────────────────────────────────
const InterpretResult = z.object({
  type: NonEmptyString,
  toolName: LimitedString(200).optional(),
  sampleSize: z.number().int().positive().optional(),
  stats: z.array(z.object({}).passthrough()).max(100).optional(),
  results: z.array(z.object({}).passthrough()).max(100).optional(),
}).passthrough(); // Allow additional fields from analysis results

export const InterpretSchema = z.object({
  result: InterpretResult,
});

// ── /api/explain-chat ─────────────────────────────────────────────
const ExplainMessage = z.object({
  role: z.enum(['user', 'assistant']),
  content: LimitedString(2000),
});

export const ExplainSchema = z.object({
  resultContext: NonEmptyString.max(10_000),
  messages: z.array(ExplainMessage).min(1).max(20),
});

// ── /api/generate-kuesioner ───────────────────────────────────────
export const KuesionerSchema = z.object({
  mode: z.enum(['quick', 'blueprint']).default('quick'),
  topic: LimitedString(500).optional(),
  variable: LimitedString(500).optional(),
  dimensions: LimitedString(1000).optional(),
  scale: z.number().int().min(3).max(10).default(5),
  itemsPerDimension: z.number().int().min(3).max(20).default(5),
  includeDemografi: z.boolean().default(false),
}).refine(data => data.topic || data.variable, {
  message: 'topic atau variable wajib diisi',
});

// ── /api/admin-topup ─────────────────────────────────────────────
export const AdminTopupSchema = z.object({
  topupId: NonEmptyString,
  action: z.enum(['approve', 'reject']),
  rejectReason: z.string().max(1000).optional(),
}).refine(data => data.action !== 'reject' || (data.rejectReason && data.rejectReason.trim()), {
  message: 'rejectReason wajib diisi untuk aksi reject',
  path: ['rejectReason'],
});

// ── /api/billing-check ────────────────────────────────────────────
export const BillingCheckSchema = z.object({
  toolId: NonEmptyString,
  sampleSize: z.number().int().min(0).max(100000).optional(),
});

// ── /api/pending-topups (POST) ────────────────────────────────────
export const PendingTopupSchema = z.object({
  amount: z.number().int().min(1000, 'Minimal top-up Rp 1.000').max(10000000, 'Maksimal top-up Rp 10.000.000'),
  method: z.enum(['transfer', 'ewallet', 'qris']).default('transfer'),
  note: z.string().max(500).default(''),
});

// ── Validation helper ─────────────────────────────────────────────
// Returns { valid, data, errors } — never throws
export function validate(schema, body) {
  const result = schema.safeParse(body);
  if (result.success) {
    return { valid: true, data: result.data, errors: null };
  }
  const errors = result.error.issues.map(i => ({
    path: i.path.join('.'),
    message: i.message,
  }));
  return { valid: false, data: null, errors };
}

// ── Middleware: validate request body ──────────────────────────────
// Attaches validated data to req._validatedBody
export function validateBody(schema) {
  return (req, res) => {
    const body = req.body || {};
    const result = validate(schema, body);
    if (!result.valid) {
      res.status(400).json({
        error: 'Payload tidak valid',
        details: result.errors,
      });
      return false;
    }
    req._validatedBody = result.data;
    return true;
  };
}
