-- =============================================================
-- Migration: 新增動作庫項目,支援 Phase 2 課表範本所需的動作組合
-- 已執行過舊版 seed.sql 的專案,額外執行這份即可,重複執行也安全。
-- =============================================================

insert into public.exercises (name, category, created_by) values
  ('啞鈴臥推', '胸', null),
  ('啞鈴側平舉', '肩', null),
  ('槓鈴彎舉', '手臂', null),
  ('T bar 划船', '背', null),
  ('腿彎舉', '腿', null),
  ('捲腹', '核心', null),
  ('抬腿', '核心', null)
on conflict do nothing;
