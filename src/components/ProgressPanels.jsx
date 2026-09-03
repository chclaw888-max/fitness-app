import { useState, useEffect, useCallback } from "react";
import { Trophy, Plus, X, Camera, Loader2, Share2, Trash2, Image as ImageIcon, Utensils, Edit } from "lucide-react";
import { COLORS, display, body } from "../theme";
import { shareCard } from "../lib/share";
import {
  getBodyPhotoUrl, uploadBodyPhoto,
  listWorkoutsByDateRange, getWorkoutById, updateWorkout, deleteWorkout,
  getBodyMetricsByDate,
  getBodyMetricsByDateRange,
  getExerciseVolumeTrend,
  listExercises,
  updateNutritionEntry
} from "../lib/api";

const inputStyle = {
  background: COLORS.surfaceElevated,
  color: COLORS.text,
  border: `1px solid ${COLORS.borderSoft}`,
  ...body,
};

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

/* ----------------------------- 折線圖(共用) ----------------------------- */

function LineChart({ points: rawPoints, color = COLORS.accent }) {
  const w = 280, h = 110, pad = 10;
  const values = rawPoints.map((d) => d.value);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const step = rawPoints.length > 1 ? (w - pad * 2) / (rawPoints.length - 1) : 0;
  const points = rawPoints.map((d, i) => ({
    x: pad + i * step,
    y: h - pad - ((d.value - min) / range) * (h - pad * 2),
  }));
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaD = points.length ? `${pathD} L${points[points.length - 1].x},${h} L${points[0].x},${h} Z` : "";
  const gradId = `fill-${color.replace("#", "")}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {points.length > 0 && <path d={areaD} fill={`url(#${gradId})`} />}
      <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={i === points.length - 1 ? 4 : 2.5} fill={i === points.length - 1 ? COLORS.lime : color}>
          <title>
            {p.label ? `${p.label}: ` : ''}${p.formatted ?? p.value}
          </title>
        </circle>
      ))}
    </svg>
  );
}

/* ----------------------------- 分頁切換 ----------------------------- */

function SegmentedControl({ value, onChange, options }) {
  return (
    <div className="flex rounded-xl p-1 mb-5" style={{ background: COLORS.surface, border: `1px solid ${COLORS.borderSoft}` }}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className="flex-1 rounded-lg py-2 text-sm"
          style={{
            background: value === opt.value ? COLORS.accent : "transparent",
            color: value === opt.value ? "#fff" : COLORS.textDim,
            ...body,
            fontWeight: 600,
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/* ----------------------------- 訓練趨勢 / PR ----------------------------- */

function TrainingPanel({ volumeTrend, personalRecords, weekVolume, streak, weekWorkouts }) {
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [workouts, setWorkouts] = useState([]);
  const [sharing, setSharing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [workoutForm, setWorkoutForm] = useState(false);
  const [formData, setFormData] = useState({
    routineName: "",
    durationSeconds: 0,
    totalVolume: 0,
    totalSets: 0,
    prCount: 0,
    avgHeartRate: null,
    maxHeartRate: null
  });
  const [formLoading, setFormLoading] = useState(false);

  // New state for exercise trend
  const [exercises, setExercises] = useState([]);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [exerciseTrend, setExerciseTrend] = useState([]);
  const [exerciseTrendLoading, setExerciseTrendLoading] = useState(false);
  const [exerciseTrendError, setExerciseTrendError] = useState(null);

  const loadWorkoutsByDate = async () => {
    if (!dateRange.start || !dateRange.end) return;
    setLoading(true);
    try {
      const data = await listWorkoutsByDateRange(dateRange.start, dateRange.end);
      setWorkouts(data);
    } catch (e) {
      console.error("Failed to load workouts:", e);
    } finally {
      setLoading(false);
    }
  };

  // Fetch exercises on mount
  useEffect(() => {
    const fetchExercises = async () => {
      try {
        const data = await listExercises();
        setExercises(data);
      } catch (e) {
        console.error("Failed to load exercises:", e);
      }
    };
    fetchExercises();
  }, []);


  // Fetch exercise trend when selected exercise changes
  useEffect(() => {
    const fetchExerciseTrend = async () => {
      if (!selectedExercise) {
        setExerciseTrend([]);
        setExerciseTrendError(null);
        return;
      }
      setExerciseTrendLoading(true);
      setExerciseTrendError(null);
      try {
        const data = await getExerciseVolumeTrend(selectedExercise.id, 4); // last 4 weeks
        setExerciseTrend(data);
      } catch (e) {
        console.error("Failed to load exercise trend:", e);
        setExerciseTrendError(e.message || "載入失敗");
        setExerciseTrend([]);
      } finally {
        setExerciseTrendLoading(false);
      }
    };
    fetchExerciseTrend();
  }, [selectedExercise]);

  const handleDateChange = (range) => {
    setDateRange(range);
    if (range.start && range.end) {
      loadWorkoutsByDate();
    } else {
      setWorkouts([]);
    }
  };

  const handleSelectWorkout = async (workoutId) => {
    try {
      const workout = await getWorkoutById(workoutId);
      setSelectedWorkout(workout);
      setFormData({
        routineName: workout.routine_name || "",
        durationSeconds: workout.duration_seconds || 0,
        totalVolume: Number(workout.total_volume) || 0,
        totalSets: workout.total_sets || 0,
        prCount: workout.pr_count || 0,
        avgHeartRate: workout.avg_heart_rate,
        maxHeartRate: workout.max_heart_rate
      });
      setWorkoutForm(true);
    } catch (e) {
      console.error("Failed to load workout:", e);
    }
  };

  const handleUpdateWorkout = async () => {
    if (!selectedWorkout) return;
    setFormLoading(true);
    try {
      await updateWorkout(selectedWorkout.id, formData);
      await loadWorkoutsByDate(); // Refresh list
      setWorkoutForm(false);
    } catch (e) {
      console.error("Failed to update workout:", e);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteWorkout = async (workoutId) => {
    if (!window.confirm("確定要刪除這筆訓練紀錄嗎？此操作無法復原。")) return;
    try {
      await deleteWorkout(workoutId);
      await loadWorkoutsByDate(); // Refresh list
    } catch (e) {
      console.error("Failed to delete workout:", e);
    }
  };

  const handleCreateWorkout = async () => {
    setWorkoutForm(true);
    setSelectedWorkout(null);
    setFormData({
      routineName: "",
      durationSeconds: 0,
      totalVolume: 0,
      totalSets: 0,
      prCount: 0,
      avgHeartRate: null,
      maxHeartRate: null
    });
  };

  const handleSaveWorkout = async () => {
    if (selectedWorkout) {
      await handleUpdateWorkout();
    } else {
      // For creating new workout, we'd need to use createBackfilledWorkout
      // This requires more parameters (routineId, exercises, etc.)
      // For simplicity, we'll focus on update/delete for now
      alert("新增訓練功能請使用「訓練」頁面的補填訓練功能");
      setWorkoutForm(false);
    }
  };

  const formatDateInput = (dateStr) => {
    if (!dateStr) return "";
    return dateStr; // Already in YYYY-MM-DD format from API
  };

  return (
    <div>
      {/* Date Range Picker */}
      <div className="mb-4">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="text-xs mb-1 block" style={{ ...body, color: COLORS.textDim }}>開始日期</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => {
                const start = e.target.value;
                setDateRange(prev => ({ ...prev, start }));
                if (start && dateRange.end) {
                  loadWorkoutsByDate();
                }
              }}
              className="w-full rounded-xl px-3 py-2 text-sm"
              style={inputStyle}
            />
          </div>
          <div className="flex-1">
            <label className="text-xs mb-1 block" style={{ ...body, color: COLORS.textDim }}>結束日期</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => {
                const end = e.target.value;
                setDateRange(prev => ({ ...prev, end }));
                if (dateRange.start && end) {
                  loadWorkoutsByDate();
                }
              }}
              className="w-full rounded-xl px-3 py-2 text-sm"
              style={inputStyle}
            />
          </div>
          <button
            onClick={() => {
              // Quick presets
              const end = new Date().toISOString().split('T')[0];
              const start = new Date();
              start.setDate(start.getDate() - 30); // Last 30 days
              const startStr = start.toISOString().split('T')[0];
              setDateRange({ start: startStr, end: end });
              loadWorkoutsByDate();
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
            style={{ background: COLORS.accentSoft, color: COLORS.accent, ...body, fontWeight: 600 }}
          >
            最近30天
          </button>
        </div>
      </div>

      {/* Exercise Selector */}
      {!loading && exercises.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-xs mb-1 block" style={{ ...body, color: COLORS.textDim }}>選擇動作</label>
              <select
                value={selectedExercise ? selectedExercise.id : ""}
                onChange={(e) => {
                  const id = e.target.value;
                  const exercise = exercises.find(ex => ex.id === id);
                  setSelectedExercise(exercise || null);
                }}
                className="w-full rounded-xl px-3 py-2 text-sm"
                style={inputStyle}
              >
                <option value="">請選擇動作</option>
                {exercises.map(ex => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name} ({ex.category})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}


      {/* Stats Cards */}
      {!loading && (
        <div className="flex gap-3 mb-5">
          <div className="flex-1 rounded-2xl p-4" style={{ background: COLORS.surface, border: `1px solid ${COLORS.borderSoft}` }}>
            <div className="text-xs" style={{ ...body, color: COLORS.textDim }}>連續訓練天數</div>
            <div className="text-2xl" style={{ ...display, color: COLORS.text, fontWeight: 700 }}>{streak} 天</div>
          </div>
          <div className="flex-1 rounded-2xl p-4" style={{ background: COLORS.surface, border: `1px solid ${COLORS.borderSoft}` }}>
            <div className="text-xs" style={{ ...body, color: COLORS.textDim }}>本週訓練量</div>
            <div className="text-2xl" style={{ ...display, color: COLORS.text, fontWeight: 700 }}>{Math.round(weekVolume).toLocaleString()} kg</div>
          </div>
          <div className="flex-1 rounded-2xl p-4" style={{ background: COLORS.surface, border: `1px solid ${COLORS.borderSoft}` }}>
            <div className="text-xs" style={{ ...body, color: COLORS.textDim }}>本週次數</div>
            <div className="text-2xl" style={{ ...display, color: COLORS.text, fontWeight: 700 }}>{weekWorkouts} / 5</div>
          </div>
        </div>
      )}

      {/* Volume Trend Chart */}
      {!loading && volumeTrend.length > 0 && (
        <div className="rounded-2xl p-4 mb-4" style={{ background: COLORS.surface, border: `1px solid ${COLORS.borderSoft}` }}>
          <div className="text-xs mb-2" style={{ ...body, color: COLORS.textDim }}>訓練量趨勢 (近 7 週)</div>
          <LineChart points={volumeTrend.map((d) => ({ value: Number(d.volume), label: `${new Date(d.week_start).getMonth()+1}/${new Date(d.week_start).getDate()}`, formatted: `${Number(d.volume)}` }))} />
          <div className="flex justify-between mt-1">
            {volumeTrend.map((d, i) => (
              <span key={i} className="text-xs" style={{ ...body, color: COLORS.textFaint }}>
                {new Date(d.week_start).getMonth() + 1}/{new Date(d.week_start).getDate()}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Exercise Trend Chart */}
      {!loading && selectedExercise && (
        <div className="mb-4">
          {exerciseTrendLoading && (
            <div className="text-sm text-center py-6" style={{ ...body, color: COLORS.textFaint }}>載入中...</div>
          )}
          {!exerciseTrendLoading && exerciseTrendError && (
            <div className="text-sm text-center py-6" style={{ ...body, color: COLORS.danger }}>
              載入失敗: {exerciseTrendError}
            </div>
          )}
          {!exerciseTrendLoading && !exerciseTrendError && exerciseTrend.length > 0 && (
            <>
              <div className="rounded-2xl p-4 mb-4" style={{ background: COLORS.surface, border: `1px solid ${COLORS.borderSoft}` }}>
                <div className="text-xs mb-2" style={{ ...body, color: COLORS.textDim }}>
                  {selectedExercise.name} 訓練量趨勢 (近 4 週)
                </div>
                <LineChart points={exerciseTrend.map((d) => ({ value: Number(d.volume), label: `${new Date(d.week_start).getMonth()+1}/${new Date(d.week_start).getDate()}`, formatted: `${Number(d.volume)}` }))} />
                <div className="flex justify-between mt-1">
                  {exerciseTrend.map((d, i) => (
                    <span key={i} className="text-xs" style={{ ...body, color: COLORS.textFaint }}>
                      {new Date(d.week_start).getMonth() + 1}/{new Date(d.week_start).getDate()}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}
          {!exerciseTrendLoading && !exerciseTrendError && exerciseTrend.length === 0 && (
            <div className="text-sm text-center py-6" style={{ ...body, color: COLORS.textFaint }}>
              該動作在此期間內沒有訓練紀錄
            </div>
          )}
        </div>
      )}


      {/* Personal Records */}
      {!loading && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm" style={{ ...body, color: COLORS.textDim, fontWeight: 600 }}>個人紀錄 (前 10 名)</div>
            <button
              onClick={() => setDateRange({ start: "", end: "" })}
              className="text-xs px-3 py-1 rounded-lg"
              style={{ background: COLORS.surfaceElevated, color: COLORS.text, ...body }}
            >
              重設
            </button>
          </div>
          {personalRecords.length === 0 ? (
            <div className="text-sm text-center py-6" style={{ ...body, color: COLORS.textFaint }}>還沒有個人紀錄</div>
          ) : (
            <div className="flex flex-col gap-3">
              {personalRecords.map((p, i) => (
                <div key={i} className="rounded-2xl p-4 flex items-center justify-between" style={{ background: COLORS.surface, border: `1px solid ${COLORS.borderSoft}` }}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: COLORS.limeSoft }}>
                      <Trophy size={16} color={COLORS.lime} />
                    </div>
                    <div>
                      <div style={{ ...body, color: COLORS.text, fontWeight: 600 }}>{p.exercise_name}</div>
                      <div className="text-xs" style={{ ...body, color: COLORS.textFaint }}>{fmtDate(p.completed_at)}</div>
                    </div>
                  </div>
                  <div style={{ ...display, color: COLORS.text, fontWeight: 700 }}>{p.weight} kg</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Workouts List */}
      {!loading && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm" style={{ ...body, color: COLORS.textDim, fontWeight: 600 }}>訓練紀錄</div>
              {dateRange.start && dateRange.end && (
                <div className="text-xs" style={{ ...body, color: COLORS.textFaint }}>
                  {new Date(dateRange.start).getMonth() + 1}/{new Date(dateRange.start).getDate()} ～
                  {new Date(dateRange.end).getMonth() + 1}/{new Date(dateRange.end).getDate()}
                </div>
              )}
            </div>
            <button
              onClick={handleCreateWorkout}
              disabled={loading}
              className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg"
              style={{ background: COLORS.accentSoft, color: COLORS.accent, ...body, fontWeight: 600 }}
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              新增紀錄
            </button>
          </div>
          {workouts.length === 0 ? (
            <div className="text-sm text-center py-6" style={{ ...body, color: COLORS.textFaint }}>
              {dateRange.start && dateRange.end ?
                "此期間內沒有訓練紀錄" :
                "選擇日期範圍以查看訓練紀錄"}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {workouts.map((w) => (
                <div key={w.id} className="rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-[COLORS.surfaceElevated]/50" onClick={() => handleSelectWorkout(w.id)}>
                  <div className="flex-1">
                    <div style={{ ...body, color: COLORS.text, fontWeight: 600 }}>{w.routine_name || "未命名課表"}</div>
                    <div className="text-xs mt-1 flex items-center gap-2" style={{ ...body, color: COLORS.textFaint }}>
                      <span>{fmtDate(w.finished_at)}</span>
                      <span>·</span>
                      <span>{Math.round(w.duration_seconds / 60)} 分鐘</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div style={{ ...display, color: COLORS.text, fontWeight: 700 }}>{Math.round(w.total_volume).toLocaleString()}</div>
                    <div className="text-xs" style={{ ...body, color: COLORS.textFaint }}>kg 總量</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Workout Form (Edit/Create) */}
      {workoutForm && (
        <div className="rounded-2xl p-4" style={{ background: COLORS.surface, border: `1px solid ${COLORS.borderSoft}` }}>
          <div className="flex items-center justify-between mb-3">
            <div className="text-xl" style={{ ...display, color: COLORS.text, fontWeight: 700 }}>
              {selectedWorkout ? "編輯訓練" : "新增訓練"}
            </div>
            <button
              onClick={() => setWorkoutForm(false)}
              className="text-xs"
              style={{ color: COLORS.textDim }}
            >
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-xs mb-1 block" style={{ ...body, color: COLORS.textDim }}>課表名稱</label>
              <input
                value={formData.routineName}
                onChange={(e) => setFormData(prev => ({ ...prev, routineName: e.target.value }))}
                placeholder="例如：推力訓練日"
                className="w-full rounded-xl px-3 py-2.5 text-sm"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ ...body, color: COLORS.textDim }}>訓練時長 (秒)</label>
              <input
                type="number"
                value={formData.durationSeconds}
                onChange={(e) => setFormData(prev => ({ ...prev, durationSeconds: Number(e.target.value) || 0 }))}
                placeholder="1800"
                className="w-full rounded-xl px-3 py-2.5 text-sm"
                style={inputStyle}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-xs mb-1 block" style={{ ...body, color: COLORS.textDim }}>總訓練量 (kg)</label>
              <input
                type="number"
                value={formData.totalVolume}
                onChange={(e) => setFormData(prev => ({ ...prev, totalVolume: Number(e.target.value) || 0 }))}
                placeholder="5000"
                className="w-full rounded-xl px-3 py-2.5 text-sm"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ ...body, color: COLORS.textDim }}>總組數</label>
              <input
                type="number"
                value={formData.totalSets}
                onChange={(e) => setFormData(prev => ({ ...prev, totalSets: Number(e.target.value) || 0 }))}
                placeholder="25"
                className="w-full rounded-xl px-3 py-2.5 text-sm"
                style={inputStyle}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-xs mb-1 block" style={{ ...body, color: COLORS.textDim }}>PR 次數</label>
              <input
                type="number"
                value={formData.prCount}
                onChange={(e) => setFormData(prev => ({ ...prev, prCount: Number(e.target.value) || 0 }))}
                placeholder="5"
                className="w-full rounded-xl px-3 py-2.5 text-sm"
                style={inputStyle}
              />
            </div>
            <div className="flex-1">
              <label className="text-xs mb-1 block" style={{ ...body, color: COLORS.textDim }}>平均心率 (bpm)</label>
              <input
                type="number"
                value={formData.avgHeartRate || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData(prev => ({ ...prev, avgHeartRate: val === "" ? null : Number(val) }));
                }}
                placeholder="120"
                className="w-full rounded-xl px-3 py-2.5 text-sm"
                style={inputStyle}
              />
            </div>
            <div className="flex-1">
              <label className="text-xs mb-1 block" style={{ ...body, color: COLORS.textDim }}>最高心率 (bpm)</label>
              <input
                type="number"
                value={formData.maxHeartRate || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData(prev => ({ ...prev, maxHeartRate: val === "" ? null : Number(val) }));
                }}
                placeholder="160"
                className="w-full rounded-xl px-3 py-2.5 text-sm"
                style={inputStyle}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setWorkoutForm(false)}
              className="flex-1 rounded-xl py-2.5 text-sm"
              style={{ background: COLORS.surfaceElevated, color: COLORS.textDim, ...body }}
            >
              取消
            </button>
            <button
              onClick={handleSaveWorkout}
              disabled={formLoading}
              className="flex-1 rounded-xl py-2.5 text-sm flex items-center justify-center gap-2"
              style={{ background: COLORS.accent, color: "#fff", ...body, fontWeight: 600 }}
            >
              {formLoading && <Loader2 size={14} className="animate-spin" />}
              {formLoading ? "儲存中…" : (selectedWorkout ? "更新紀錄" : "新增紀錄")}
            </button>
          </div>
        </div>
      )}

      </div>
  );
}

/* ----------------------------- 體態 + 照片對比 ----------------------------- */

function BodyMetricEntryForm({
  onSave,
  onCancel,
  saving,
  initialData = null,
  date: defaultDate = new Date().toISOString().split('T')[0]
}) {
  const [weight, setWeight] = useState(initialData?.weight_kg?.toString() || "");
  const [bodyFat, setBodyFat] = useState(initialData?.body_fat_pct?.toString() || "");
  const [muscleMass, setMuscleMass] = useState(initialData?.muscle_mass_kg?.toString() || "");
  const [visceralFat, setVisceralFat] = useState(initialData?.visceral_fat_level?.toString() || "");
  const [note, setNote] = useState(initialData?.note || "");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(initialData?.photo_path ? null : "");
  const [isEditing, setIsEditing] = useState(!!initialData);
  const [metricId, setMetricId] = useState(initialData?.id || null);
  // Local state for the date in the form
  const initialFormDate = initialData ?
    (initialData.recorded_at ? initialData.recorded_at.split('T')[0] : '') :
    defaultDate;
  const [formDate, setFormDate] = useState(initialFormDate);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    const data = {
      weight: weight ? Number(weight) : null,
      bodyFat: bodyFat ? Number(bodyFat) : null,
      muscleMass: muscleMass ? Number(muscleMass) : null,
      visceralFat: visceralFat ? Number(visceralFat) : null,
      note,
      photoFile
    };
    const ok = await onSave({
      weight: data.weight,
      bodyFat: data.bodyFat,
      muscleMass: data.muscleMass,
      visceralFat: data.visceralFat,
      note: data.note,
      photoFile: data.photoFile,
      date: formDate
    });
    if (ok) {
      onCancel();
    }
  };

  return (
    <div className="rounded-2xl p-4 mb-4" style={{ background: COLORS.surface, border: `1px solid ${COLORS.borderSoft}` }}>
      <div className="flex gap-3 mb-3">
        <div className="flex-1">
          <label className="text-xs mb-1.5 block" style={{ ...body, color: COLORS.textDim }}>體重 (kg)</label>
          <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="70.5" className="w-full rounded-xl px-3 py-2.5 text-sm" style={inputStyle} />
        </div>
        <div className="flex-1">
          <label className="text-xs mb-1.5 block" style={{ ...body, color: COLORS.textDim }}>體脂率 (%)</label>
          <input type="number" value={bodyFat} onChange={(e) => setBodyFat(e.target.value)} placeholder="18" className="w-full rounded-xl px-3 py-2.5 text-sm" style={inputStyle} />
        </div>
      </div>

      <div className="flex gap-3 mb-3">
        <div className="flex-1">
          <label className="text-xs mb-1.5 block" style={{ ...body, color: COLORS.textDim }}>肌肉量 (kg)</label>
          <input type="number" value={muscleMass} onChange={(e) => setMuscleMass(e.target.value)} placeholder="32.0" className="w-full rounded-xl px-3 py-2.5 text-sm" style={inputStyle} />
        </div>
        <div className="flex-1">
          <label className="text-xs mb-1.5 block" style={{ ...body, color: COLORS.textDim }}>內臟脂肪等級</label>
          <input type="number" value={visceralFat} onChange={(e) => setVisceralFat(e.target.value)} placeholder="8" className="w-full rounded-xl px-3 py-2.5 text-sm" style={inputStyle} />
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <label className="text-xs mb-1.5 block" style={{ ...body, color: COLORS.textDim }}>日期</label>
        <input
          type="date"
          value={formDate}
          onChange={(e) => setFormDate(e.target.value)}
          className="w-full rounded-xl px-3 py-2 text-sm"
          style={inputStyle}
        />
      </div>

      <label className="text-xs mb-1.5 block" style={{ ...body, color: COLORS.textDim }}>照片(選填)</label>
      <label
        className="w-full rounded-xl mb-3 flex items-center justify-center gap-2 py-3 cursor-pointer"
        style={{ background: COLORS.surfaceElevated, border: `1px dashed ${COLORS.borderSoft}` }}
      >
        {photoPreview ? (
          <img src={photoPreview} alt="預覽" className="h-20 rounded-lg object-cover" />
        ) : (
          <>
            <Camera size={16} color={COLORS.textFaint} />
            <span className="text-sm" style={{ ...body, color: COLORS.textFaint }}>拍照或選擇照片</span>
          </>
        )}
        <input type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
      </label>

      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="備註(選填)" className="w-full rounded-xl px-3 py-2.5 text-sm mb-3" style={inputStyle} />

      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 rounded-xl py-2.5 text-sm" style={{ background: COLORS.surfaceElevated, color: COLORS.textDim, ...body }}>取消</button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 rounded-xl py-2.5 text-sm flex items-center justify-center gap-2"
          style={{ background: COLORS.accent, color: "#fff", ...body, fontWeight: 600 }}
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          {saving ? "儲存中…" : (isEditing ? "更新紀錄" : "新增紀錄")}
        </button>
      </div>
    </div>
  );
}

function PhotoThumb({ path }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let active = true;
    if (path) getBodyPhotoUrl(path).then((u) => active && setUrl(u)).catch(() => {});
    return () => { active = false; };
  }, [path]);
  if (!path) return null;
  return url ? (
    <img src={url} alt="體態照片" className="w-full h-full object-cover" />
  ) : (
    <div className="w-full h-full flex items-center justify-center" style={{ background: COLORS.surfaceElevated }}>
      <Loader2 size={14} color={COLORS.textFaint} className="animate-spin" />
    </div>
  );
}

function PhotoCompareSlider({ entries, onClose }) {
  const withPhotos = entries.filter((e) => e.photo_path);
  const [beforeIdx, setBeforeIdx] = useState(withPhotos.length - 1);
  const [afterIdx, setAfterIdx] = useState(0);
  const [slider, setSlider] = useState(50);
  const [beforeUrl, setBeforeUrl] = useState(null);
  const [afterUrl, setAfterUrl] = useState(null);

  useEffect(() => {
    const e = withPhotos[beforeIdx];
    if (e) getBodyPhotoUrl(e.photo_path).then(setBeforeUrl).catch(() => {});
  }, [beforeIdx, withPhotos]);
  useEffect(() => {
    const e = withPhotos[afterIdx];
    if (e) getBodyPhotoUrl(e.photo_path).then(setAfterUrl).catch(() => {});
  }, [afterIdx, withPhotos]);

  return (
    <div className="fixed inset-0 z-30 flex flex-col" style={{ background: COLORS.bg }}>
      <div className="flex items-center gap-3 px-5 shrink-0" style={{ paddingTop: "calc(14px + env(safe-area-inset-top))", paddingBottom: "12px", borderBottom: `1px solid ${COLORS.borderSoft}` }}>
        <button onClick={onClose} style={{ color: COLORS.textDim }}><X size={20} /></button>
        <div style={{ ...display, color: COLORS.text, fontWeight: 700 }}>照片對比</div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="relative rounded-2xl overflow-hidden mb-4" style={{ aspectRatio: "3/4", background: COLORS.surface }}>
          {afterUrl && (
            <img src={afterUrl} alt="之後" className="absolute inset-0 w-full h-full object-cover" />
          )}
          {beforeUrl && (
            <div className="absolute inset-0 overflow-hidden" style={{ width: `${slider}%` }}>
              <img src={beforeUrl} alt="之前" className="h-full object-cover" style={{ width: `${10000 / slider}%`, maxWidth: "none" }} />
            </div>
          )}
          <div className="absolute top-0 bottom-0" style={{ left: `${slider}%`, width: "2px", background: COLORS.lime }} />
          <div className="absolute top-3 left-3 text-xs px-2 py-1 rounded-full" style={{ background: "rgba(0,0,0,0.5)", color: "#fff", ...body }}>
            {withPhotos[beforeIdx] ? fmtDate(withPhotos[beforeIdx].recorded_at) : ""}
          </div>
          <div className="absolute top-3 right-3 text-xs px-2 py-1 rounded-full" style={{ background: "rgba(0,0,0,0.5)", color: "#fff", ...body }}>
            {withPhotos[afterIdx] ? fmtDate(withPhotos[afterIdx].recorded_at) : ""}
          </div>
        </div>

        <input
          type="range"
          min={0}
          max={100}
          value={slider}
          onChange={(e) => setSlider(Number(e.target.value))}
          className="w-full mb-6"
        />

        <div className="flex gap-3">
          <div className="flex-1">
            <div className="text-xs mb-1.5" style={{ ...body, color: COLORS.textDim }}>之前</div>
            <select value={beforeIdx} onChange={(e) => setBeforeIdx(Number(e.target.value))} className="w-full rounded-xl px-3 py-2.5 text-sm" style={inputStyle}>
              {withPhotos.map((e, i) => <option key={e.id} value={i}>{fmtDate(e.recorded_at)}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <div className="text-xs mb-1.5" style={{ ...body, color: COLORS.textDim }}>之後</div>
            <select value={afterIdx} onChange={(e) => setAfterIdx(Number(e.target.value))} className="w-full rounded-xl px-3 py-2.5 text-sm" style={inputStyle}>
              {withPhotos.map((e, i) => <option key={e.id} value={i}>{fmtDate(e.recorded_at)}</option>)}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

function BodyMetricsPanel({ bodyMetrics, onSave, onDelete, saving }) {
  const [showForm, setShowForm] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [chartMetric, setChartMetric] = useState("weight_kg");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [filteredMetrics, setFilteredMetrics] = useState([]);
  const [editingMetric, setEditingMetric] = useState(null);

  // New state for date range
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [rangeMetrics, setRangeMetrics] = useState([]);
  const [rangeLoading, setRangeLoading] = useState(false);
  const [rangeError, setRangeError] = useState(null);

  useEffect(() => {
    if (selectedDate) {
      loadMetricsForDate();
    }
  }, [selectedDate]);

  useEffect(() => {
    if (dateRange.start && dateRange.end) {
      loadMetricsForRange();
    } else {
      setRangeMetrics([]);
      setRangeError(null);
    }
  }, [dateRange.start, dateRange.end]);

  const loadMetricsForDate = async () => {
    try {
      const metrics = await getBodyMetricsByDate(selectedDate);
      setFilteredMetrics(metrics);
    } catch (e) {
      console.error("Failed to load body metrics for date:", e);
      setFilteredMetrics([]);
    }
  };

  const loadMetricsForRange = async () => {
    setRangeLoading(true);
    setRangeError(null);
    try {
      const metrics = await getBodyMetricsByDateRange(dateRange.start, dateRange.end);
      setRangeMetrics(metrics);
    } catch (e) {
      console.error("Failed to load body metrics for range:", e);
      setRangeError(e.message || "載入失敗");
      setRangeMetrics([]);
    } finally {
      setRangeLoading(false);
    }
  };

  const withPhotos = filteredMetrics.filter((m) => m.photo_path);
  const latest = filteredMetrics[0];

  // Latest metric in range (most recent)
  const latestInRange = rangeMetrics.length > 0 ? rangeMetrics.reduce((latest, current) =>
    new Date(current.recorded_at) > new Date(latest.recorded_at) ? current : latest
  ) : null;

  const METRICS = {
    weight_kg: { label: "體重", unit: "kg", color: COLORS.lime },
    body_fat_pct: { label: "體脂率", unit: "%", color: COLORS.accent },
    muscle_mass_kg: { label: "肌肉量", unit: "kg", color: "#FF9F5C" },
    visceral_fat_level: { label: "內臟脂肪", unit: "", color: "#FF5D5D" },
  };

  // Chart data for range (ascending date)
  const chartData = rangeMetrics
    .filter((m) => m[chartMetric] != null)
    .sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at))
    .map(m => ({
      value: Number(m[chartMetric]),
      label: `${new Date(m.recorded_at).getMonth() + 1}/${new Date(m.recorded_at).getDate()}`,
      formatted: `${Number(m[chartMetric])}${METRICS[chartMetric].unit}`
    }));

  const activeMeta = METRICS[chartMetric];

  const handleSaveMetric = async (data) => {
    const success = await onSave({
      weight: data.weight,
      bodyFat: data.bodyFat,
      muscleMass: data.muscleMass,
      visceralFat: data.visceralFat,
      note: data.note,
      photoFile: data.photoFile,
      date: selectedDate
    });

    if (success) {
      setShowForm(false);
      setEditingMetric(null);
      await loadMetricsForDate(); // Refresh
    }
  };

  const handleEditMetric = (metric) => {
    setEditingMetric(metric);
    setShowForm(true);
  };

  return (
    <div>
      {/* Date Range Picker for Trend */}
      {!rangeLoading && (
        <div className="mb-4">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-xs mb-1 block" style={{ ...body, color: COLORS.textDim }}>開始日期</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => {
                  const start = e.target.value;
                  setDateRange(prev => ({ ...prev, start }));
                }}
                className="w-full rounded-xl px-3 py-2 text-sm"
                style={inputStyle}
              />
            </div>
            <div className="flex-1">
              <label className="text-xs mb-1 block" style={{ ...body, color: COLORS.textDim }}>結束日期</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => {
                  const end = e.target.value;
                  setDateRange(prev => ({ ...prev, end }));
                }}
                className="w-full rounded-xl px-3 py-2 text-sm"
                style={inputStyle}
              />
            </div>
            <button
              onClick={() => {
                // Quick preset: last 30 days
                const end = new Date().toISOString().split('T')[0];
                const start = new Date();
                start.setDate(start.getDate() - 30);
                const startStr = start.toISOString().split('T')[0];
                setDateRange({ start: startStr, end: end });
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
              style={{ background: COLORS.accentSoft, color: COLORS.accent, ...body, fontWeight: 600 }}
            >
              最近30天
            </button>
          </div>
        </div>
      )}
      {rangeLoading && (
        <div className="mb-4 text-sm text-center" style={{ ...body, color: COLORS.textFaint }}>
          載入趨勢資料中...
        </div>
      )}
      {rangeError && (
        <div className="mb-4 text-sm text-center" style={{ ...body, color: COLORS.danger }}>
          載入失敗: {rangeError}
        </div>
      )}

      <div className="rounded-2xl p-4 mb-4" style={{ background: COLORS.surface, border: `1px solid ${COLORS.borderSoft}` }}>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {Object.entries(METRICS).map(([key, meta]) => {
            const value = latestInRange?.[key] ?? latest?.[key];
            const active = chartMetric === key;
            return (
              <button
                key={key}
                onClick={() => setChartMetric(key)}
                className="text-left rounded-xl p-2.5"
                style={{ background: active ? COLORS.accentSoft : "transparent", border: `1px solid ${active ? COLORS.accent : "transparent"}` }}
              >
                <div className="text-xs" style={{ ...body, color: COLORS.textDim }}>{meta.label}</div>
                <div className="text-xl" style={{ ...display, color: COLORS.text, fontWeight: 700 }}>
                  {value != null ? `${value}${meta.unit}` : "—"}
                </div>
              </button>
            );
          })}
        </div>
        {chartData.length > 1 ? (
          <>
            <LineChart points={chartData.map((m) => ({
              value: Number(m[chartMetric]),
              label: `${new Date(m.recorded_at).getMonth() + 1}/${new Date(m.recorded_at).getDate()}`
            }))} color={activeMeta.color} />
            <div className="text-xs text-center mt-2" style={{ ...body, color: COLORS.textFaint }}>{activeMeta.label}趨勢(最近 {chartData.length} 筆紀錄)</div>
          </>
        ) : (
          <div className="text-sm text-center py-4" style={{ ...body, color: COLORS.textFaint }}>累積更多「{activeMeta.label}」紀錄後這裡會顯示趨勢圖</div>
        )}
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setShowForm(true)}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm"
          style={{ background: COLORS.accentSoft, color: COLORS.accent, ...body, fontWeight: 600 }}
        >
          <Plus size={15} /> 新增紀錄
        </button>
        <button
          onClick={() => setShowCompare(true)}
          disabled={withPhotos.length < 2}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm"
          style={{ background: COLORS.surfaceElevated, color: withPhotos.length < 2 ? COLORS.textFaint : COLORS.text, ...body, fontWeight: 600 }}
        >
          <ImageIcon size={15} /> 照片對比
        </button>
      </div>

      {showForm && (
        <BodyMetricEntryForm
          saving={saving}
          onCancel={() => {
            setShowForm(false);
            setEditingMetric(null);
          }}
          onSave={handleSaveMetric}
          initialData={editingMetric}
          date={selectedDate}
        />
      )}

      <div className="flex items-center justify-between mb-3">
        <div className="text-sm" style={{ ...body, color: COLORS.textDim, fontWeight: 600 }}>紀錄</div>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="rounded-xl px-3 py-2 text-sm"
          style={inputStyle}
        />
      </div>

      {filteredMetrics.length === 0 ? (
        <div className="text-sm text-center py-6" style={{ ...body, color: COLORS.textFaint }}>
          {selectedDate ?
            `${new Date(selectedDate).getMonth() + 1}月${new Date(selectedDate).getDate()}日尚無體態紀錄` :
            "選擇日期以查看體態紀錄"}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredMetrics.map((m) => (
            <div key={m.id} className="rounded-2xl p-3 flex items-center gap-3" style={{ background: COLORS.surface, border: `1px solid ${COLORS.borderSoft}` }}>
              <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0" style={{ background: COLORS.surfaceElevated }}>
                {m.photo_path ? <PhotoThumb path={m.photo_path} /> : <div className="w-full h-full flex items-center justify-center"><Camera size={14} color={COLORS.textFaint} /></div>}
              </div>
              <div className="flex-1">
                <div className="text-sm" style={{ ...body, color: COLORS.text, fontWeight: 600 }}>{fmtDate(m.recorded_at)}</div>
                <div className="text-xs" style={{ ...body, color: COLORS.textFaint }}>
                  {[
                    m.weight_kg != null && `${m.weight_kg} kg`,
                    m.body_fat_pct != null && `體脂 ${m.body_fat_pct}%`,
                    m.muscle_mass_kg != null && `肌肉 ${m.muscle_mass_kg}kg`,
                    m.visceral_fat_level != null && `內臟脂肪 ${m.visceral_fat_level}`,
                  ].filter(Boolean).join(" · ") || m.note || "—"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleEditMetric(m)} style={{ color: COLORS.accent, fontSize: "14px" }}><Edit size={16} /></button>
                <button onClick={() => onDelete(m.id)} style={{ color: COLORS.textFaint }}><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCompare && <PhotoCompareSlider entries={filteredMetrics} onClose={() => setShowCompare(false)} />}
    </div>
  );
}

/* ----------------------------- 營養追蹤 ----------------------------- */

function NutritionPanel({ date, onChangeDate, logs, onAdd, onDelete, onUpdate, saving }) {
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [meal, setMeal] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [note, setNote] = useState("");

  const totals = logs.reduce(
    (acc, l) => ({
      calories: acc.calories + Number(l.calories),
      protein: acc.protein + Number(l.protein_g),
      carbs: acc.carbs + Number(l.carbs_g),
      fat: acc.fat + Number(l.fat_g),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const handleSubmit = async () => {
    if (!meal.trim()) return;
    if (editMode && editingId) {
      const ok = await onUpdate(editingId, {
        meal: meal.trim(),
        calories: calories ? Number(calories) : 0,
        proteinG: protein ? Number(protein) : 0,
        carbsG: carbs ? Number(carbs) : 0,
        fatG: fat ? Number(fat) : 0,
        note: note || null,
      });
      if (ok) {
        setMeal(""); setCalories(""); setProtein(""); setCarbs(""); setFat(""); setNote("");
        setShowForm(false);
        setEditMode(false);
        setEditingId(null);
      }
    } else {
      const ok = await onAdd({
        meal: meal.trim(),
        calories: calories ? Number(calories) : 0,
        proteinG: protein ? Number(protein) : 0,
        carbsG: carbs ? Number(carbs) : 0,
        fatG: fat ? Number(fat) : 0,
        note: note || null,
      });
      if (ok) {
        setMeal(""); setCalories(""); setProtein(""); setCarbs(""); setFat(""); setNote("");
        setShowForm(false);
      }
    }
  };

  const handleEditClick = (log) => {
    setEditMode(true);
    setEditingId(log.id);
    setMeal(log.meal);
    setCalories(log.calories.toString());
    setProtein(log.protein_g.toString());
    setCarbs(log.carbs_g.toString());
    setFat(log.fat_g.toString());
    setNote(log.note || "");
    setShowForm(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <input
          type="date"
          value={date}
          onChange={(e) => onChangeDate(e.target.value)}
          className="rounded-xl px-3 py-2 text-sm"
          style={inputStyle}
        />
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg"
          style={{ background: COLORS.accentSoft, color: COLORS.accent, ...body, fontWeight: 600 }}
        >
          {showForm && editMode ? <X size={15} /> : <Plus size={15} />}
          {showForm && editMode ? "取消編輯" : "記錄飲食"}
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { label: "熱量", value: Math.round(totals.calories), unit: "kcal" },
          { label: "蛋白質", value: Math.round(totals.protein), unit: "g" },
          { label: "碳水", value: Math.round(totals.carbs), unit: "g" },
          { label: "脂肪", value: Math.round(totals.fat), unit: "g" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl p-2.5 text-center" style={{ background: COLORS.surface, border: `1px solid ${COLORS.borderSoft}` }}>
            <div style={{ ...display, color: COLORS.text, fontWeight: 700, fontSize: "16px" }}>{s.value}</div>
            <div className="text-[10px] mt-0.5" style={{ ...body, color: COLORS.textFaint }}>{s.label} {s.unit}</div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="rounded-2xl p-4 mb-4" style={{ background: COLORS.surface, border: `1px solid ${COLORS.borderSoft}` }}>
          <input value={meal} onChange={(e) => setMeal(e.target.value)} placeholder="餐點名稱,例如：雞胸肉便當" className="w-full rounded-xl px-3 py-2.5 text-sm mb-3" style={inputStyle} />
          <div className="grid grid-cols-4 gap-2 mb-3">
            <input type="number" value={calories} onChange={(e) => setCalories(e.target.value)} placeholder="熱量" className="rounded-xl px-2 py-2 text-sm text-center" style={inputStyle} />
            <input type="number" value={protein} onChange={(e) => setProtein(e.target.value)} placeholder="蛋白質" className="rounded-xl px-2 py-2 text-sm text-center" style={inputStyle} />
            <input type="number" value={carbs} onChange={(e) => setCarbs(e.target.value)} placeholder="碳水" className="rounded-xl px-2 py-2 text-sm text-center" style={inputStyle} />
            <input type="number" value={fat} onChange={(e) => setFat(e.target.value)} placeholder="脂肪" className="rounded-xl px-2 py-2 text-sm text-center" style={inputStyle} />
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="備註(選填)" className="w-full rounded-xl px-2 py-2 text-sm mb-2" style={inputStyle} />
          </div>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full rounded-xl py-2.5 text-sm flex items-center justify-center gap-2"
            style={{ background: COLORS.accent, color: "#fff", ...body, fontWeight: 600 }}
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? "儲存中…" : (editMode ? "更新紀錄" : "新增")}
          </button>
        </div>
      )}

      <div className="text-sm mb-3" style={{ ...body, color: COLORS.textDim, fontWeight: 600 }}>當天飲食</div>
      {logs.length === 0 ? (
        <div className="text-sm text-center py-6" style={{ ...body, color: COLORS.textFaint }}>這天還沒有飲食紀錄</div>
      ) : (
        <div className="flex flex-col gap-3">
          {logs.map((l) => (
            <div key={l.id} className="rounded-2xl p-4 flex items-center gap-3" style={{ background: COLORS.surface, border: `1px solid ${COLORS.borderSoft}` }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: COLORS.accentSoft }}>
                <Utensils size={15} color={COLORS.accent} />
              </div>
              <div className="flex-1">
                <div className="text-sm" style={{ ...body, color: COLORS.text, fontWeight: 600 }}>{l.meal}</div>
                <div className="text-xs" style={{ ...body, color: COLORS.textFaint }}>
                  {Math.round(l.calories)} kcal · 蛋白質 {Math.round(l.protein_g)}g
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleEditClick(l)} style={{ color: COLORS.accent, fontSize: "14px" }}><Edit size={16} /></button>
                <button onClick={() => onDelete(l.id)} style={{ color: COLORS.textFaint }}><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ----------------------------- 主要匯出 ----------------------------- */

export default function ProgressPanels({
  volumeTrend, personalRecords, weekVolume,
  streak, weekWorkouts,
  bodyMetrics, onSaveBodyMetric, onDeleteBodyMetric, bodyMetricSaving,
  nutritionDate, onChangeNutritionDate, nutritionLogs, onAddNutrition, onDeleteNutrition, nutritionSaving,
}) {
  const [tab, setTab] = useState("training");

  return (
    <div className="px-5 pb-6">
      <div className="pt-2 pb-4">
        <div className="text-2xl" style={{ ...display, color: COLORS.text, fontWeight: 700 }}>你的進度</div>
      </div>

      <SegmentedControl
        value={tab}
        onChange={setTab}
        options={[
          { value: "training", label: "訓練" },
          { value: "body", label: "體態" },
          { value: "nutrition", label: "營養" },
        ]}
      />

      {tab === "training" && (
        <TrainingPanel
          volumeTrend={volumeTrend}
          personalRecords={personalRecords}
          weekVolume={weekVolume}
          streak={streak}
          weekWorkouts={weekWorkouts}
        />
      )}
      {tab === "body" && (
        <BodyMetricsPanel bodyMetrics={bodyMetrics} onSave={onSaveBodyMetric} onDelete={onDeleteBodyMetric} saving={bodyMetricSaving} />
      )}
      {tab === "nutrition" && (
        <NutritionPanel
          date={nutritionDate}
          onChangeDate={onChangeNutritionDate}
          logs={nutritionLogs}
          onAdd={onAddNutrition}
          onDelete={onDeleteNutrition}
          onUpdate={updateNutritionEntry}
          saving={nutritionSaving}
        />
      )}
    </div>
  );
}
