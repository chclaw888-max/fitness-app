-- =============================================================
-- Migration: Phase 3 — 體態照片、營養追蹤、心率欄位
-- 在 Supabase Dashboard → SQL Editor 貼上執行
-- =============================================================

-- ---------- 體態：body_metrics 加上照片欄位 ----------
alter table public.body_metrics add column if not exists photo_path text;

-- body_metrics 原本用 (user_id, recorded_at) unique，改用 upsert 寫入時需要這個 index，
-- 若 schema.sql 已建立過則此語句會被忽略
create unique index if not exists body_metrics_user_date_unique on public.body_metrics (user_id, recorded_at);

-- ---------- Storage：體態照片私有儲存桶 ----------
insert into storage.buckets (id, name, public)
values ('body-photos', 'body-photos', false)
on conflict (id) do nothing;

-- 檔案路徑規則：{user_id}/{filename}，用資料夾第一層判斷擁有者
drop policy if exists "body_photos_select_own" on storage.objects;
create policy "body_photos_select_own" on storage.objects
  for select using (bucket_id = 'body-photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "body_photos_insert_own" on storage.objects;
create policy "body_photos_insert_own" on storage.objects
  for insert with check (bucket_id = 'body-photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "body_photos_delete_own" on storage.objects;
create policy "body_photos_delete_own" on storage.objects
  for delete using (bucket_id = 'body-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- 營養追蹤 ----------
create table if not exists public.nutrition_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  logged_at date not null default current_date,
  meal text not null,
  calories numeric not null default 0,
  protein_g numeric not null default 0,
  carbs_g numeric not null default 0,
  fat_g numeric not null default 0,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists nutrition_logs_user_date_idx on public.nutrition_logs (user_id, logged_at desc);

alter table public.nutrition_logs enable row level security;

drop policy if exists "nutrition_logs_all_own" on public.nutrition_logs;
create policy "nutrition_logs_all_own" on public.nutrition_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- 穿戴裝置：訓練場次加上心率欄位(來自 Web Bluetooth 心率感測器) ----------
alter table public.workouts add column if not exists avg_heart_rate int;
alter table public.workouts add column if not exists max_heart_rate int;
