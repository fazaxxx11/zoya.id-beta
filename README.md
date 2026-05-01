# AI Assessment Tool — by zaaaxx

Sistem penilaian rubrik otomatis berbasis AI (Claude) untuk dosen/guru.

## Fitur
- Buat rubrik penilaian custom dengan bobot per kriteria
- Input jawaban beberapa murid sekaligus
- AI menilai tiap kriteria dengan skor 1–10 dan komentar
- Skor final otomatis berdasarkan bobot

## Deploy ke Vercel

### 1. Clone & install
```bash
git clone https://github.com/username/mafaza-assessment.git
cd mafaza-assessment
npm install
```

### 2. Dapatkan API Key Anthropic
- Daftar di [console.anthropic.com](https://console.anthropic.com)
- Buat API key baru

### 3. Deploy ke Vercel
```bash
npm install -g vercel
vercel
```

Atau connect repo GitHub kamu di [vercel.com](https://vercel.com) → **Import Project**.

### 4. Tambahkan Environment Variable di Vercel
Di dashboard Vercel → Settings → Environment Variables:
```
ANTHROPIC_API_KEY = sk-ant-xxxxxxxxxxxxx
```

### 5. Redeploy
Setelah menambah env var, klik **Redeploy** di Vercel.

## Development Lokal
```bash
cp .env.example .env.local
# isi ANTHROPIC_API_KEY di .env.local
npm run dev
```
# z
