import { useState, useEffect, useRef, useCallback } from "react";
import {
  Flame, Dumbbell, TrendingUp, User, Home, Play, Check, Clock, Trophy,
  ChevronRight, ArrowLeft, LogOut, AlertCircle, Loader2, Heart, Bluetooth, Share2,
} from "lucide-react";
import { COLORS, display, body } from "./theme";
import AuthScreen from "./components/AuthScreen";
import TrainScreen from "./components/TrainScreen";
import ProgressPanels from "./components/ProgressPanels";
import { connectHeartRateMonitor, isBluetoothSupported } from "./lib/bluetooth";
import { shareCard } from "./lib/share";
import {
  getSession, onAuthStateChange, signOut, getProfile,
  listRoutines, seedDefaultRoutines, createRoutine, updateRoutine, deleteRoutine, listExercises,
  createCustomExercise, updateExercise, deleteExercise,
  startWorkout as startWorkoutApi, upsertSet as upsertSetApi, finishWorkout as finishWorkoutApi,
  createBackfilledWorkout,
  listRecentWorkouts, getThisWeekStats, getStreak,
  getVolumeTrend, getPersonalRecords, getPersonalRecordsMap, getAllTimeStats,
  listBodyMetrics, upsertBodyMetric, uploadBodyPhoto, getBodyPhotoUrl, deleteBodyMetric,
  listNutritionLogs, addNutritionEntry, deleteNutritionEntry,
} from "./lib/api";

/* ----------------------------- 共用小元件 ----------------------------- */

function LoadingScreen() {
  return (
    <div className="w-full flex items-center justify-center" style={{ background: COLORS.bg, minHeight: "100dvh" }}>
      <Loader2 size={28} color={COLORS.accent} className="animate-spin" />
    </div>
  );
}

function ErrorBanner({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div
      className="mx-5 mt-3 rounded-xl px-4 py-3 flex items-start gap-2"
      style={{ background: COLORS.dangerSoft, border: `1px solid ${COLORS.danger}` }}
    >
      <AlertCircle size={16} color={COLORS.danger} className="shrink-0 mt-0.5" />
      <div className="flex-1 text-sm" style={{ ...body, color: COLORS.text }}>{message}</div>
      <button onClick={onDismiss} className="text-xs shrink-0" style={{ ...body, color: COLORS.textDim }}>關閉</button>
    </div>
  );
}

function BottomNav({ tab, setTab }) {
  const items = [
    { id: "home", label: "首頁", icon: Home },
    { id: "train", label: "訓練", icon: Dumbbell },
    { id: "progress", label: "進度", icon: TrendingUp },
    { id: "me", label: "我的", icon: User },
  ];
  return (
    <div
      className="flex items-center justify-around shrink-0 border-t"
      style={{
        background: COLORS.surface,
        borderColor: COLORS.borderSoft,
        paddingTop: "8px",
        paddingBottom: "calc(10px + env(safe-area-inset-bottom))",
      }}
    >
      {items.map((it) => {
        const Icon = it.icon;
        const active = tab === it.id;
        return (
          <button
            key={it.id}
            onClick={() => setTab(it.id)}
            className="flex flex-col items-center gap-1 px-4 py-1"
            style={{ color: active ? COLORS.accent : COLORS.textFaint }}
          >
            <Icon size={22} strokeWidth={active ? 2.4 : 1.8} />
            <span className="text-xs" style={{ ...body, fontWeight: active ? 600 : 400 }}>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, accentColor }) {
  return (
    <div className="flex-1 rounded-2xl p-4" style={{ background: COLORS.surface, border: `1px solid ${COLORS.borderSoft}` }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs" style={{ ...body, color: COLORS.textDim }}>{label}</span>
        <Icon size={16} color={accentColor || COLORS.textFaint} />
      </div>
      <div className="text-2xl" style={{ ...display, color: COLORS.text, fontWeight: 700 }}>{value}</div>
      {sub && <div className="text-xs mt-1" style={{ ...body, color: COLORS.textFaint }}>{sub}</div>}
    </div>
  );
}

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

/* ----------------------------- 首頁 ----------------------------- */

function HomeScreen({ profile, recent, streak, weekVolume, weekWorkouts, goToTrain }) {
  const [sharingStreak, setSharingStreak] = useState(false);

  const handleShareStreak = async () => {
    setSharingStreak(true);
    try {
      await shareCard({
        title: `連續訓練 ${streak} 天`,
        subtitle: "堅持就是最好的成績",
        stats: [
          { label: "本週訓練量 (kg)", value: Math.round(weekVolume).toLocaleString() },
          { label: "本週次數", value: `${weekWorkouts} / 5`, accent: true },
        ],
        textFallback: `我已經連續訓練 ${streak} 天了！`,
        filename: "streak.png",
      });
    } catch (e) {
      // 使用者取消或裝置不支援，靜默即可
    } finally {
      setSharingStreak(false);
    }
  };

  return (
    <div className="px-5 pb-6">
      <div className="pt-2 pb-5">
        <div className="text-sm" style={{ ...body, color: COLORS.textDim }}>
          {new Date().toLocaleDateString("zh-TW", { month: "long", day: "numeric", weekday: "long" })}
        </div>
        <div className="text-2xl mt-1" style={{ ...display, color: COLORS.text, fontWeight: 700 }}>
          早安,{profile?.display_name || "訓練者"}
        </div>
      </div>

      <div
        className="rounded-2xl p-4 mb-4 flex items-center justify-between"
        style={{ background: `linear-gradient(135deg, ${COLORS.accentSoft}, ${COLORS.surface})`, border: `1px solid ${COLORS.borderSoft}` }}
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: COLORS.limeSoft }}>
            <Flame size={22} color={COLORS.lime} />
          </div>
          <div>
            <div className="text-xl" style={{ ...display, color: COLORS.text, fontWeight: 700 }}>{streak} 天連續訓練</div>
            <div className="text-xs" style={{ ...body, color: COLORS.textDim }}>保持下去,別中斷紀錄</div>
          </div>
        </div>
        <button onClick={handleShareStreak} disabled={sharingStreak} className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: COLORS.surface }}>
          {sharingStreak ? <Loader2 size={15} color={COLORS.textDim} className="animate-spin" /> : <Share2 size={15} color={COLORS.textDim} />}
        </button>
      </div>

      <div className="flex gap-3 mb-5">
        <StatCard label="本週訓練量" value={Math.round(weekVolume).toLocaleString() + " kg"} icon={TrendingUp} accentColor={COLORS.accent} />
        <StatCard label="本週次數" value={`${weekWorkouts} / 5`} sub="次訓練" icon={Dumbbell} accentColor={COLORS.lime} />
      </div>

      <button
        onClick={goToTrain}
        className="w-full rounded-2xl py-4 flex items-center justify-center gap-2 mb-6"
        style={{ background: COLORS.accent, color: "#fff" }}
      >
        <Play size={18} fill="#fff" />
        <span style={{ ...display, fontWeight: 700, fontSize: "16px" }}>開始訓練</span>
      </button>

      <div className="text-sm mb-3" style={{ ...body, color: COLORS.textDim, fontWeight: 600 }}>最近訓練</div>
      {recent.length === 0 ? (
        <div className="text-sm text-center py-6" style={{ ...body, color: COLORS.textFaint }}>還沒有訓練紀錄,開始第一次訓練吧</div>
      ) : (
        <div className="flex flex-col gap-3">
          {recent.map((w) => (
            <div key={w.id} className="rounded-2xl p-4 flex items-center justify-between" style={{ background: COLORS.surface, border: `1px solid ${COLORS.borderSoft}` }}>
              <div>
                <div style={{ ...body, color: COLORS.text, fontWeight: 600 }}>{w.routine_name}</div>
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
  );
}

/* ----------------------------- 進度 ----------------------------- */

/* ----------------------------- 我的 ----------------------------- */

function MeScreen({ profile, allTimeStats, onSignOut }) {
  return (
    <div className="px-5 pb-6">
      <div className="pt-2 pb-5 flex items-center gap-4">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: COLORS.accentSoft, color: COLORS.accent, ...display, fontWeight: 700, fontSize: "22px" }}
        >
          {(profile?.display_name || "訓")[0]}
        </div>
        <div>
          <div className="text-xl" style={{ ...display, color: COLORS.text, fontWeight: 700 }}>{profile?.display_name || "訓練者"}</div>
          <div className="text-xs" style={{ ...body, color: COLORS.textFaint }}>
            加入於 {profile?.created_at ? new Date(profile.created_at).toLocaleDateString("zh-TW", { year: "numeric", month: "long" }) : "—"}
          </div>
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        <StatCard label="總訓練次數" value={allTimeStats.totalWorkouts} icon={Dumbbell} />
        <StatCard
          label="累積訓練量"
          value={allTimeStats.totalVolume >= 1000 ? `${(allTimeStats.totalVolume / 1000).toFixed(1)}t` : `${Math.round(allTimeStats.totalVolume)}kg`}
          icon={TrendingUp}
          accentColor={COLORS.accent}
        />
      </div>

      <button
        onClick={onSignOut}
        className="w-full rounded-2xl overflow-hidden flex items-center justify-between px-4 py-3.5"
        style={{ background: COLORS.surface, border: `1px solid ${COLORS.borderSoft}` }}
      >
        <div className="flex items-center gap-3">
          <LogOut size={17} color={COLORS.danger} />
          <span style={{ ...body, color: COLORS.danger }}>登出</span>
        </div>
        <ChevronRight size={16} color={COLORS.textFaint} />
      </button>
    </div>
  );
}

/* ----------------------------- 訓練進行中 ----------------------------- */

function ActiveWorkout({
  workout, onUpdateSet, onToggleSet, onFinish, onCancel, elapsedSec, restSeconds, onSkipRest, onAddRest, finishing,
  hrSupported, hrConnection, hrCurrent, hrConnecting, hrError, onConnectHeartRate, onDisconnectHeartRate,
}) {
  const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const totalSets = workout.exercises.reduce((a, e) => a + e.sets.length, 0);
  const doneSets = workout.exercises.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0);

  useEffect(() => {
    let wakeLock = null;
    const requestWakeLock = async () => {
      try {
        if ("wakeLock" in navigator) wakeLock = await navigator.wakeLock.request("screen");
      } catch (err) {
        // 部分瀏覽器/情境會拒絕請求，靜默失敗即可
      }
    };
    requestWakeLock();
    return () => { if (wakeLock) wakeLock.release().catch(() => {}); };
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div
        className="flex items-center justify-between px-5 pb-3 shrink-0"
        style={{ borderBottom: `1px solid ${COLORS.borderSoft}`, paddingTop: "calc(10px + env(safe-area-inset-top))" }}
      >
        <button onClick={onCancel} className="p-1" style={{ color: COLORS.textDim }}>
          <ArrowLeft size={20} />
        </button>
        <div className="text-center">
          <div style={{ ...display, color: COLORS.text, fontWeight: 700 }}>{workout.routine.name}</div>
          <div className="text-xs" style={{ ...body, color: COLORS.textFaint }}>{doneSets} / {totalSets} 組完成</div>
        </div>
        <div style={{ ...display, color: COLORS.lime, fontWeight: 700, fontSize: "14px", minWidth: "40px", textAlign: "right" }}>
          {fmtTime(elapsedSec)}
        </div>
      </div>

      {hrSupported && (
        <div className="flex items-center justify-between px-5 py-2 shrink-0" style={{ borderBottom: `1px solid ${COLORS.borderSoft}` }}>
          {hrConnection ? (
            <>
              <div className="flex items-center gap-2">
                <Heart size={15} color={COLORS.danger} fill={COLORS.danger} />
                <span style={{ ...display, color: COLORS.text, fontWeight: 700, fontSize: "15px" }}>{hrCurrent ?? "—"}</span>
                <span className="text-xs" style={{ ...body, color: COLORS.textFaint }}>bpm · {hrConnection.deviceName}</span>
              </div>
              <button onClick={onDisconnectHeartRate} className="text-xs" style={{ ...body, color: COLORS.textDim }}>中斷連線</button>
            </>
          ) : (
            <button onClick={onConnectHeartRate} disabled={hrConnecting} className="flex items-center gap-1.5 text-xs" style={{ ...body, color: COLORS.textDim }}>
              {hrConnecting ? <Loader2 size={13} className="animate-spin" /> : <Bluetooth size={13} />}
              {hrConnecting ? "連接中…" : "連接心率手環(選用)"}
            </button>
          )}
        </div>
      )}
      {hrError && (
        <div className="mx-5 mt-2 text-xs px-3 py-2 rounded-lg shrink-0" style={{ background: COLORS.dangerSoft, color: COLORS.danger, ...body }}>{hrError}</div>
      )}

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="flex flex-col gap-4">
          {workout.exercises.map((ex, exIdx) => (
            <div key={exIdx} className="rounded-2xl p-4" style={{ background: COLORS.surface, border: `1px solid ${COLORS.borderSoft}` }}>
              <div style={{ ...body, color: COLORS.text, fontWeight: 700 }} className="mb-3">{ex.name}</div>
              <div className="grid grid-cols-12 gap-2 text-xs mb-2 px-1" style={{ ...body, color: COLORS.textFaint }}>
                <div className="col-span-2">組數</div>
                <div className="col-span-3">上次</div>
                <div className="col-span-3 text-center">重量</div>
                <div className="col-span-2 text-center">次數</div>
                <div className="col-span-2 text-right">完成</div>
              </div>
              {ex.sets.map((s, setIdx) => {
                const isPR = Number(s.weight) > ex.prevWeight;
                return (
                  <div key={setIdx} className="grid grid-cols-12 gap-2 items-center mb-2">
                    <div className="col-span-2 text-sm" style={{ ...display, color: COLORS.textDim }}>{setIdx + 1}</div>
                    <div className="col-span-3 text-xs" style={{ ...body, color: COLORS.textFaint }}>
                      {ex.prevWeight > 0 ? `${ex.prevWeight}kg×${ex.prevReps}` : "—"}
                    </div>
                    <div className="col-span-3">
                      <div className="relative">
                        <input
                          type="number"
                          value={s.weight}
                          onChange={(e) => onUpdateSet(exIdx, setIdx, "weight", e.target.value)}
                          className="w-full text-center rounded-lg py-1.5 text-sm"
                          style={{ background: COLORS.surfaceElevated, color: isPR ? COLORS.lime : COLORS.text, border: `1px solid ${isPR ? COLORS.lime : COLORS.borderSoft}`, ...display }}
                        />
                        {isPR && (
                          <span
                            className="absolute -top-2 -right-1.5 text-[9px] px-1 rounded"
                            style={{ background: COLORS.lime, color: "#14151B", ...display, fontWeight: 700 }}
                          >
                            PR
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        value={s.reps}
                        onChange={(e) => onUpdateSet(exIdx, setIdx, "reps", e.target.value)}
                        className="w-full text-center rounded-lg py-1.5 text-sm"
                        style={{ background: COLORS.surfaceElevated, color: COLORS.text, border: `1px solid ${COLORS.borderSoft}`, ...display }}
                      />
                    </div>
                    <div className="col-span-2 flex justify-end">
                      <button
                        onClick={() => onToggleSet(exIdx, setIdx)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: s.done ? COLORS.lime : COLORS.surfaceElevated, border: `1px solid ${s.done ? COLORS.lime : COLORS.borderSoft}` }}
                      >
                        <Check size={16} color={s.done ? "#14151B" : COLORS.textFaint} strokeWidth={3} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <button
          onClick={onFinish}
          disabled={doneSets === 0 || finishing}
          className="w-full rounded-2xl py-4 mt-2 mb-4 flex items-center justify-center gap-2"
          style={{ background: doneSets > 0 ? COLORS.accent : COLORS.surfaceElevated, color: doneSets > 0 ? "#fff" : COLORS.textFaint }}
        >
          {finishing && <Loader2 size={16} className="animate-spin" />}
          <span style={{ ...display, fontWeight: 700, fontSize: "16px" }}>{finishing ? "儲存中…" : "完成訓練"}</span>
        </button>
      </div>

      {restSeconds !== null && (
        <div
          className="shrink-0 mx-5 rounded-2xl p-3 flex items-center justify-between"
          style={{ background: COLORS.accentSoft, border: `1px solid ${COLORS.accent}`, marginBottom: "calc(12px + env(safe-area-inset-bottom))" }}
        >
          <div className="flex items-center gap-2">
            <Clock size={16} color={COLORS.accent} />
            <span className="text-sm" style={{ ...body, color: COLORS.text }}>組間休息</span>
          </div>
          <div style={{ ...display, color: COLORS.text, fontWeight: 700, fontSize: "18px" }}>{fmtTime(restSeconds)}</div>
          <div className="flex items-center gap-2">
            <button onClick={onAddRest} className="text-xs px-2 py-1 rounded-lg" style={{ background: COLORS.surfaceElevated, color: COLORS.textDim, ...body }}>+15s</button>
            <button onClick={onSkipRest} className="text-xs px-2 py-1 rounded-lg" style={{ background: COLORS.surfaceElevated, color: COLORS.textDim, ...body }}>跳過</button>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryModal({ summary, onDone }) {
  const [sharing, setSharing] = useState(false);

  const handleShare = async () => {
    setSharing(true);
    try {
      await shareCard({
        title: "訓練完成！",
        subtitle: new Date().toLocaleDateString("zh-TW", { month: "long", day: "numeric" }),
        stats: [
          { label: "訓練時間", value: summary.duration },
          { label: "總訓練量 (kg)", value: summary.volume.toLocaleString() },
          ...(summary.prCount > 0 ? [{ label: "創造新紀錄", value: `${summary.prCount} 項`, accent: true }] : []),
        ],
        textFallback: `完成訓練！總訓練量 ${summary.volume.toLocaleString()} kg`,
        filename: "workout-summary.png",
      });
    } catch (e) {
      // 使用者取消或裝置不支援，靜默即可
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center px-6" style={{ background: "rgba(0,0,0,0.55)" }}>
      <div className="w-full rounded-2xl p-6" style={{ maxWidth: "360px", background: COLORS.surface, border: `1px solid ${COLORS.borderSoft}` }}>
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: COLORS.limeSoft }}>
            <Trophy size={26} color={COLORS.lime} />
          </div>
        </div>
        <div className="text-center text-xl mb-1" style={{ ...display, color: COLORS.text, fontWeight: 700 }}>訓練完成</div>
        <div className="text-center text-sm mb-5" style={{ ...body, color: COLORS.textDim }}>
          {summary.prCount > 0 ? `太棒了,創造了 ${summary.prCount} 項新紀錄` : "做得好,繼續保持"}
        </div>
        <div className="flex justify-between mb-4">
          <div className="text-center flex-1">
            <div style={{ ...display, color: COLORS.text, fontWeight: 700, fontSize: "20px" }}>{summary.duration}</div>
            <div className="text-xs" style={{ ...body, color: COLORS.textFaint }}>訓練時間</div>
          </div>
          <div className="text-center flex-1">
            <div style={{ ...display, color: COLORS.text, fontWeight: 700, fontSize: "20px" }}>{summary.volume.toLocaleString()}</div>
            <div className="text-xs" style={{ ...body, color: COLORS.textFaint }}>總訓練量 kg</div>
          </div>
          <div className="text-center flex-1">
            <div style={{ ...display, color: COLORS.text, fontWeight: 700, fontSize: "20px" }}>{summary.sets}</div>
            <div className="text-xs" style={{ ...body, color: COLORS.textFaint }}>完成組數</div>
          </div>
        </div>
        {summary.heartRate && (
          <div className="flex items-center justify-center gap-1.5 mb-5 text-sm" style={{ ...body, color: COLORS.textDim }}>
            <Heart size={14} color={COLORS.danger} fill={COLORS.danger} />
            平均心率 {summary.heartRate.avg} bpm · 最高 {summary.heartRate.max} bpm
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={handleShare}
            disabled={sharing}
            className="flex-1 rounded-2xl py-3.5 flex items-center justify-center gap-2"
            style={{ background: COLORS.surfaceElevated, color: COLORS.text }}
          >
            {sharing ? <Loader2 size={16} className="animate-spin" /> : <Share2 size={16} />}
            <span style={{ ...display, fontWeight: 700 }}>分享</span>
          </button>
          <button onClick={onDone} className="flex-1 rounded-2xl py-3.5" style={{ background: COLORS.accent, color: "#fff" }}>
            <span style={{ ...display, fontWeight: 700 }}>完成</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- App 主體 ----------------------------- */

export default function App() {
  const [sessionLoading, setSessionLoading] = useState(true);
  const [session, setSession] = useState(null);

  const [dataLoading, setDataLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  const [profile, setProfile] = useState(null);
  const [routines, setRoutines] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [recent, setRecent] = useState([]);
  const [streak, setStreak] = useState(0);
  const [weekVolume, setWeekVolume] = useState(0);
  const [weekWorkouts, setWeekWorkouts] = useState(0);
  const [volumeTrend, setVolumeTrend] = useState([]);
  const [personalRecords, setPersonalRecords] = useState([]);
  const [allTimeStats, setAllTimeStats] = useState({ totalWorkouts: 0, totalVolume: 0 });

  const [bodyMetrics, setBodyMetrics] = useState([]);
  const [bodyMetricSaving, setBodyMetricSaving] = useState(false);
  const [nutritionDate, setNutritionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [nutritionLogs, setNutritionLogs] = useState([]);
  const [nutritionSaving, setNutritionSaving] = useState(false);

  const [tab, setTab] = useState("home");
  const [activeWorkout, setActiveWorkout] = useState(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [restSeconds, setRestSeconds] = useState(null);
  const [summary, setSummary] = useState(null);
  const [finishing, setFinishing] = useState(false);

  const [hrConnection, setHrConnection] = useState(null); // { deviceName, disconnect }
  const [hrCurrent, setHrCurrent] = useState(null);
  const [hrReadings, setHrReadings] = useState([]);
  const [hrError, setHrError] = useState(null);
  const [hrConnecting, setHrConnecting] = useState(false);

  const startTimeRef = useRef(null);

  // 監聽登入狀態
  useEffect(() => {
    getSession().then((s) => {
      setSession(s);
      setSessionLoading(false);
    });
    const unsubscribe = onAuthStateChange((s) => setSession(s));
    return unsubscribe;
  }, []);

  const loadAllData = useCallback(async () => {
    setDataLoading(true);
    setErrorMsg(null);
    try {
      let r = await listRoutines();
      if (r.length === 0) {
        await seedDefaultRoutines();
        r = await listRoutines();
      }
      const [recentW, weekStats, streakVal, trend, prs, prof, allTime, exerciseList, metrics, todayNutrition] = await Promise.all([
        listRecentWorkouts(5),
        getThisWeekStats(),
        getStreak(),
        getVolumeTrend(7),
        getPersonalRecords(10),
        getProfile(),
        getAllTimeStats(),
        listExercises(),
        listBodyMetrics(60),
        listNutritionLogs(new Date().toISOString().slice(0, 10)),
      ]);
      setRoutines(r);
      setRecent(recentW);
      setWeekVolume(weekStats.weekVolume);
      setWeekWorkouts(weekStats.weekWorkouts);
      setStreak(streakVal);
      setVolumeTrend(trend);
      setPersonalRecords(prs);
      setProfile(prof);
      setAllTimeStats(allTime);
      setExercises(exerciseList);
      setBodyMetrics(metrics);
      setNutritionLogs(todayNutrition);
    } catch (e) {
      setErrorMsg(e.message || "資料載入失敗,請檢查網路連線");
    } finally {
      setDataLoading(false);
    }
  }, []);

  const refreshRoutines = useCallback(async () => {
    try {
      const r = await listRoutines();
      setRoutines(r);
    } catch (e) {
      setErrorMsg(e.message || "課表載入失敗");
    }
  }, []);

  const refreshExercises = useCallback(async () => {
    try {
      setExercises(await listExercises());
    } catch (e) {
      setErrorMsg(e.message || "動作庫載入失敗");
    }
  }, []);

  const handleCreateExercise = async (data) => {
    setErrorMsg(null);
    await createCustomExercise(data);
    await refreshExercises();
  };

  const handleUpdateExercise = async (exerciseId, data) => {
    setErrorMsg(null);
    await updateExercise(exerciseId, data);
    await refreshExercises();
  };

  const handleDeleteExercise = async (exerciseId) => {
    setErrorMsg(null);
    await deleteExercise(exerciseId);
    await refreshExercises();
  };

  const refreshBodyMetrics = useCallback(async () => {
    try {
      setBodyMetrics(await listBodyMetrics(60));
    } catch (e) {
      setErrorMsg(e.message || "體態紀錄載入失敗");
    }
  }, []);

  const refreshNutrition = useCallback(async (date) => {
    try {
      setNutritionLogs(await listNutritionLogs(date));
    } catch (e) {
      setErrorMsg(e.message || "營養紀錄載入失敗");
    }
  }, []);

  const handleChangeNutritionDate = (date) => {
    setNutritionDate(date);
    refreshNutrition(date);
  };

  const handleSaveBodyMetric = async ({ weight, bodyFat, muscleMass, visceralFat, note, photoFile, date }) => {
    setBodyMetricSaving(true);
    setErrorMsg(null);
    try {
      const recordedAt = date || new Date().toISOString().slice(0, 10);
      let photoPath;
      if (photoFile) photoPath = await uploadBodyPhoto(photoFile, recordedAt);
      await upsertBodyMetric({
        recordedAt,
        weightKg: weight ? Number(weight) : null,
        bodyFatPct: bodyFat ? Number(bodyFat) : null,
        muscleMassKg: muscleMass ? Number(muscleMass) : null,
        visceralFatLevel: visceralFat ? Number(visceralFat) : null,
        note,
        photoPath,
      });
      await refreshBodyMetrics();
      return true;
    } catch (e) {
      setErrorMsg(e.message || "儲存體態紀錄失敗");
      return false;
    } finally {
      setBodyMetricSaving(false);
    }
  };

  const handleDeleteBodyMetric = async (id) => {
    if (!window.confirm("確定要刪除這筆體態紀錄嗎？照片也會一併移除。")) return;
    setErrorMsg(null);
    try {
      await deleteBodyMetric(id);
      await refreshBodyMetrics();
    } catch (e) {
      setErrorMsg(e.message || "刪除失敗,請再試一次");
    }
  };

  const handleAddNutrition = async ({ meal, calories, protein, carbs, fat }) => {
    setNutritionSaving(true);
    setErrorMsg(null);
    try {
      await addNutritionEntry({
        loggedAt: nutritionDate,
        meal,
        calories: calories ? Number(calories) : 0,
        proteinG: protein ? Number(protein) : 0,
        carbsG: carbs ? Number(carbs) : 0,
        fatG: fat ? Number(fat) : 0,
      });
      await refreshNutrition(nutritionDate);
      return true;
    } catch (e) {
      setErrorMsg(e.message || "新增飲食紀錄失敗");
      return false;
    } finally {
      setNutritionSaving(false);
    }
  };

  const handleDeleteNutrition = async (id) => {
    setErrorMsg(null);
    try {
      await deleteNutritionEntry(id);
      await refreshNutrition(nutritionDate);
    } catch (e) {
      setErrorMsg(e.message || "刪除失敗,請再試一次");
    }
  };

  const handleConnectHeartRate = async () => {
    setHrError(null);
    setHrConnecting(true);
    try {
      const conn = await connectHeartRateMonitor((bpm) => {
        setHrCurrent(bpm);
        setHrReadings((r) => [...r, bpm]);
      });
      setHrConnection(conn);
    } catch (e) {
      if (e.name !== "NotFoundError") setHrError(e.message || "連接心率裝置失敗");
    } finally {
      setHrConnecting(false);
    }
  };

  const disconnectHeartRate = useCallback(() => {
    if (hrConnection) hrConnection.disconnect();
    setHrConnection(null);
    setHrCurrent(null);
    setHrReadings([]);
  }, [hrConnection]);

  useEffect(() => {
    if (session) loadAllData();
  }, [session, loadAllData]);

  // 訓練中計時
  useEffect(() => {
    if (!activeWorkout) return;
    startTimeRef.current = Date.now();
    const t = setInterval(() => setElapsedSec(Math.floor((Date.now() - startTimeRef.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, [activeWorkout]);

  // 組間休息倒數
  useEffect(() => {
    if (restSeconds === null) return;
    if (restSeconds <= 0) { setRestSeconds(null); return; }
    const t = setTimeout(() => setRestSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [restSeconds]);

  const handleStartWorkout = async (routine) => {
    setErrorMsg(null);
    try {
      const w = await startWorkoutApi({ routineId: routine.id, routineName: routine.name });
      const prMap = await getPersonalRecordsMap();
      const exercises = [...routine.routine_exercises]
        .sort((a, b) => a.position - b.position)
        .map((re) => {
          const pr = prMap[re.exercise.id];
          const prevWeight = pr ? pr.weight : 0;
          const prevReps = pr ? pr.reps : re.target_reps;
          return {
            id: re.exercise.id,
            name: re.exercise.name,
            prevWeight,
            prevReps,
            sets: Array.from({ length: re.target_sets }, () => ({
              weight: prevWeight || re.target_reps ? prevWeight : "",
              reps: prevReps,
              done: false,
            })),
          };
        });
      setElapsedSec(0);
      setActiveWorkout({ workoutId: w.id, routine, exercises });
    } catch (e) {
      setErrorMsg(e.message || "無法開始訓練,請再試一次");
    }
  };

  const handleAddTemplate = async (template) => {
    setErrorMsg(null);
    try {
      const byName = Object.fromEntries(exercises.map((e) => [e.name, e.id]));
      const matched = template.exerciseNames.filter((n) => byName[n]);
      if (matched.length === 0) throw new Error("找不到對應的動作,請確認動作庫是否已匯入");
      await createRoutine({
        name: template.name,
        tag: template.tag,
        estMinutes: template.estMinutes,
        exercises: matched.map((n) => ({ exerciseId: byName[n], targetSets: 3, targetReps: 8 })),
      });
      await refreshRoutines();
    } catch (e) {
      setErrorMsg(e.message || "加入範本失敗,請再試一次");
    }
  };

  const handleCreateRoutine = async (data) => {
    setErrorMsg(null);
    try {
      await createRoutine({ name: data.name, tag: data.tag, estMinutes: data.estMinutes, exercises: data.exercises });
      await refreshRoutines();
      return true;
    } catch (e) {
      setErrorMsg(e.message || "建立課表失敗,請再試一次");
      return false;
    }
  };

  const handleUpdateRoutine = async (data) => {
    setErrorMsg(null);
    try {
      await updateRoutine({ routineId: data.routineId, name: data.name, tag: data.tag, estMinutes: data.estMinutes, exercises: data.exercises });
      await refreshRoutines();
      return true;
    } catch (e) {
      setErrorMsg(e.message || "更新課表失敗,請再試一次");
      return false;
    }
  };

  const handleDeleteRoutine = async (routineId) => {
    setErrorMsg(null);
    try {
      await deleteRoutine(routineId);
      await refreshRoutines();
    } catch (e) {
      setErrorMsg(e.message || "刪除課表失敗,請再試一次");
    }
  };

  const handleCreateBackfill = async (data) => {
    setErrorMsg(null);
    try {
      await createBackfilledWorkout(data);
      await loadAllData(); // 補填會影響連續天數、本週數據、最近訓練、個人紀錄,直接整批重新載入
      return true;
    } catch (e) {
      setErrorMsg(e.message || "補填訓練紀錄失敗,請再試一次");
      return false;
    }
  };

  const updateSet = (exIdx, setIdx, field, value) => {
    setActiveWorkout((w) => {
      const exercises = w.exercises.map((ex, i) => {
        if (i !== exIdx) return ex;
        const sets = ex.sets.map((s, j) => (j === setIdx ? { ...s, [field]: value } : s));
        return { ...ex, sets };
      });
      return { ...w, exercises };
    });
  };

  const toggleSet = (exIdx, setIdx) => {
    const ex = activeWorkout.exercises[exIdx];
    const s = ex.sets[setIdx];
    const newDone = !s.done;

    setActiveWorkout((w) => {
      const exercises = w.exercises.map((e, i) => {
        if (i !== exIdx) return e;
        const sets = e.sets.map((set, j) => (j === setIdx ? { ...set, done: newDone } : set));
        return { ...e, sets };
      });
      return { ...w, exercises };
    });

    upsertSetApi({
      workoutId: activeWorkout.workoutId,
      exerciseId: ex.id,
      exerciseName: ex.name,
      setNumber: setIdx + 1,
      weight: Number(s.weight) || 0,
      reps: Number(s.reps) || 0,
      done: newDone,
      isPr: Number(s.weight) > ex.prevWeight,
    }).catch((e) => setErrorMsg(e.message || "同步這組紀錄時發生問題,但不影響繼續訓練"));

    if (newDone) setRestSeconds(90);
  };

  const finishWorkout = async () => {
    let volume = 0, sets = 0, prCount = 0;
    activeWorkout.exercises.forEach((ex) => {
      ex.sets.forEach((s) => {
        if (s.done) {
          volume += Number(s.weight) * Number(s.reps);
          sets += 1;
          if (Number(s.weight) > ex.prevWeight) prCount += 1;
        }
      });
    });
    const mins = Math.max(1, Math.round(elapsedSec / 60));
    setFinishing(true);
    setErrorMsg(null);
    try {
      const heartRate = hrReadings.length
        ? { avg: Math.round(hrReadings.reduce((a, b) => a + b, 0) / hrReadings.length), max: Math.max(...hrReadings) }
        : null;
      await finishWorkoutApi({ workoutId: activeWorkout.workoutId, durationSeconds: elapsedSec, heartRate });
      setSummary({ duration: `${mins} 分鐘`, volume, sets, prCount, heartRate });
      setRestSeconds(null);
      disconnectHeartRate();
    } catch (e) {
      setErrorMsg(e.message || "訓練儲存失敗,請檢查網路連線後再試一次");
    } finally {
      setFinishing(false);
    }
  };

  const closeSummary = () => {
    setSummary(null);
    setActiveWorkout(null);
    setTab("home");
    loadAllData();
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (e) {
      setErrorMsg(e.message);
    }
  };

  if (sessionLoading) return <LoadingScreen />;
  if (!session) return <AuthScreen />;

  return (
    <div className="w-full flex justify-center" style={{ background: "#0A0A0D", minHeight: "100dvh" }}>
      <div className="w-full flex flex-col relative" style={{ maxWidth: "480px", minHeight: "100dvh", background: COLORS.bg }}>
        <div className="flex-1 overflow-hidden relative" style={{ paddingTop: activeWorkout ? 0 : "env(safe-area-inset-top)" }}>
          {dataLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 size={24} color={COLORS.accent} className="animate-spin" />
            </div>
          ) : activeWorkout ? (
            <ActiveWorkout
              workout={activeWorkout}
              onUpdateSet={updateSet}
              onToggleSet={toggleSet}
              onFinish={finishWorkout}
              onCancel={() => { disconnectHeartRate(); setActiveWorkout(null); }}
              elapsedSec={elapsedSec}
              restSeconds={restSeconds}
              onSkipRest={() => setRestSeconds(null)}
              onAddRest={() => setRestSeconds((s) => (s || 0) + 15)}
              finishing={finishing}
              hrSupported={isBluetoothSupported()}
              hrConnection={hrConnection}
              hrCurrent={hrCurrent}
              hrConnecting={hrConnecting}
              hrError={hrError}
              onConnectHeartRate={handleConnectHeartRate}
              onDisconnectHeartRate={disconnectHeartRate}
            />
          ) : (
            <div className="h-full overflow-y-auto">
              <ErrorBanner message={errorMsg} onDismiss={() => setErrorMsg(null)} />
              {tab === "home" && (
                <HomeScreen profile={profile} recent={recent} streak={streak} weekVolume={weekVolume} weekWorkouts={weekWorkouts} goToTrain={() => setTab("train")} />
              )}
              {tab === "train" && (
                <TrainScreen
                  routines={routines}
                  exercises={exercises}
                  onStart={handleStartWorkout}
                  onAddTemplate={handleAddTemplate}
                  onCreateRoutine={handleCreateRoutine}
                  onUpdateRoutine={handleUpdateRoutine}
                  onDeleteRoutine={handleDeleteRoutine}
                  onCreateBackfill={handleCreateBackfill}
                  onCreateExercise={handleCreateExercise}
                  onUpdateExercise={handleUpdateExercise}
                  onDeleteExercise={handleDeleteExercise}
                />
              )}
              {tab === "progress" && (
                <ProgressPanels
                  volumeTrend={volumeTrend}
                  personalRecords={personalRecords}
                  weekVolume={weekVolume}
                  bodyMetrics={bodyMetrics}
                  onSaveBodyMetric={handleSaveBodyMetric}
                  onDeleteBodyMetric={handleDeleteBodyMetric}
                  bodyMetricSaving={bodyMetricSaving}
                  nutritionDate={nutritionDate}
                  onChangeNutritionDate={handleChangeNutritionDate}
                  nutritionLogs={nutritionLogs}
                  onAddNutrition={handleAddNutrition}
                  onDeleteNutrition={handleDeleteNutrition}
                  onUpdateNutrition={updateNutritionEntry}
                  nutritionSaving={nutritionSaving}
                />
              )}
              {tab === "me" && <MeScreen profile={profile} allTimeStats={allTimeStats} onSignOut={handleSignOut} />}
            </div>
          )}

          {summary && <SummaryModal summary={summary} onDone={closeSummary} />}
        </div>

        {!activeWorkout && !dataLoading && <BottomNav tab={tab} setTab={setTab} />}
      </div>
    </div>
  );
}
