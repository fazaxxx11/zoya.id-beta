# zoya.id — AI Tools for Research & Education

Alat bantu riset dan analisis statistik berbasis AI untuk dosen, mahasiswa, dan peneliti.

## Tech Stack

- **Frontend:** React 18 + Vite + Tailwind CSS
- **Backend/API:** Express.js (local dev) + Vercel Serverless Functions (production)
- **Database:** Supabase (PostgreSQL + RLS)
- **AI Providers:** GeneralCompute (DeepSeek V3.2) → OpenRouter → Groq → Kimi (cascade fallback)
- **Auth:** JWT via Supabase Auth
- **Rate Limiting:** Upstash Redis (optional, degrades gracefully to in-memory)
- **Payments:** Midtrans (Indonesian payment gateway)

## Fitur

- **Assessment** — Rubrik penilaian otomatis berbasis AI
- **Statistik** — Analisis deskriptif, inferensial, non-parametrik
- **Kuesioner** — Generate instrumen Likert otomatis
- **Interpretasi** — AI menulis interpretasi akademik dari hasil uji
- **Explain** — "Belum Paham?" chat untuk penjelasan statistik

## Setup

### 1. Clone & Install

```bash
git clone https://github.com/fazaxxx11/zoya.id-beta.git
cd zoya.id-beta
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env — isi minimal SUPABASE_URL, SUPABASE_ANON_KEY, dan salah satu AI provider key
```

### 3. Run Development

```bash
npm run dev          # Vite dev server (frontend only)
npm run server       # Express server (full stack, port 3000)
```

### 4. Build & Preview

```bash
npm run build
npm run preview
```

## Environment Variables

Lihat `.env.example` untuk daftar lengkap. Yang wajib:

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (backend only) |
| `GENERALCOMPUTE_API_KEY` | GeneralCompute API key (DeepSeek V3.2) |
| `GROQ_API_KEY` | Groq API key (fallback, gratis) |

Opsional:
- `KIMI_API_KEY` — Kimi/Moonshot fallback
- `OPENROUTER_API_KEY` — OpenRouter multi-model fallback
- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` — Redis rate limiting

### AI Provider URL/Model Override

Semua provider support env override untuk URL dan model:

```
GENERALCOMPUTE_URL atau GENERALCOMPUTE_BASE_URL
GENERALCOMPUTE_MODEL (default: deepseek-v3.2)
GROQ_URL atau GROQ_BASE_URL
GROQ_MODEL (default: llama-3.3-70b-versatile)
KIMI_URL atau KIMI_BASE_URL
KIMI_MODEL (default: moonshot-v1-8k)
OPENROUTER_URL atau OPENROUTER_BASE_URL
OPENROUTER_MODEL (default: openrouter/auto)
```

### Rate Limiting

```
RATE_LIMIT_USER_MAX=20       # per user per window
RATE_LIMIT_IP_MAX=40         # per IP per window
RATE_LIMIT_WINDOW_MS=60000   # 60 detik
RATE_LIMIT_FAIL_CLOSED=false # true = reject saat Redis down
```

Tanpa Redis, rate limit menggunakan in-memory degraded mode dengan limit lebih ketat (`floor(max * 0.5)`).

### CORS

```
ALLOWED_ORIGINS=https://zoya.id,https://www.zoya.id,https://zoya-id-beta.vercel.app
```

## Testing

```bash
npm test              # Run Vitest unit tests
npm run test:watch    # Watch mode
npm run lint          # ESLint
```

## Production Hardening

- **Redis optional** — Graceful degraded fallback saat Redis down
- **Circuit breaker** — Per-provider, trips setelah 3 transient failure, cooldown 60s
- **Rate limit configurable** — Semua limit bisa di-set via env
- **CORS configurable** — Allowed origins dari env
- **Supabase migrations** — Indexes untuk performa query
- **Kill switches** — `AI_ENABLED=false`, `PAYMENTS_ENABLED=false`

## Deploy ke Vercel

```bash
npm install -g vercel
vercel
```

Atau connect repo GitHub di [vercel.com](https://vercel.com) → Import Project → set env vars di dashboard.

## Security — Dependency Notes

- **exceljs@4.4.0** — handles all Excel **parsing** (user uploads). No known vulnerabilities.
- **xlsx@0.18.5** — used for **export only** (app writes .xlsx files). Not used for parsing untrusted input. Known HIGH vulns (prototype pollution, ReDoS) are **not exploitable** in write-only context. Tracked: [GHSA-4r6h-8v6p-xvw6](https://github.com/advisories/GHSA-4r6h-8v6p-xvw6), [GHSA-5pgg-2g8v-p4x9](https://github.com/advisories/GHSA-5pgg-2g8v-p4x9).

Migration date: 2026-06-15. See `src/utils/excelHelper.js` for parser implementation.

## License

Private — zoya.id
