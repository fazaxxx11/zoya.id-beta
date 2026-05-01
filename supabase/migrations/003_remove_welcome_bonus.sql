-- Migration: hapus welcome bonus 5000 dari trigger handle_new_user
-- Sekaligus bersihkan welcome bonus existing dari user yang sudah daftar.
--
-- Run-once via Supabase SQL Editor.

-- 1) Update trigger function: tidak ada welcome bonus untuk user baru
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );

  -- Wallet kosong; tidak ada welcome bonus.
  insert into public.wallets (user_id, balance, bonus)
  values (new.id, 0, 0);

  return new;
end;
$$;

-- 2) Cleanup welcome bonus existing
-- (a) kurangi field bonus pada wallets sebesar total welcome yang pernah diberikan
update public.wallets w
set bonus = greatest(0, w.bonus - coalesce(t.total_welcome, 0)),
    updated_at = now()
from (
  select user_id, sum(bonus) as total_welcome
  from public.wallet_transactions
  where type = 'welcome'
  group by user_id
) t
where w.user_id = t.user_id;

-- (b) hapus baris welcome dari ledger
delete from public.wallet_transactions
where type = 'welcome';

-- 3) Verifikasi: harusnya 0 baris dan tidak ada user dengan bonus residual dari welcome
-- select count(*) as welcome_remaining from public.wallet_transactions where type = 'welcome';
-- select user_id, balance, bonus from public.wallets where bonus > 0;
