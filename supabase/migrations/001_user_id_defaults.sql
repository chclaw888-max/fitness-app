-- =============================================================
-- Migration: 修正 routines / workouts / body_metrics / exercises
-- 缺少 user_id 預設值的問題(導致 "new row violates row-level
-- security policy" 錯誤)
--
-- 如果你的 Supabase 專案已經執行過 schema.sql,只要額外執行這份
-- 檔案就好,不需要重跑整個 schema。
-- 在 Supabase Dashboard → SQL Editor 貼上執行即可。
-- =============================================================

alter table public.routines alter column user_id set default auth.uid();
alter table public.workouts alter column user_id set default auth.uid();
alter table public.body_metrics alter column user_id set default auth.uid();
alter table public.exercises alter column created_by set default auth.uid();
