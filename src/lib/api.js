import { supabase } from "./supabase";

/* =============================================================
 * Auth
 * ============================================================= */

export async function signUp({ email, password, displayName }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });
  if (error) throw error;
  return data;
}

export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

// 用法：const unsubscribe = onAuthStateChange((session) => { ... });
export function onAuthStateChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return () => data.subscription.unsubscribe();
}

export async function getProfile() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const { data: profile, error: profErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", data.user.id)
    .single();
  if (profErr) throw profErr;
  return profile;
}

/* =============================================================
 * 課表(routines)
 * ============================================================= */

// 對應「訓練」頁的課表列表，會一併帶出每份課表裡的動作
export async function listRoutines() {
  const { data, error } = await supabase
    .from("routines")
    .select(
      `id, name, tag, est_minutes, position,
       routine_exercises (
         id, position, target_sets, target_reps,
         exercise:exercises ( id, name, category )
       )`
    )
    .order("position", { ascending: true })
    .order("position", { referencedTable: "routine_exercises", ascending: true });
  if (error) throw error;
  return data;
}

export async function createRoutine({ name, tag, estMinutes, exerciseIds }) {
  const { data: routine, error: routineErr } = await supabase
    .from("routines")
    .insert({ name, tag, est_minutes: estMinutes })
    .select()
    .single();
  if (routineErr) throw routineErr;

  const rows = exerciseIds.map((exerciseId, i) => ({
    routine_id: routine.id,
    exercise_id: exerciseId,
    position: i,
  }));
  const { error: exErr } = await supabase.from("routine_exercises").insert(rows);
  if (exErr) throw exErr;

  return routine;
}

export async function deleteRoutine(routineId) {
  const { error } = await supabase.from("routines").delete().eq("id", routineId);
  if (error) throw error;
}

// 新使用者第一次登入時，幫他建立跟 Demo 一樣的三份預設課表。
// 呼叫前需要先執行 supabase/seed.sql 匯入系統預設動作。
export async function seedDefaultRoutines() {
  const { data: exercises, error } = await supabase
    .from("exercises")
    .select("id, name")
    .is("created_by", null);
  if (error) throw error;
  const byName = Object.fromEntries(exercises.map((e) => [e.name, e.id]));

  const presets = [
    { name: "推力訓練日", tag: "胸 / 肩 / 三頭肌", estMinutes: 45, exerciseNames: ["槓鈴臥推", "肩推", "上斜啞鈴推舉", "三頭下拉"] },
    { name: "拉力訓練日", tag: "背 / 二頭肌", estMinutes: 50, exerciseNames: ["硬舉", "槓鈴划船", "滑輪下拉", "二頭彎舉"] },
    { name: "腿部訓練日", tag: "股四頭肌 / 後側鏈", estMinutes: 55, exerciseNames: ["深蹲", "腿推", "羅馬尼亞硬舉", "提踵"] },
  ];

  for (const p of presets) {
    await createRoutine({
      name: p.name,
      tag: p.tag,
      estMinutes: p.estMinutes,
      exerciseIds: p.exerciseNames.map((n) => byName[n]).filter(Boolean),
    });
  }
}

/* =============================================================
 * 動作庫(exercises)
 * ============================================================= */

// 回傳系統預設動作 + 這個使用者自己新增的自訂動作
export async function listExercises() {
  const { data, error } = await supabase.from("exercises").select("*").order("category");
  if (error) throw error;
  return data;
}

export async function createCustomExercise({ name, category }) {
  const { data, error } = await supabase.from("exercises").insert({ name, category }).select().single();
  if (error) throw error;
  return data;
}

/* =============================================================
 * 訓練場次(workouts / workout_sets)
 * 對應 App.jsx 裡的 ActiveWorkout 畫面
 * ============================================================= */

// 開始一場訓練：建立 workouts row，回傳 workoutId 供後續記錄組數使用
export async function startWorkout({ routineId, routineName }) {
  const { data, error } = await supabase
    .from("workouts")
    .insert({ routine_id: routineId, routine_name: routineName })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// 記錄或更新一組(以 workoutId + exerciseId + setNumber 當作邏輯上的唯一鍵)
export async function upsertSet({ workoutId, exerciseId, exerciseName, setNumber, weight, reps, done, isPr }) {
  const { data: existing } = await supabase
    .from("workout_sets")
    .select("id")
    .eq("workout_id", workoutId)
    .eq("exercise_id", exerciseId)
    .eq("set_number", setNumber)
    .maybeSingle();

  const payload = {
    workout_id: workoutId,
    exercise_id: exerciseId,
    exercise_name: exerciseName,
    set_number: setNumber,
    weight,
    reps,
    is_pr: isPr,
    completed_at: done ? new Date().toISOString() : null,
  };

  const { error } = existing
    ? await supabase.from("workout_sets").update(payload).eq("id", existing.id)
    : await supabase.from("workout_sets").insert(payload);
  if (error) throw error;
}

// 完成訓練：結算總量/總組數/PR 數，寫回 workouts row
export async function finishWorkout({ workoutId, durationSeconds }) {
  const { data: sets, error: setsErr } = await supabase
    .from("workout_sets")
    .select("weight, reps, is_pr")
    .eq("workout_id", workoutId)
    .not("completed_at", "is", null);
  if (setsErr) throw setsErr;

  const totalVolume = sets.reduce((sum, s) => sum + Number(s.weight) * Number(s.reps), 0);
  const prCount = sets.filter((s) => s.is_pr).length;

  const { data, error } = await supabase
    .from("workouts")
    .update({
      finished_at: new Date().toISOString(),
      duration_seconds: durationSeconds,
      total_volume: totalVolume,
      total_sets: sets.length,
      pr_count: prCount,
    })
    .eq("id", workoutId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// 對應首頁「最近訓練」列表
export async function listRecentWorkouts(limit = 5) {
  const { data, error } = await supabase
    .from("workouts")
    .select("id, routine_name, started_at, finished_at, duration_seconds, total_volume")
    .not("finished_at", "is", null)
    .order("finished_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

// 對應首頁的「本週訓練量 / 本週次數」卡片
export async function getThisWeekStats() {
  const monday = new Date();
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7)); // 本週一

  const { data, error } = await supabase
    .from("workouts")
    .select("total_volume")
    .not("finished_at", "is", null)
    .gte("finished_at", monday.toISOString());
  if (error) throw error;

  return {
    weekVolume: data.reduce((sum, w) => sum + Number(w.total_volume), 0),
    weekWorkouts: data.length,
  };
}

// 連續訓練天數：抓最近 60 筆訓練日期，往回數不中斷的天數
export async function getStreak() {
  const { data, error } = await supabase
    .from("workouts")
    .select("finished_at")
    .not("finished_at", "is", null)
    .order("finished_at", { ascending: false })
    .limit(60);
  if (error) throw error;

  const days = [...new Set(data.map((w) => w.finished_at.slice(0, 10)))].sort().reverse();
  if (days.length === 0) return 0;

  let streak = 0;
  const cursor = new Date();
  for (const day of days) {
    const cursorStr = cursor.toISOString().slice(0, 10);
    if (day === cursorStr) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

// 對應「我的」頁的總訓練次數 / 累積訓練量
export async function getAllTimeStats() {
  const { data, error } = await supabase.from("workouts").select("total_volume").not("finished_at", "is", null);
  if (error) throw error;
  return {
    totalWorkouts: data.length,
    totalVolume: data.reduce((sum, w) => sum + Number(w.total_volume), 0),
  };
}

/* =============================================================
 * 進度頁(progress)
 * ============================================================= */

// 近 N 週的訓練量趨勢（讀取 schema.sql 建立的 v_weekly_volume 視圖）
export async function getVolumeTrend(weeks = 7) {
  const { data, error } = await supabase
    .from("v_weekly_volume")
    .select("week_start, volume")
    .order("week_start", { ascending: false })
    .limit(weeks);
  if (error) throw error;
  return data.reverse();
}

// 個人紀錄列表（讀取 v_personal_records 視圖，每個動作抓歷史最大重量）
export async function getPersonalRecords(limit = 10) {
  const { data, error } = await supabase
    .from("v_personal_records")
    .select("exercise_name, weight, reps, completed_at")
    .order("completed_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

// 以 exercise_id 為 key 的個人紀錄對照表，開始訓練時用來預填「上次重量」與判斷 PR
export async function getPersonalRecordsMap() {
  const { data, error } = await supabase.from("v_personal_records").select("exercise_id, weight, reps");
  if (error) throw error;
  return Object.fromEntries(data.map((r) => [r.exercise_id, { weight: Number(r.weight), reps: r.reps }]));
}
