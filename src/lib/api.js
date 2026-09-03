import { supabase } from "./supabase";

async function getUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("尚未登入");
  return data.user.id;
}

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

// exercises: [{ exerciseId, targetSets, targetReps }]，順序即為 position
export async function createRoutine({ name, tag, estMinutes, exercises }) {
  const userId = await getUserId();
  const { data: routine, error: routineErr } = await supabase
    .from("routines")
    .insert({ user_id: userId, name, tag, est_minutes: estMinutes })
    .select()
    .single();
  if (routineErr) throw routineErr;

  const rows = exercises.map((e, i) => ({
    routine_id: routine.id,
    exercise_id: e.exerciseId,
    position: i,
    target_sets: e.targetSets ?? 3,
    target_reps: e.targetReps ?? 8,
  }));
  const { error: exErr } = await supabase.from("routine_exercises").insert(rows);
  if (exErr) throw exErr;

  return routine;
}

// 編輯課表：更新基本資料，並整批替換動作清單(先刪除舊的，再插入新的)
export async function updateRoutine({ routineId, name, tag, estMinutes, exercises }) {
  const { error: updErr } = await supabase
    .from("routines")
    .update({ name, tag, est_minutes: estMinutes })
    .eq("id", routineId);
  if (updErr) throw updErr;

  const { error: delErr } = await supabase.from("routine_exercises").delete().eq("routine_id", routineId);
  if (delErr) throw delErr;

  const rows = exercises.map((e, i) => ({
    routine_id: routineId,
    exercise_id: e.exerciseId,
    position: i,
    target_sets: e.targetSets ?? 3,
    target_reps: e.targetReps ?? 8,
  }));
  const { error: insErr } = await supabase.from("routine_exercises").insert(rows);
  if (insErr) throw insErr;
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
      exercises: p.exerciseNames.filter((n) => byName[n]).map((n) => ({ exerciseId: byName[n], targetSets: 3, targetReps: 8 })),
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
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("exercises")
    .insert({ name, category, created_by: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// 只能編輯自己新增的自訂動作,系統預設動作會被 RLS 擋下來
export async function updateExercise(exerciseId, { name, category }) {
  const { data, error } = await supabase
    .from("exercises")
    .update({ name, category })
    .eq("id", exerciseId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// 若這個動作已經被課表或訓練紀錄使用(外鍵限制),刪除會失敗並丟出錯誤
export async function deleteExercise(exerciseId) {
  const { error } = await supabase.from("exercises").delete().eq("id", exerciseId);
  if (error) throw error;
}

/* =============================================================
 * 訓練場次(workouts / workout_sets)
 * 對應 App.jsx 裡的 ActiveWorkout 畫面
 * ============================================================= */

// 開始一場訓練：建立 workouts row，回傳 workoutId 供後續記錄組數使用
export async function startWorkout({ routineId, routineName }) {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("workouts")
    .insert({ user_id: userId, routine_id: routineId, routine_name: routineName })
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
// heartRate: 選用，來自 Web Bluetooth 心率裝置 { avg, max }
export async function finishWorkout({ workoutId, durationSeconds, heartRate }) {
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
      avg_heart_rate: heartRate?.avg ?? null,
      max_heart_rate: heartRate?.max ?? null,
    })
    .eq("id", workoutId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// 補填某一天的訓練紀錄(忘記即時記錄時使用)：一次性寫入 workouts + workout_sets，
// 不經過即時訓練流程,直接以「已完成」狀態建立。
// exercises: [{ exerciseId, exerciseName, sets: [{ weight, reps }] }]
// 空的組(重量與次數都是 0 或空白)會被忽略,不會寫入
export async function createBackfilledWorkout({ date, routineId, routineName, durationMinutes, exercises }) {
  const userId = await getUserId();
  const finishedAt = new Date(`${date}T12:00:00`).toISOString();
  const prMap = await getPersonalRecordsMap();

  let totalVolume = 0;
  let totalSets = 0;
  let prCount = 0;
  const setRows = [];

  exercises.forEach((ex) => {
    const best = prMap[ex.exerciseId]?.weight ?? 0;
    let setNumber = 0;
    ex.sets.forEach((s) => {
      const weight = Number(s.weight) || 0;
      const reps = Number(s.reps) || 0;
      if (weight <= 0 && reps <= 0) return;
      setNumber += 1;
      const isPr = weight > best;
      totalVolume += weight * reps;
      totalSets += 1;
      if (isPr) prCount += 1;
      setRows.push({
        exercise_id: ex.exerciseId,
        exercise_name: ex.exerciseName,
        set_number: setNumber,
        weight,
        reps,
        is_pr: isPr,
        completed_at: finishedAt,
      });
    });
  });

  const { data: workout, error: wErr } = await supabase
    .from("workouts")
    .insert({
      user_id: userId,
      routine_id: routineId || null,
      routine_name: routineName,
      started_at: finishedAt,
      finished_at: finishedAt,
      duration_seconds: (Number(durationMinutes) || 45) * 60,
      total_volume: totalVolume,
      total_sets: totalSets,
      pr_count: prCount,
    })
    .select()
    .single();
  if (wErr) throw wErr;

  if (setRows.length > 0) {
    const rows = setRows.map((r) => ({ ...r, workout_id: workout.id }));
    const { error: sErr } = await supabase.from("workout_sets").insert(rows);
    if (sErr) throw sErr;
  }

  return workout;
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

/* =============================================================
 * 體態紀錄(body_metrics)+ 照片
 * ============================================================= */

export async function listBodyMetrics(limit = 60) {
  const { data, error } = await supabase
    .from("body_metrics")
    .select("id, recorded_at, weight_kg, body_fat_pct, muscle_mass_kg, visceral_fat_level, photo_path, note")
    .order("recorded_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

// 同一天重複紀錄會覆蓋(upsert on user_id+recorded_at)
export async function upsertBodyMetric({ recordedAt, weightKg, bodyFatPct, muscleMassKg, visceralFatLevel, note, photoPath }) {
  const userId = await getUserId();
  const payload = {
    user_id: userId,
    recorded_at: recordedAt,
    weight_kg: weightKg ?? null,
    body_fat_pct: bodyFatPct ?? null,
    muscle_mass_kg: muscleMassKg ?? null,
    visceral_fat_level: visceralFatLevel ?? null,
    note: note || null,
  };
  if (photoPath) payload.photo_path = photoPath;
  const { data, error } = await supabase
    .from("body_metrics")
    .upsert(payload, { onConflict: "user_id,recorded_at" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// 上傳體態照片到私有 Storage bucket，回傳可存入 body_metrics.photo_path 的路徑
export async function uploadBodyPhoto(file, recordedAt) {
  const userId = await getUserId();
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/${recordedAt}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("body-photos").upload(path, file, { upsert: true });
  if (error) throw error;
  return path;
}

// bucket 是私有的，讀取照片要用短期簽章網址(預設 1 小時)
export async function getBodyPhotoUrl(path) {
  if (!path) return null;
  const { data, error } = await supabase.storage.from("body-photos").createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteBodyMetric(id) {
  const { error } = await supabase.from("body_metrics").delete().eq("id", id);
  if (error) throw error;
}

/* =============================================================
 * 營養追蹤(nutrition_logs)
 * ============================================================= */

export async function listNutritionLogs(date) {
  const { data, error } = await supabase
    .from("nutrition_logs")
    .select("id, logged_at, meal, calories, protein_g, carbs_g, fat_g, note, created_at")
    .eq("logged_at", date)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function addNutritionEntry({ loggedAt, meal, calories, proteinG, carbsG, fatG, note }) {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("nutrition_logs")
    .insert({
      user_id: userId,
      logged_at: loggedAt,
      meal,
      calories: calories || 0,
      protein_g: proteinG || 0,
      carbs_g: carbsG || 0,
      fat_g: fatG || 0,
      note: note || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteNutritionEntry(id) {
  const { error } = await supabase.from("nutrition_logs").delete().eq("id", id);
  if (error) throw error;
}

export async function updateNutritionEntry(id, { meal, calories, proteinG, carbsG, fatG, note }) {
  const { data, error } = await supabase
    .from("nutrition_logs")
    .update({
      meal,
      calories: calories || 0,
      protein_g: proteinG || 0,
      carbs_g: carbsG || 0,
      fat_g: fatG || 0,
      note: note || null,
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/* =============================================================
 * 工作表(workouts) - 額外功能
 * ============================================================= */

export async function listWorkoutsByDateRange(startDate, endDate) {
  const { data, error } = await supabase
    .from("workouts")
    .select("id, routine_name, started_at, finished_at, duration_seconds, total_volume, total_sets, pr_count, avg_heart_rate, max_heart_rate")
    .not("finished_at", "is", null)
    .gte("finished_at", startDate)
    .lte("finished_at", endDate)
    .order("finished_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getWorkoutById(workoutId) {
  const { data, error } = await supabase
    .from("workouts")
    .select("id, routine_name, started_at, finished_at, duration_seconds, total_volume, total_sets, pr_count, avg_heart_rate, max_heart_rate")
    .eq("id", workoutId)
    .single();
  if (error) throw error;
  return data;
}

export async function updateWorkout(workoutId, { routineName, durationSeconds, totalVolume, totalSets, prCount, avgHeartRate, maxHeartRate }) {
  const { data, error } = await supabase
    .from("workouts")
    .update({
      routine_name: routineName,
      duration_seconds: durationSeconds,
      total_volume: totalVolume,
      total_sets: totalSets,
      pr_count: prCount,
      avg_heart_rate: avgHeartRate,
      max_heart_rate: maxHeartRate,
    })
    .eq("id", workoutId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteWorkout(workoutId) {
  // First delete associated workout_sets due to foreign key constraint
  const { error: setsError } = await supabase
    .from("workout_sets")
    .delete()
    .eq("workout_id", workoutId);
  if (setsError) throw setsError;

  const { error } = await supabase.from("workouts").delete().eq("id", workoutId);
  if (error) throw error;
}

export async function getBodyMetricsByDate(date) {
  const { data, error } = await supabase
    .from("body_metrics")
    .select("id, recorded_at, weight_kg, body_fat_pct, muscle_mass_kg, visceral_fat_level, photo_path, note")
    .eq("recorded_at", date);
  if (error) throw error;
  return data;
}

export async function getBodyMetricsByDateRange(startDate, endDate) {
  const { data, error } = await supabase
    .from("body_metrics")
    .select("id, recorded_at, weight_kg, body_fat_pct, muscle_mass_kg, visceral_fat_level, photo_path, note")
    .gte("recorded_at", startDate)
    .lte("recorded_at", endDate)
    .order("recorded_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function getExerciseVolumeTrend(exerciseId, weeks = 4) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - weeks * 7);
  const startDateStr = startDate.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('workout_sets')
    .select('workout_sets.id, workouts!inner(finished_at), workout_sets.weight, workout_sets.reps')
    .eq('workout_sets.exercise_id', exerciseId)
    .gte('workouts!inner.finished_at', startDateStr);

  if (error) throw error;

  const weekMap = new Map();
  for (const row of data) {
    const workout = row.workouts?.inner;
    if (!workout || !workout.finished_at) continue;

    const date = new Date(workout.finished_at);
    if (isNaN(date.getTime())) continue;

    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
    const weekKey = weekStart.toISOString().split('T')[0];
    const volume = (row.workout_sets?.weight ?? 0) * (row.workout_sets?.reps ?? 0);
    const current = weekMap.get(weekKey) ?? 0;
    weekMap.set(weekKey, current + volume);
  }

  const result = Array.from(weekMap, ([week_start, volume]) => ({ week_start, volume }))
    .sort((a, b) => new Date(a.week_start) - new Date(b.week_start))
    .slice(-weeks);

  return result;
}
