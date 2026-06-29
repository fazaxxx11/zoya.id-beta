# Azezmen — Project Instructions for AI Agents

## ⚠️ WAJIB BACA DULU
- **Baca [`laporan.md`](./laporan.md) SEBELUM mengerjakan frontend apapun.** Berisi progress redesign terkini, token warna final, dan daftar "Yang Dilarang".
- Design system di bawah ini adalah baseline lama. **Yang otoritatif ada di `laporan.md`** — jika ada konflik, `laporan.md` menang.

## Stack
- Vite + React 18, Tailwind CSS 3
- Package manager: **pnpm** (NOT npm/yarn). Di env tanpa pnpm global: gunakan `npx pnpm <cmd>`.
- Python/Scipy backend (Vercel serverless functions)

## Critical Rules
- **FRONTEND ONLY** — NEVER touch `api/`, `*.py`, `requirements.txt`, `vercel.json`
- **DO NOT** change `package.json` dependencies
- **DO NOT** refactor backend routes or Supabase auth
- Tests must stay green: `pnpm test -- --run` → 366/366

## Design System
- Scholarly/academic design — NOT SaaS-template
- Primary gold: `#B58B45` (accent)
- Background: warm ivory `#F7F3EA` (light) / deep navy `#172033` (dark)
- Font headings: EB Garamond (serif)
- Font body: IBM Plex Sans (sans-serif)
- NO purple, gradients, glassmorphism, sparkles, chatbot bubbles
- NO Inter/Roboto fonts
- Icons: lucide-react (use BookOpen, Activity, ClipboardCheck, FileUp — NOT BarChart3, ClipboardList)

## Anti-AI-Vibe Checklist
- No `text-gray-300/400` dead colors → use theme tokens (`text-muted`, `bg-surface`, `border-border`)
- No `bg-gray-50/100` → use `bg-surface`
- No generic lucide icons (BarChart3, ClipboardList → Activity, ClipboardCheck)
- Per-section color variety (gold, teal, indigo, emerald) — not same accent everywhere
- Human touches: decorative blur orbs, paper texture, organic imperfections
- Footer personality: "Dibuat dengan hati untuk..."

## Build & Test
```bash
pnpm install --frozen-lockfile   # install deps
pnpm run build                    # production build
pnpm test -- --run                # run 366 tests
```

## Deploy
- Push to `main` → Vercel auto-deploys
- URL: https://azezmen.vercel.app
