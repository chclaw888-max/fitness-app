-- =============================================================
-- Migration: body_metrics 新增肌肉量、內臟脂肪等級欄位
-- 在 Supabase Dashboard → SQL Editor 貼上執行即可,重複執行也安全。
-- =============================================================

alter table public.body_metrics add column if not exists muscle_mass_kg numeric;
alter table public.body_metrics add column if not exists visceral_fat_level numeric;
