# Supabase Setup — SkorAI

Panduan setup Supabase untuk SkorAI dari nol.

## 1. Buat Project Supabase
1. Daftar di https://supabase.com (gratis, no CC)
2. New Project → pilih region **Singapore** (terdekat dari Indonesia)
3. Set database password (catat baik-baik)
4. Tunggu ~2 menit sampai project ready

## 2. Jalankan Schema
1. Sidebar → **SQL Editor** → **New query**
2. Buka file `supabase/schema.sql` di repo ini, copy semua isinya
3. Paste ke SQL Editor → klik **Run**
4. Pastikan tidak ada error merah. Cek di **Table Editor** harus muncul tabel:
   `profiles, wallets, wallet_transactions, orders, assessments, rubrics, payment_intents`

## 3. Konfigurasi Auth
1. Sidebar → **Authentication** → **Providers** → enable **Email**
2. (Opsional dev) Disable "Confirm email" supaya bisa langsung login tanpa verifikasi:
   Authentication → Sign In / Up → Email → matikan **Confirm email**
3. (Opsional) Setup SMTP custom kalau mau email branded (Resend / SendGrid)

## 4. Ambil API Keys
1. Sidebar → **Project Settings** → **API**
2. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY`
   - **service_role secret** → `SUPABASE_SERVICE_ROLE_KEY` (jangan expose di client!)
3. Paste ke `.env.local` di root project

## 5. Set Admin Pertama
Setelah register user pertama via UI, jalankan di SQL Editor:
```sql
update public.profiles set role = 'admin' where email = 'email-kamu@example.com';
```

## 6. Mode Beta Gratis
Saat beta, pricing/paywall masih **coming soon** dan semua tools inti bisa dipakai gratis setelah user login.
Guest access baru dibuka nanti setelah payment diterapkan.

Set env berikut untuk menjaga beta tetap gratis:
```env
VITE_BETA_FREE=true
```

Nanti saat monetisasi sudah siap, ubah menjadi:
```env
VITE_BETA_FREE=false
```

## 7. Verifikasi
1. `npm run dev`
2. Buka http://localhost:5173/auth → register → harus berhasil
3. Cek Supabase → Table Editor → `profiles` & `wallets` → ada row baru dengan saldo awal 0
4. Pastikan tidak ada welcome bonus / transaksi `welcome`
5. Logout lalu coba jalankan tool → harus diarahkan login dulu

## Troubleshooting
- **"Email rate limit exceeded"** saat register: Auth → Settings → naikkan rate limit, atau pakai email beda
- **RLS error "new row violates row-level security"**: cek policy di `schema.sql` sudah ke-apply
- **Trigger tidak jalan**: re-run bagian `handle_new_user` function & trigger di SQL Editor
