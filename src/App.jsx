import { useState, useEffect, useRef } from "react";
import { Flame, Dumbbell, TrendingUp, User, Home, Play, Check, Clock, Trophy, ChevronRight, ArrowLeft, Bell, Ruler, Download, Info } from "lucide-react";

const COLORS = {
  bg: "#14151B",
  surface: "#1D1F27",
  surfaceElevated: "#262936",
  border: "#333645",
  borderSoft: "#2A2C36",
  text: "#F3F2EE",
  textDim: "#92939F",
  textFaint: "#5A5C68",
  accent: "#4F5EFF",
  accentSoft: "#23264A",
  lime: "#B8FF3D",
  limeSoft: "#2A3417",
  danger: "#FF5D5D",
};

const display = { fontFamily: "'Space Grotesk', sans-serif" };
const body = { fontFamily: "'Inter', sans-serif" };

const ROUTINES = [
  {
    id: 1,
    name: "推力訓練日",
    tag: "胸 / 肩 / 三頭肌",
    estTime: "45 分鐘",
    exercises: [
      { name: "槓鈴臥推", prevWeight: 60, prevReps: 8 },
      { name: "肩推", prevWeight: 35, prevReps: 8 },
      { name: "上斜啞鈴推舉", prevWeight: 22, prevReps: 10 },
      { name: "三頭下拉", prevWeight: 25, prevReps: 12 },
    ],
  },
  {
    id: 2,
    name: "拉力訓練日",
    tag: "背 / 二頭肌",
    estTime: "50 分鐘",
    exercises: [
      { name: "硬舉", prevWeight: 100, prevReps: 5 },
      { name: "槓鈴划船", prevWeight: 55, prevReps: 8 },
      { name: "滑輪下拉", prevWeight: 45, prevReps: 10 },
      { name: "二頭彎舉", prevWeight: 14, prevReps: 12 },
    ],
  },
  {
    id: 3,
    name: "腿部訓練日",
    tag: "股四頭肌 / 後側鏈",
    estTime: "55 分鐘",
    exercises: [
      { name: "深蹲", prevWeight: 80, prevReps: 6 },
      { name: "腿推", prevWeight: 120, prevReps: 10 },
      { name: "羅馬尼亞硬舉", prevWeight: 60, prevReps: 8 },
      { name: "提踵", prevWeight: 40, prevReps: 15 },
    ],
  },
];

const VOLUME_TREND = [
  { label: "W1", volume: 9800 },
  { label: "W2", volume: 10500 },
  { label: "W3", volume: 9200 },
  { label: "W4", volume: 11800 },
  { label: "W5", volume: 12100 },
  { label: "W6", volume: 11400 },
  { label: "W7", volume: 12450 },
];

const PR_LIST = [
  { exercise: "深蹲", weight: "85 kg", date: "8月27日" },
  { exercise: "硬舉", weight: "105 kg", date: "8月20日" },
  { exercise: "臥推", weight: "65 kg", date: "8月15日" },
];

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

function HomeScreen({ recent, streak, weekVolume, weekWorkouts, goToTrain }) {
  return (
    <div className="px-5 pb-6">
      <div className="pt-2 pb-5">
        <div className="text-sm" style={{ ...body, color: COLORS.textDim }}>8 月 31 日 · 星期一</div>
        <div className="text-2xl mt-1" style={{ ...display, color: COLORS.text, fontWeight: 700 }}>早安,阿明</div>
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
      </div>

      <div className="flex gap-3 mb-5">
        <StatCard label="本週訓練量" value={weekVolume.toLocaleString() + " kg"} icon={TrendingUp} accentColor={COLORS.accent} />
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
      <div className="flex flex-col gap-3">
        {recent.map((w) => (
          <div key={w.id} className="rounded-2xl p-4 flex items-center justify-between" style={{ background: COLORS.surface, border: `1px solid ${COLORS.borderSoft}` }}>
            <div>
              <div style={{ ...body, color: COLORS.text, fontWeight: 600 }}>{w.routineName}</div>
              <div className="text-xs mt-1 flex items-center gap-2" style={{ ...body, color: COLORS.textFaint }}>
                <span>{w.date}</span>
                <span>·</span>
                <span>{w.duration}</span>
              </div>
            </div>
            <div className="text-right">
              <div style={{ ...display, color: COLORS.text, fontWeight: 700 }}>{w.volume.toLocaleString()}</div>
              <div className="text-xs" style={{ ...body, color: COLORS.textFaint }}>kg 總量</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrainScreen({ onStart }) {
  return (
    <div className="px-5 pb-6">
      <div className="pt-2 pb-5">
        <div className="text-2xl" style={{ ...display, color: COLORS.text, fontWeight: 700 }}>選擇課表</div>
        <div className="text-sm mt-1" style={{ ...body, color: COLORS.textDim }}>挑一份課表,開始記錄今天的訓練</div>
      </div>
      <div className="flex flex-col gap-3">
        {ROUTINES.map((r) => (
          <div key={r.id} className="rounded-2xl p-4" style={{ background: COLORS.surface, border: `1px solid ${COLORS.borderSoft}` }}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <div style={{ ...display, color: COLORS.text, fontWeight: 700, fontSize: "17px" }}>{r.name}</div>
                <div className="text-xs mt-1" style={{ ...body, color: COLORS.textDim }}>{r.tag}</div>
              </div>
              <div className="flex items-center gap-1 text-xs" style={{ ...body, color: COLORS.textFaint }}>
                <Clock size={13} />
                <span>{r.estTime}</span>
              </div>
            </div>
            <div className="text-xs mb-4" style={{ ...body, color: COLORS.textFaint }}>
              {r.exercises.map((e) => e.name).join(" · ")}
            </div>
            <button
              onClick={() => onStart(r)}
              className="w-full rounded-xl py-3 flex items-center justify-center gap-2"
              style={{ background: COLORS.accentSoft, color: COLORS.accent }}
            >
              <Play size={15} fill={COLORS.accent} />
              <span style={{ ...body, fontWeight: 600, fontSize: "14px" }}>開始訓練</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function VolumeChart() {
  const w = 280, h = 110, pad = 10;
  const max = Math.max(...VOLUME_TREND.map((d) => d.volume));
  const min = Math.min(...VOLUME_TREND.map((d) => d.volume));
  const range = max - min || 1;
  const step = (w - pad * 2) / (VOLUME_TREND.length - 1);
  const points = VOLUME_TREND.map((d, i) => {
    const x = pad + i * step;
    const y = h - pad - ((d.volume - min) / range) * (h - pad * 2);
    return { x, y, ...d };
  });
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaD = `${pathD} L${points[points.length - 1].x},${h} L${points[0].x},${h} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="volFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={COLORS.accent} stopOpacity="0.35" />
          <stop offset="100%" stopColor={COLORS.accent} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#volFill)" />
      <path d={pathD} fill="none" stroke={COLORS.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={i === points.length - 1 ? 4 : 2.5} fill={i === points.length - 1 ? COLORS.lime : COLORS.accent} />
      ))}
    </svg>
  );
}

function ProgressScreen() {
  return (
    <div className="px-5 pb-6">
      <div className="pt-2 pb-5">
        <div className="text-2xl" style={{ ...display, color: COLORS.text, fontWeight: 700 }}>你的進度</div>
        <div className="text-sm mt-1" style={{ ...body, color: COLORS.textDim }}>過去 7 週的訓練趨勢</div>
      </div>

      <div className="rounded-2xl p-4 mb-3" style={{ background: COLORS.surface, border: `1px solid ${COLORS.borderSoft}` }}>
        <div className="flex items-end justify-between mb-2">
          <div>
            <div className="text-xs" style={{ ...body, color: COLORS.textDim }}>本週訓練量</div>
            <div className="text-2xl" style={{ ...display, color: COLORS.text, fontWeight: 700 }}>12,450 kg</div>
          </div>
          <div className="text-xs px-2 py-1 rounded-full" style={{ background: COLORS.limeSoft, color: COLORS.lime, ...body, fontWeight: 600 }}>
            +9% 較上週
          </div>
        </div>
        <VolumeChart />
        <div className="flex justify-between mt-1">
          {VOLUME_TREND.map((d) => (
            <span key={d.label} className="text-xs" style={{ ...body, color: COLORS.textFaint }}>{d.label}</span>
          ))}
        </div>
      </div>

      <div className="text-sm mb-3" style={{ ...body, color: COLORS.textDim, fontWeight: 600 }}>個人紀錄</div>
      <div className="flex flex-col gap-3">
        {PR_LIST.map((p, i) => (
          <div key={i} className="rounded-2xl p-4 flex items-center justify-between" style={{ background: COLORS.surface, border: `1px solid ${COLORS.borderSoft}` }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: COLORS.limeSoft }}>
                <Trophy size={16} color={COLORS.lime} />
              </div>
              <div>
                <div style={{ ...body, color: COLORS.text, fontWeight: 600 }}>{p.exercise}</div>
                <div className="text-xs" style={{ ...body, color: COLORS.textFaint }}>{p.date}</div>
              </div>
            </div>
            <div style={{ ...display, color: COLORS.text, fontWeight: 700 }}>{p.weight}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MeScreen() {
  const rows = [
    { icon: Bell, label: "提醒通知" },
    { icon: Ruler, label: "單位設定", value: "公斤 (kg)" },
    { icon: Download, label: "匯出資料" },
    { icon: Info, label: "關於這個 APP" },
  ];
  return (
    <div className="px-5 pb-6">
      <div className="pt-2 pb-5 flex items-center gap-4">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: COLORS.accentSoft, color: COLORS.accent, ...display, fontWeight: 700, fontSize: "22px" }}
        >
          阿
        </div>
        <div>
          <div className="text-xl" style={{ ...display, color: COLORS.text, fontWeight: 700 }}>阿明</div>
          <div className="text-xs" style={{ ...body, color: COLORS.textFaint }}>加入於 2025 年 3 月</div>
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        <StatCard label="總訓練次數" value="86" icon={Dumbbell} />
        <StatCard label="累積訓練量" value="642t" icon={TrendingUp} accentColor={COLORS.accent} />
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: COLORS.surface, border: `1px solid ${COLORS.borderSoft}` }}>
        {rows.map((r, i) => {
          const Icon = r.icon;
          return (
            <div
              key={i}
              className="flex items-center justify-between px-4 py-3.5"
              style={{ borderBottom: i < rows.length - 1 ? `1px solid ${COLORS.borderSoft}` : "none" }}
            >
              <div className="flex items-center gap-3">
                <Icon size={17} color={COLORS.textDim} />
                <span style={{ ...body, color: COLORS.text }}>{r.label}</span>
              </div>
              <div className="flex items-center gap-2">
                {r.value && <span className="text-sm" style={{ ...body, color: COLORS.textFaint }}>{r.value}</span>}
                <ChevronRight size={16} color={COLORS.textFaint} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ActiveWorkout({ workout, onUpdateSet, onToggleSet, onFinish, onCancel, elapsedSec, restSeconds, onSkipRest, onAddRest }) {
  const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const totalSets = workout.exercises.reduce((a, e) => a + e.sets.length, 0);
  const doneSets = workout.exercises.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0);

  // 訓練進行中保持螢幕喚醒,避免組間休息時螢幕自動關閉
  useEffect(() => {
    let wakeLock = null;
    const requestWakeLock = async () => {
      try {
        if ("wakeLock" in navigator) {
          wakeLock = await navigator.wakeLock.request("screen");
        }
      } catch (err) {
        // 部分瀏覽器 / 情境(如背景分頁)會拒絕請求,靜默失敗即可
      }
    };
    requestWakeLock();
    return () => {
      if (wakeLock) wakeLock.release().catch(() => {});
    };
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
                    <div className="col-span-3 text-xs" style={{ ...body, color: COLORS.textFaint }}>{ex.prevWeight}kg×{ex.prevReps}</div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        value={s.weight}
                        onChange={(e) => onUpdateSet(exIdx, setIdx, "weight", e.target.value)}
                        className="w-full text-center rounded-lg py-1.5 text-sm"
                        style={{ background: COLORS.surfaceElevated, color: isPR ? COLORS.lime : COLORS.text, border: `1px solid ${isPR ? COLORS.lime : COLORS.borderSoft}`, ...display }}
                      />
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
          className="w-full rounded-2xl py-4 mt-2 mb-4"
          style={{ background: doneSets > 0 ? COLORS.accent : COLORS.surfaceElevated, color: doneSets > 0 ? "#fff" : COLORS.textFaint }}
          disabled={doneSets === 0}
        >
          <span style={{ ...display, fontWeight: 700, fontSize: "16px" }}>完成訓練</span>
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
        <div className="flex justify-between mb-6">
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
        <button onClick={onDone} className="w-full rounded-2xl py-3.5" style={{ background: COLORS.accent, color: "#fff" }}>
          <span style={{ ...display, fontWeight: 700 }}>完成</span>
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("home");
  const [activeWorkout, setActiveWorkout] = useState(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [restSeconds, setRestSeconds] = useState(null);
  const [summary, setSummary] = useState(null);
  const [streak, setStreak] = useState(12);
  const [weekVolume, setWeekVolume] = useState(12450);
  const [weekWorkouts, setWeekWorkouts] = useState(3);
  const [recent, setRecent] = useState([
    { id: 101, routineName: "拉力訓練日", date: "8月29日", duration: "52 分鐘", volume: 8420 },
    { id: 102, routineName: "腿部訓練日", date: "8月27日", duration: "58 分鐘", volume: 11200 },
    { id: 103, routineName: "推力訓練日", date: "8月25日", duration: "46 分鐘", volume: 7650 },
  ]);

  const startTimeRef = useRef(null);

  useEffect(() => {
    if (!activeWorkout) return;
    startTimeRef.current = Date.now();
    const t = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [activeWorkout]);

  useEffect(() => {
    if (restSeconds === null) return;
    if (restSeconds <= 0) {
      setRestSeconds(null);
      return;
    }
    const t = setTimeout(() => setRestSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [restSeconds]);

  const startWorkout = (routine) => {
    setElapsedSec(0);
    setActiveWorkout({
      routine,
      exercises: routine.exercises.map((e) => ({
        ...e,
        sets: [0, 1, 2].map(() => ({ weight: e.prevWeight, reps: e.prevReps, done: false })),
      })),
    });
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
    let willBeDone = false;
    setActiveWorkout((w) => {
      const exercises = w.exercises.map((ex, i) => {
        if (i !== exIdx) return ex;
        const sets = ex.sets.map((s, j) => {
          if (j !== setIdx) return s;
          willBeDone = !s.done;
          return { ...s, done: !s.done };
        });
        return { ...ex, sets };
      });
      return { ...w, exercises };
    });
    if (willBeDone) setRestSeconds(90);
  };

  const finishWorkout = () => {
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
    setSummary({ duration: `${mins} 分鐘`, volume, sets, prCount });
    setRecent((r) => [
      { id: Date.now(), routineName: activeWorkout.routine.name, date: "剛剛", duration: `${mins} 分鐘`, volume },
      ...r,
    ]);
    setWeekVolume((v) => v + volume);
    setWeekWorkouts((n) => Math.min(5, n + 1));
    setStreak((s) => s + 1);
    setRestSeconds(null);
  };

  const closeSummary = () => {
    setSummary(null);
    setActiveWorkout(null);
    setTab("home");
  };

  return (
    <div className="w-full flex justify-center" style={{ background: "#0A0A0D", minHeight: "100dvh" }}>
      <div
        className="w-full flex flex-col relative"
        style={{ maxWidth: "480px", minHeight: "100dvh", background: COLORS.bg }}
      >
        <div className="flex-1 overflow-hidden relative" style={{ paddingTop: activeWorkout ? 0 : "env(safe-area-inset-top)" }}>
          {activeWorkout ? (
            <ActiveWorkout
              workout={activeWorkout}
              onUpdateSet={updateSet}
              onToggleSet={toggleSet}
              onFinish={finishWorkout}
              onCancel={() => setActiveWorkout(null)}
              elapsedSec={elapsedSec}
              restSeconds={restSeconds}
              onSkipRest={() => setRestSeconds(null)}
              onAddRest={() => setRestSeconds((s) => (s || 0) + 15)}
            />
          ) : (
            <div className="h-full overflow-y-auto">
              {tab === "home" && (
                <HomeScreen recent={recent} streak={streak} weekVolume={weekVolume} weekWorkouts={weekWorkouts} goToTrain={() => setTab("train")} />
              )}
              {tab === "train" && <TrainScreen onStart={startWorkout} />}
              {tab === "progress" && <ProgressScreen />}
              {tab === "me" && <MeScreen />}
            </div>
          )}

          {summary && <SummaryModal summary={summary} onDone={closeSummary} />}
        </div>

        {!activeWorkout && <BottomNav tab={tab} setTab={setTab} />}
      </div>
    </div>
  );
}
