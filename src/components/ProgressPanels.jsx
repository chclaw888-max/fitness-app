import { useState, useEffect, useCallback } from "react";
import { Trophy, Plus, X, Camera, Loader2, Share2, Trash2, Image as ImageIcon, Utensils } from "lucide-react";
import { COLORS, display, body } from "../theme";
import { shareCard } from "../lib/share";
import { getBodyPhotoUrl, uploadBodyPhoto } from "../lib/api";

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
        <circle key={i} cx={p.x} cy={p.y} r={i === points.length - 1 ? 4 : 2.5} fill={i === points.length - 1 ? COLORS.lime : color} />
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

function TrainingPanel({ volumeTrend, personalRecords, weekVolume }) {
  const [sharing, setSharing] = useState(false);

  const handleShare = async () => {
    setSharing(true);
    try {
      const topPR = personalRecords[0];
      await shareCard({
        title: "本週訓練戰績",
        subtitle: new Date().toLocaleDateString("zh-TW", { month: "long", day: "numeric" }),
        stats: [
          { label: "本週訓練量 (kg)", value: Math.round(weekVolume).toLocaleString() },
          { label: "個人紀錄總數", value: String(personalRecords.length) },
          ...(topPR ? [{ label: `最新紀錄：${topPR.exercise_name}`, value: `${topPR.weight} kg`, accent: true }] : []),
        ],
        textFallback: `本週訓練量 ${Math.round(weekVolume).toLocaleString()} kg`,
        filename: "weekly-progress.png",
      });
    } catch (e) {
      // 使用者取消分享或裝置不支援，靜默即可
    } finally {
      setSharing(false);
    }
  };

  return (
    <div>
      <div className="rounded-2xl p-4 mb-3" style={{ background: COLORS.surface, border: `1px solid ${COLORS.borderSoft}` }}>
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="text-xs" style={{ ...body, color: COLORS.textDim }}>本週訓練量</div>
            <div className="text-2xl" style={{ ...display, color: COLORS.text, fontWeight: 700 }}>{Math.round(weekVolume).toLocaleString()} kg</div>
          </div>
          <button
            onClick={handleShare}
            disabled={sharing}
            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg shrink-0"
            style={{ background: COLORS.accentSoft, color: COLORS.accent, ...body, fontWeight: 600 }}
          >
            {sharing ? <Loader2 size={13} className="animate-spin" /> : <Share2 size={13} />}
            分享
          </button>
        </div>
        {volumeTrend.length > 0 ? (
          <>
            <LineChart points={volumeTrend.map((d) => ({ value: Number(d.volume) }))} />
            <div className="flex justify-between mt-1">
              {volumeTrend.map((d, i) => (
                <span key={i} className="text-xs" style={{ ...body, color: COLORS.textFaint }}>
                  {new Date(d.week_start).getMonth() + 1}/{new Date(d.week_start).getDate()}
                </span>
              ))}
            </div>
          </>
        ) : (
          <div className="text-sm text-center py-4" style={{ ...body, color: COLORS.textFaint }}>累積更多訓練後這裡會顯示趨勢圖</div>
        )}
      </div>

      <div className="text-sm mb-3" style={{ ...body, color: COLORS.textDim, fontWeight: 600 }}>個人紀錄</div>
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
  );
}

/* ----------------------------- 體態 + 照片對比 ----------------------------- */

function BodyMetricEntryForm({ onSave, onCancel, saving }) {
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [note, setNote] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
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
          onClick={() => onSave({ weight, bodyFat, note, photoFile })}
          disabled={saving}
          className="flex-1 rounded-xl py-2.5 text-sm flex items-center justify-center gap-2"
          style={{ background: COLORS.accent, color: "#fff", ...body, fontWeight: 600 }}
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          {saving ? "儲存中…" : "儲存紀錄"}
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

  const withWeight = [...bodyMetrics].filter((m) => m.weight_kg != null).reverse();
  const withPhotos = bodyMetrics.filter((m) => m.photo_path);
  const latest = bodyMetrics[0];

  return (
    <div>
      <div className="rounded-2xl p-4 mb-4" style={{ background: COLORS.surface, border: `1px solid ${COLORS.borderSoft}` }}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-xs" style={{ ...body, color: COLORS.textDim }}>目前體重</div>
            <div className="text-2xl" style={{ ...display, color: COLORS.text, fontWeight: 700 }}>
              {latest?.weight_kg ? `${latest.weight_kg} kg` : "—"}
            </div>
          </div>
          {latest?.body_fat_pct && (
            <div className="text-right">
              <div className="text-xs" style={{ ...body, color: COLORS.textDim }}>體脂率</div>
              <div style={{ ...display, color: COLORS.text, fontWeight: 700, fontSize: "18px" }}>{latest.body_fat_pct}%</div>
            </div>
          )}
        </div>
        {withWeight.length > 1 ? (
          <LineChart points={withWeight.map((m) => ({ value: Number(m.weight_kg) }))} color={COLORS.lime} />
        ) : (
          <div className="text-sm text-center py-4" style={{ ...body, color: COLORS.textFaint }}>累積更多紀錄後這裡會顯示體重趨勢</div>
        )}
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setShowForm((v) => !v)}
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
          onCancel={() => setShowForm(false)}
          onSave={async (data) => {
            const ok = await onSave(data);
            if (ok) setShowForm(false);
          }}
        />
      )}

      <div className="text-sm mb-3" style={{ ...body, color: COLORS.textDim, fontWeight: 600 }}>紀錄</div>
      {bodyMetrics.length === 0 ? (
        <div className="text-sm text-center py-6" style={{ ...body, color: COLORS.textFaint }}>還沒有體態紀錄</div>
      ) : (
        <div className="flex flex-col gap-3">
          {bodyMetrics.map((m) => (
            <div key={m.id} className="rounded-2xl p-3 flex items-center gap-3" style={{ background: COLORS.surface, border: `1px solid ${COLORS.borderSoft}` }}>
              <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0" style={{ background: COLORS.surfaceElevated }}>
                {m.photo_path ? <PhotoThumb path={m.photo_path} /> : <div className="w-full h-full flex items-center justify-center"><Camera size={14} color={COLORS.textFaint} /></div>}
              </div>
              <div className="flex-1">
                <div className="text-sm" style={{ ...body, color: COLORS.text, fontWeight: 600 }}>{fmtDate(m.recorded_at)}</div>
                <div className="text-xs" style={{ ...body, color: COLORS.textFaint }}>
                  {[m.weight_kg && `${m.weight_kg} kg`, m.body_fat_pct && `${m.body_fat_pct}%`].filter(Boolean).join(" · ") || m.note || "—"}
                </div>
              </div>
              <button onClick={() => onDelete(m.id)} style={{ color: COLORS.textFaint }}><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      )}

      {showCompare && <PhotoCompareSlider entries={bodyMetrics} onClose={() => setShowCompare(false)} />}
    </div>
  );
}

/* ----------------------------- 營養追蹤 ----------------------------- */

function NutritionPanel({ date, onChangeDate, logs, onAdd, onDelete, saving }) {
  const [showForm, setShowForm] = useState(false);
  const [meal, setMeal] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");

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
    const ok = await onAdd({ meal: meal.trim(), calories, protein, carbs, fat });
    if (ok) {
      setMeal(""); setCalories(""); setProtein(""); setCarbs(""); setFat("");
      setShowForm(false);
    }
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
          <Plus size={15} /> 記錄飲食
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
          </div>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full rounded-xl py-2.5 text-sm flex items-center justify-center gap-2"
            style={{ background: COLORS.accent, color: "#fff", ...body, fontWeight: 600 }}
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? "儲存中…" : "新增"}
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
              <button onClick={() => onDelete(l.id)} style={{ color: COLORS.textFaint }}><Trash2 size={15} /></button>
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
        <TrainingPanel volumeTrend={volumeTrend} personalRecords={personalRecords} weekVolume={weekVolume} />
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
          saving={nutritionSaving}
        />
      )}
    </div>
  );
}
