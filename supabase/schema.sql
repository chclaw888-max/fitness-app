-- =============================================================
-- 健身記錄 · Supabase Schema
-- 在 Supabase Dashboard → SQL Editor 貼上執行,或用 supabase CLI:
--   supabase db push
-- =============================================================

-- pgcrypto 提供 gen_random_uuid(),Supabase 專案預設已啟用
create extension if not exists pgcrypto;

-- =============================================================
-- 1. profiles — 使用者個人資料(延伸 auth.users,不可直接改 auth schema)
-- =============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '訓練者',
  unit text not null default 'kg' check (unit in ('kg', 'lb')),
  created_at timestamptz not null default now()
);

-- 新使用者註冊時自動建立 profile
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', '訓練者'));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =============================================================
-- 2. exercises — 動作庫(系統預設 + 使用者自訂)
--    created_by = null → 系統預設動作,所有人可讀、只有後台可寫
--    created_by = 使用者 id → 該使用者的自訂動作
-- =============================================================
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default '其他' check (
    category in ('胸', '背', '腿', '肩', '手臂', '核心', '有氧', '其他')
  ),
  created_by uuid default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- 系統預設動作名稱不可重複;使用者自訂動作在自己的清單裡名稱不可重複
create unique index exercises_system_name_unique
  on public.exercises (name) where created_by is null;
create unique index exercises_user_name_unique
  on public.exercises (created_by, name) where created_by is not null;

-- =============================================================
-- 3. routines — 課表
-- =============================================================
create table public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  tag text,
  est_minutes int,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index routines_user_id_idx on public.routines (user_id, position);

create function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger routines_set_updated_at
  before update on public.routines
  for each row execute procedure public.set_updated_at();

-- =============================================================
-- 4. routine_exercises — 課表內的動作清單(含順序、預設組數/次數)
-- =============================================================
create table public.routine_exercises (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  position int not null default 0,
  target_sets int not null default 3,
  target_reps int not null default 8,
  created_at timestamptz not null default now()
);

create index routine_exercises_routine_id_idx on public.routine_exercises (routine_id, position);

-- =============================================================
-- 5. workouts — 一次訓練場次
--    routine_name / exercise_name 用「快照」保存,避免課表被之後編輯或刪除時
--    連帶影響歷史紀錄的顯示內容
-- =============================================================
create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  routine_id uuid references public.routines(id) on delete set null,
  routine_name text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  duration_seconds int,
  total_volume numeric not null default 0,
  total_sets int not null default 0,
  pr_count int not null default 0,
  avg_heart_rate int,
  max_heart_rate int,
  created_at timestamptz not null default now()
);

create index workouts_user_started_idx on public.workouts (user_id, started_at desc);

-- =============================================================
-- 6. workout_sets — 每一組的實際紀錄
-- =============================================================
create table public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  exercise_name text not null,
  set_number int not null,
  weight numeric not null default 0,
  reps int not null default 0,
  is_pr boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index workout_sets_workout_id_idx on public.workout_sets (workout_id);
create index workout_sets_exercise_completed_idx on public.workout_sets (exercise_id, completed_at desc);

-- =============================================================
-- 7. body_metrics — 體重 / 體態紀錄(選用,對應「進度」頁未來擴充)
-- =============================================================
create table public.body_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  recorded_at date not null default current_date,
  weight_kg numeric,
  body_fat_pct numeric,
  muscle_mass_kg numeric,
  visceral_fat_level numeric,
  muscle_mass_kg numeric,
  visceral_fat numeric,
  photo_path text,
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, recorded_at)
);

-- =============================================================
-- 7b. nutrition_logs — 飲食紀錄
-- =============================================================
create table public.nutrition_logs (
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

create index nutrition_logs_user_date_idx on public.nutrition_logs (user_id, logged_at desc);

-- =============================================================
-- 7c. Storage — 體態照片私有儲存桶
-- =============================================================
insert into storage.buckets (id, name, public)
values ('body-photos', 'body-photos', false)
on conflict (id) do nothing;

-- 檔案路徑規則：{user_id}/{filename}，用資料夾第一層判斷擁有者
create policy "body_photos_select_own" on storage.objects
  for select using (bucket_id = 'body-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "body_photos_insert_own" on storage.objects
  for insert with check (bucket_id = 'body-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "body_photos_delete_own" on storage.objects
  for delete using (bucket_id = 'body-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- =============================================================
-- 輔助視圖:個人紀錄 / 每週訓練量
-- =============================================================
create view public.v_personal_records as
select distinct on (ws.exercise_id, w.user_id)
  w.user_id,
  ws.exercise_id,
  ws.exercise_name,
  ws.weight,
  ws.reps,
  ws.completed_at
from public.workout_sets ws
join public.workouts w on w.id = ws.workout_id
where ws.completed_at is not null
order by ws.exercise_id, w.user_id, ws.weight desc, ws.completed_at asc;

create view public.v_weekly_volume as
select
  user_id,
  date_trunc('week', finished_at) as week_start,
  sum(total_volume) as volume,
  count(*) as workout_count
from public.workouts
where finished_at is not null
group by user_id, date_trunc('week', finished_at);

-- =============================================================
-- Row Level Security — 每個使用者只能存取自己的資料
-- =============================================================
alter table public.profiles enable row level security;
alter table public.exercises enable row level security;
alter table public.routines enable row level security;
alter table public.routine_exercises enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_sets enable row level security;
alter table public.body_metrics enable row level security;
alter table public.nutrition_logs enable row level security;

-- profiles：只能看/改自己的
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- exercises：系統動作(created_by is null)所有登入者可讀;
-- 自訂動作只有本人可讀/寫
create policy "exercises_select" on public.exercises
  for select using (created_by is null or created_by = auth.uid());
create policy "exercises_insert_own" on public.exercises
  for insert with check (created_by = auth.uid());
create policy "exercises_update_own" on public.exercises
  for update using (created_by = auth.uid());
create policy "exercises_delete_own" on public.exercises
  for delete using (created_by = auth.uid());

-- routines：僅本人可存取
create policy "routines_all_own" on public.routines
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- routine_exercises：透過所屬 routine 判斷擁有者
create policy "routine_exercises_all_own" on public.routine_exercises
  for all using (
    exists (select 1 from public.routines r where r.id = routine_id and r.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.routines r where r.id = routine_id and r.user_id = auth.uid())
  );

-- workouts：僅本人可存取
create policy "workouts_all_own" on public.workouts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- workout_sets：透過所屬 workout 判斷擁有者
create policy "workout_sets_all_own" on public.workout_sets
  for all using (
    exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = auth.uid())
  );

-- body_metrics：僅本人可存取
create policy "body_metrics_all_own" on public.body_metrics
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- nutrition_logs：僅本人可存取
create policy "nutrition_logs_all_own" on public.nutrition_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
