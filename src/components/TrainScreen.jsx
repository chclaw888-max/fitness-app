import { useState, useMemo } from "react";
import { Clock, Play, Plus, X, Search, Check, Pencil, Trash2, ChevronLeft, Loader2, ChevronUp, ChevronDown, CalendarPlus } from "lucide-react";
import { COLORS, display, body } from "../theme";
import { TEMPLATES } from "../lib/templates";

const inputStyle = {
  background: COLORS.surfaceElevated,
  color: COLORS.text,
  border: `1px solid ${COLORS.borderSoft}`,
  ...body,
};

/* ----------------------------- 課表列表(預設畫面) ----------------------------- */

function RoutineList({ routines, onStart, onOpenTemplates, onOpenBuilder, onOpenBackfill, onEdit, onDelete }) {
  return (
    <div className="px-5 pb-6">
      <div className="pt-2 pb-4">
        <div className="text-2xl" style={{ ...display, color: COLORS.text, fontWeight: 700 }}>選擇課表</div>
        <div className="text-sm mt-1" style={{ ...body, color: COLORS.textDim }}>挑一份課表,開始記錄今天的訓練</div>
      </div>

      <div className="flex gap-2 mb-3">
        <button
          onClick={onOpenTemplates}
          className="flex-1 rounded-xl py-3 text-sm"
          style={{ background: COLORS.surface, border: `1px solid ${COLORS.borderSoft}`, color: COLORS.text, ...body, fontWeight: 600 }}
        >
          瀏覽課表範本
        </button>
        <button
          onClick={() => onOpenBuilder(null)}
          className="flex items-center justify-center gap-1.5 rounded-xl py-3 px-4 text-sm"
          style={{ background: COLORS.accentSoft, color: COLORS.accent, ...body, fontWeight: 600 }}
        >
          <Plus size={16} />
          自訂課表
        </button>
      </div>

      <button
        onClick={onOpenBackfill}
        className="w-full flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm mb-5"
        style={{ background: "transparent", border: `1px dashed ${COLORS.borderSoft}`, color: COLORS.textDim, ...body, fontWeight: 600 }}
      >
        <CalendarPlus size={15} />
        忘記記錄了？補填某一天的訓練
      </button>

      {routines.length === 0 ? (
        <div className="text-sm text-center py-10" style={{ ...body, color: COLORS.textFaint }}>
          還沒有課表,先從範本加一份,或自己建立一份專屬課表
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {routines.map((r) => {
            const exercises = [...r.routine_exercises].sort((a, b) => a.position - b.position);
            return (
              <div key={r.id} className="rounded-2xl p-4" style={{ background: COLORS.surface, border: `1px solid ${COLORS.borderSoft}` }}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div style={{ ...display, color: COLORS.text, fontWeight: 700, fontSize: "17px" }}>{r.name}</div>
                    <div className="text-xs mt-1" style={{ ...body, color: COLORS.textDim }}>{r.tag}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    {r.est_minutes && (
                      <div className="flex items-center gap-1 text-xs mr-1" style={{ ...body, color: COLORS.textFaint }}>
                        <Clock size={13} />
                        <span>{r.est_minutes} 分鐘</span>
                      </div>
                    )}
                    <button onClick={() => onEdit(r)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ color: COLORS.textFaint }}>
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => onDelete(r)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ color: COLORS.textFaint }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="text-xs mb-4" style={{ ...body, color: COLORS.textFaint }}>
                  {exercises.map((re) => re.exercise.name).join(" · ")}
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
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ----------------------------- 範本庫 ----------------------------- */

function TemplateLibrary({ onBack, onAdd, existingNames, addingId }) {
  return (
    <div className="px-5 pb-6">
      <div className="pt-2 pb-4 flex items-center gap-3">
        <button onClick={onBack} style={{ color: COLORS.textDim }}><ChevronLeft size={22} /></button>
        <div>
          <div className="text-xl" style={{ ...display, color: COLORS.text, fontWeight: 700 }}>課表範本</div>
          <div className="text-xs mt-0.5" style={{ ...body, color: COLORS.textDim }}>挑一份加入你的課表清單,可以之後再編輯</div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {TEMPLATES.map((t) => {
          const already = existingNames.has(t.name);
          const isAdding = addingId === t.id;
          return (
            <div key={t.id} className="rounded-2xl p-4" style={{ background: COLORS.surface, border: `1px solid ${COLORS.borderSoft}` }}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div style={{ ...display, color: COLORS.text, fontWeight: 700, fontSize: "16px" }}>{t.name}</div>
                  <div className="text-xs mt-1" style={{ ...body, color: COLORS.textDim }}>{t.tag}</div>
                </div>
                <div className="flex items-center gap-1 text-xs" style={{ ...body, color: COLORS.textFaint }}>
                  <Clock size={13} />
                  <span>{t.estMinutes} 分鐘</span>
                </div>
              </div>
              <div className="text-xs mb-3" style={{ ...body, color: COLORS.textFaint }}>{t.exerciseNames.join(" · ")}</div>
              <button
                onClick={() => onAdd(t)}
                disabled={already || isAdding}
                className="w-full rounded-xl py-2.5 flex items-center justify-center gap-2"
                style={{
                  background: already ? COLORS.surfaceElevated : COLORS.accentSoft,
                  color: already ? COLORS.textFaint : COLORS.accent,
                }}
              >
                {isAdding && <Loader2 size={14} className="animate-spin" />}
                <span style={{ ...body, fontWeight: 600, fontSize: "14px" }}>
                  {already ? "已加入" : isAdding ? "加入中…" : "加入我的課表"}
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ----------------------------- 動作選擇器 ----------------------------- */

function ExercisePicker({ exercises, selectedIds, onToggle, onClose }) {
  const [query, setQuery] = useState("");
  const grouped = useMemo(() => {
    const filtered = exercises.filter((e) => e.name.toLowerCase().includes(query.toLowerCase()));
    const g = {};
    filtered.forEach((e) => {
      g[e.category] = g[e.category] || [];
      g[e.category].push(e);
    });
    return g;
  }, [exercises, query]);

  return (
    <div className="fixed inset-0 z-30 flex flex-col" style={{ background: COLORS.bg }}>
      <div className="flex items-center gap-3 px-5 shrink-0" style={{ paddingTop: "calc(14px + env(safe-area-inset-top))", paddingBottom: "12px", borderBottom: `1px solid ${COLORS.borderSoft}` }}>
        <button onClick={onClose} style={{ color: COLORS.textDim }}><X size={20} /></button>
        <div style={{ ...display, color: COLORS.text, fontWeight: 700 }}>選擇動作</div>
      </div>
      <div className="px-5 py-3 shrink-0">
        <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: COLORS.surfaceElevated, border: `1px solid ${COLORS.borderSoft}` }}>
          <Search size={15} color={COLORS.textFaint} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜尋動作名稱"
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: COLORS.text, ...body }}
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-5 pb-6">
        {Object.entries(grouped).map(([category, list]) => (
          <div key={category} className="mb-4">
            <div className="text-xs mb-2" style={{ ...body, color: COLORS.textFaint, fontWeight: 600 }}>{category}</div>
            <div className="flex flex-col gap-2">
              {list.map((ex) => {
                const selected = selectedIds.includes(ex.id);
                return (
                  <button
                    key={ex.id}
                    onClick={() => onToggle(ex)}
                    className="flex items-center justify-between rounded-xl px-4 py-3"
                    style={{ background: selected ? COLORS.accentSoft : COLORS.surface, border: `1px solid ${selected ? COLORS.accent : COLORS.borderSoft}` }}
                  >
                    <span className="text-sm" style={{ ...body, color: COLORS.text }}>{ex.name}</span>
                    {selected && <Check size={16} color={COLORS.accent} />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {Object.keys(grouped).length === 0 && (
          <div className="text-sm text-center py-10" style={{ ...body, color: COLORS.textFaint }}>找不到符合的動作</div>
        )}
      </div>
      <div className="shrink-0 px-5" style={{ paddingBottom: "calc(14px + env(safe-area-inset-bottom))" }}>
        <button onClick={onClose} className="w-full rounded-2xl py-3.5" style={{ background: COLORS.accent, color: "#fff" }}>
          <span style={{ ...display, fontWeight: 700 }}>完成({selectedIds.length})</span>
        </button>
      </div>
    </div>
  );
}

/* ----------------------------- 自訂課表編輯器 ----------------------------- */

function RoutineBuilder({ routine, exercises, onSave, onCancel, saving }) {
  const isEdit = !!routine;
  const [name, setName] = useState(routine?.name || "");
  const [tag, setTag] = useState(routine?.tag || "");
  const [estMinutes, setEstMinutes] = useState(routine?.est_minutes || 45);
  const [selected, setSelected] = useState(() => {
    if (!routine) return [];
    return [...routine.routine_exercises]
      .sort((a, b) => a.position - b.position)
      .map((re) => ({
        exerciseId: re.exercise.id,
        name: re.exercise.name,
        targetSets: re.target_sets,
        targetReps: re.target_reps,
      }));
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState(null);

  const toggleExercise = (ex) => {
    setSelected((list) => {
      const exists = list.find((s) => s.exerciseId === ex.id);
      if (exists) return list.filter((s) => s.exerciseId !== ex.id);
      return [...list, { exerciseId: ex.id, name: ex.name, targetSets: 3, targetReps: 8 }];
    });
  };

  const updateField = (idx, field, value) => {
    setSelected((list) => list.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  };

  const move = (idx, dir) => {
    setSelected((list) => {
      const next = [...list];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return list;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const remove = (idx) => setSelected((list) => list.filter((_, i) => i !== idx));

  const handleSave = () => {
    if (!name.trim()) { setError("請輸入課表名稱"); return; }
    if (selected.length === 0) { setError("至少需要一個動作"); return; }
    setError(null);
    onSave({
      routineId: routine?.id,
      name: name.trim(),
      tag: tag.trim(),
      estMinutes: Number(estMinutes) || null,
      exercises: selected.map((s) => ({ exerciseId: s.exerciseId, targetSets: Number(s.targetSets) || 3, targetReps: Number(s.targetReps) || 8 })),
    });
  };

  return (
    <div className="px-5 pb-6">
      <div className="pt-2 pb-4 flex items-center gap-3">
        <button onClick={onCancel} style={{ color: COLORS.textDim }}><ChevronLeft size={22} /></button>
        <div className="text-xl" style={{ ...display, color: COLORS.text, fontWeight: 700 }}>
          {isEdit ? "編輯課表" : "自訂課表"}
        </div>
      </div>

      <div className="flex flex-col gap-3 mb-5">
        <div>
          <label className="text-xs mb-1.5 block" style={{ ...body, color: COLORS.textDim }}>課表名稱</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：週末衝刺日" className="w-full rounded-xl px-4 py-3 text-sm" style={inputStyle} />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs mb-1.5 block" style={{ ...body, color: COLORS.textDim }}>標籤(選填)</label>
            <input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="例如：胸 / 肩" className="w-full rounded-xl px-4 py-3 text-sm" style={inputStyle} />
          </div>
          <div style={{ width: "110px" }}>
            <label className="text-xs mb-1.5 block" style={{ ...body, color: COLORS.textDim }}>預估分鐘</label>
            <input type="number" value={estMinutes} onChange={(e) => setEstMinutes(e.target.value)} className="w-full rounded-xl px-4 py-3 text-sm text-center" style={inputStyle} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className="text-sm" style={{ ...body, color: COLORS.textDim, fontWeight: 600 }}>動作清單</div>
        <button onClick={() => setPickerOpen(true)} className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg" style={{ background: COLORS.accentSoft, color: COLORS.accent, ...body, fontWeight: 600 }}>
          <Plus size={14} />
          新增動作
        </button>
      </div>

      {selected.length === 0 ? (
        <div className="text-sm text-center py-8 rounded-2xl" style={{ ...body, color: COLORS.textFaint, background: COLORS.surface, border: `1px solid ${COLORS.borderSoft}` }}>
          還沒有加入任何動作
        </div>
      ) : (
        <div className="flex flex-col gap-2 mb-5">
          {selected.map((s, idx) => (
            <div key={s.exerciseId} className="rounded-xl p-3 flex items-center gap-2" style={{ background: COLORS.surface, border: `1px solid ${COLORS.borderSoft}` }}>
              <div className="flex flex-col">
                <button onClick={() => move(idx, -1)} disabled={idx === 0} style={{ color: idx === 0 ? COLORS.textFaint : COLORS.textDim, opacity: idx === 0 ? 0.3 : 1 }}><ChevronUp size={14} /></button>
                <button onClick={() => move(idx, 1)} disabled={idx === selected.length - 1} style={{ color: idx === selected.length - 1 ? COLORS.textFaint : COLORS.textDim, opacity: idx === selected.length - 1 ? 0.3 : 1 }}><ChevronDown size={14} /></button>
              </div>
              <div className="flex-1 text-sm" style={{ ...body, color: COLORS.text, fontWeight: 600 }}>{s.name}</div>
              <div className="flex items-center gap-1">
                <input type="number" value={s.targetSets} onChange={(e) => updateField(idx, "targetSets", e.target.value)} className="text-center rounded-lg text-xs py-1.5" style={{ ...inputStyle, width: "42px" }} />
                <span className="text-xs" style={{ ...body, color: COLORS.textFaint }}>組 ×</span>
                <input type="number" value={s.targetReps} onChange={(e) => updateField(idx, "targetReps", e.target.value)} className="text-center rounded-lg text-xs py-1.5" style={{ ...inputStyle, width: "42px" }} />
                <span className="text-xs" style={{ ...body, color: COLORS.textFaint }}>下</span>
              </div>
              <button onClick={() => remove(idx)} style={{ color: COLORS.danger }}><X size={16} /></button>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-xl px-4 py-3 text-sm mb-4" style={{ background: COLORS.dangerSoft, color: COLORS.danger, ...body }}>{error}</div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full rounded-2xl py-4 flex items-center justify-center gap-2"
        style={{ background: COLORS.accent, color: "#fff", opacity: saving ? 0.7 : 1 }}
      >
        {saving && <Loader2 size={16} className="animate-spin" />}
        <span style={{ ...display, fontWeight: 700, fontSize: "16px" }}>{saving ? "儲存中…" : "儲存課表"}</span>
      </button>

      {pickerOpen && (
        <ExercisePicker
          exercises={exercises}
          selectedIds={selected.map((s) => s.exerciseId)}
          onToggle={toggleExercise}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}

/* ----------------------------- 補填某一天的訓練紀錄 ----------------------------- */

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function BackfillForm({ routines, exercises, onSave, onCancel, saving }) {
  const [date, setDate] = useState(todayStr());
  const [routineId, setRoutineId] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [selected, setSelected] = useState([]); // [{ exerciseId, name, sets: [{ weight, reps }] }]
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState(null);

  const applyRoutine = (id) => {
    setRoutineId(id);
    if (!id) return;
    const routine = routines.find((r) => r.id === id);
    if (!routine) return;
    const exList = [...routine.routine_exercises].sort((a, b) => a.position - b.position);
    setSelected(
      exList.map((re) => ({
        exerciseId: re.exercise.id,
        name: re.exercise.name,
        sets: Array.from({ length: re.target_sets }, () => ({ weight: "", reps: String(re.target_reps) })),
      }))
    );
    if (routine.est_minutes) setDurationMinutes(routine.est_minutes);
  };

  const toggleExercise = (ex) => {
    setSelected((list) => {
      const exists = list.find((s) => s.exerciseId === ex.id);
      if (exists) return list.filter((s) => s.exerciseId !== ex.id);
      return [...list, { exerciseId: ex.id, name: ex.name, sets: [{ weight: "", reps: "" }, { weight: "", reps: "" }, { weight: "", reps: "" }] }];
    });
  };

  const updateSet = (exIdx, setIdx, field, value) => {
    setSelected((list) =>
      list.map((ex, i) => {
        if (i !== exIdx) return ex;
        const sets = ex.sets.map((s, j) => (j === setIdx ? { ...s, [field]: value } : s));
        return { ...ex, sets };
      })
    );
  };

  const addSet = (exIdx) => {
    setSelected((list) => list.map((ex, i) => (i === exIdx ? { ...ex, sets: [...ex.sets, { weight: "", reps: "" }] } : ex)));
  };

  const removeSet = (exIdx, setIdx) => {
    setSelected((list) => list.map((ex, i) => (i === exIdx ? { ...ex, sets: ex.sets.filter((_, j) => j !== setIdx) } : ex)));
  };

  const removeExercise = (exIdx) => setSelected((list) => list.filter((_, i) => i !== exIdx));

  const handleSave = () => {
    if (!date) { setError("請選擇日期"); return; }
    if (selected.length === 0) { setError("至少需要一個動作"); return; }
    const hasAnySet = selected.some((ex) => ex.sets.some((s) => Number(s.weight) > 0 || Number(s.reps) > 0));
    if (!hasAnySet) { setError("至少填寫一組重量或次數"); return; }
    setError(null);
    const routine = routines.find((r) => r.id === routineId);
    onSave({
      date,
      routineId: routineId || null,
      routineName: routine ? routine.name : "補記訓練",
      durationMinutes,
      exercises: selected.map((s) => ({ exerciseId: s.exerciseId, exerciseName: s.name, sets: s.sets })),
    });
  };

  return (
    <div className="px-5 pb-6">
      <div className="pt-2 pb-4 flex items-center gap-3">
        <button onClick={onCancel} style={{ color: COLORS.textDim }}><ChevronLeft size={22} /></button>
        <div>
          <div className="text-xl" style={{ ...display, color: COLORS.text, fontWeight: 700 }}>補填訓練紀錄</div>
          <div className="text-xs mt-0.5" style={{ ...body, color: COLORS.textDim }}>直接輸入結果,不會啟動計時器或組間休息</div>
        </div>
      </div>

      <div className="flex gap-3 mb-3">
        <div className="flex-1">
          <label className="text-xs mb-1.5 block" style={{ ...body, color: COLORS.textDim }}>日期</label>
          <input type="date" value={date} max={todayStr()} onChange={(e) => setDate(e.target.value)} className="w-full rounded-xl px-3 py-2.5 text-sm" style={inputStyle} />
        </div>
        <div style={{ width: "110px" }}>
          <label className="text-xs mb-1.5 block" style={{ ...body, color: COLORS.textDim }}>時長(分)</label>
          <input type="number" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} className="w-full rounded-xl px-3 py-2.5 text-sm text-center" style={inputStyle} />
        </div>
      </div>

      <div className="mb-5">
        <label className="text-xs mb-1.5 block" style={{ ...body, color: COLORS.textDim }}>套用課表(選填,可省略直接自選動作)</label>
        <select value={routineId} onChange={(e) => applyRoutine(e.target.value)} className="w-full rounded-xl px-3 py-2.5 text-sm" style={inputStyle}>
          <option value="">不套用課表</option>
          {routines.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className="text-sm" style={{ ...body, color: COLORS.textDim, fontWeight: 600 }}>訓練內容</div>
        <button onClick={() => setPickerOpen(true)} className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg" style={{ background: COLORS.accentSoft, color: COLORS.accent, ...body, fontWeight: 600 }}>
          <Plus size={14} />
          新增動作
        </button>
      </div>

      {selected.length === 0 ? (
        <div className="text-sm text-center py-8 rounded-2xl mb-4" style={{ ...body, color: COLORS.textFaint, background: COLORS.surface, border: `1px solid ${COLORS.borderSoft}` }}>
          還沒有加入任何動作
        </div>
      ) : (
        <div className="flex flex-col gap-3 mb-4">
          {selected.map((ex, exIdx) => (
            <div key={ex.exerciseId} className="rounded-2xl p-3" style={{ background: COLORS.surface, border: `1px solid ${COLORS.borderSoft}` }}>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm" style={{ ...body, color: COLORS.text, fontWeight: 700 }}>{ex.name}</div>
                <button onClick={() => removeExercise(exIdx)} style={{ color: COLORS.danger }}><X size={15} /></button>
              </div>
              <div className="flex flex-col gap-1.5">
                {ex.sets.map((s, setIdx) => (
                  <div key={setIdx} className="flex items-center gap-2">
                    <span className="text-xs w-4" style={{ ...display, color: COLORS.textFaint }}>{setIdx + 1}</span>
                    <input
                      type="number"
                      value={s.weight}
                      onChange={(e) => updateSet(exIdx, setIdx, "weight", e.target.value)}
                      placeholder="重量"
                      className="flex-1 text-center rounded-lg py-1.5 text-sm"
                      style={{ ...inputStyle }}
                    />
                    <span className="text-xs" style={{ ...body, color: COLORS.textFaint }}>kg ×</span>
                    <input
                      type="number"
                      value={s.reps}
                      onChange={(e) => updateSet(exIdx, setIdx, "reps", e.target.value)}
                      placeholder="次數"
                      className="flex-1 text-center rounded-lg py-1.5 text-sm"
                      style={{ ...inputStyle }}
                    />
                    <button onClick={() => removeSet(exIdx, setIdx)} style={{ color: COLORS.textFaint }}><X size={14} /></button>
                  </div>
                ))}
              </div>
              <button onClick={() => addSet(exIdx)} className="text-xs mt-2" style={{ ...body, color: COLORS.accent, fontWeight: 600 }}>+ 加一組</button>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-xl px-4 py-3 text-sm mb-4" style={{ background: COLORS.dangerSoft, color: COLORS.danger, ...body }}>{error}</div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full rounded-2xl py-4 flex items-center justify-center gap-2"
        style={{ background: COLORS.accent, color: "#fff", opacity: saving ? 0.7 : 1 }}
      >
        {saving && <Loader2 size={16} className="animate-spin" />}
        <span style={{ ...display, fontWeight: 700, fontSize: "16px" }}>{saving ? "儲存中…" : "儲存這筆紀錄"}</span>
      </button>

      {pickerOpen && (
        <ExercisePicker
          exercises={exercises}
          selectedIds={selected.map((s) => s.exerciseId)}
          onToggle={toggleExercise}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}

/* ----------------------------- 主要匯出:訓練頁 ----------------------------- */

export default function TrainScreen({ routines, exercises, onStart, onAddTemplate, onCreateRoutine, onUpdateRoutine, onDeleteRoutine, onCreateBackfill }) {
  const [view, setView] = useState("list"); // list | templates | builder | backfill
  const [editingRoutine, setEditingRoutine] = useState(null);
  const [saving, setSaving] = useState(false);
  const [addingTemplateId, setAddingTemplateId] = useState(null);

  const existingNames = useMemo(() => new Set(routines.map((r) => r.name)), [routines]);

  const handleAddTemplate = async (template) => {
    setAddingTemplateId(template.id);
    try {
      await onAddTemplate(template);
    } finally {
      setAddingTemplateId(null);
    }
  };

  const handleSaveRoutine = async (data) => {
    setSaving(true);
    try {
      const ok = data.routineId ? await onUpdateRoutine(data) : await onCreateRoutine(data);
      if (ok) {
        setView("list");
        setEditingRoutine(null);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (routine) => {
    if (!window.confirm(`確定要刪除「${routine.name}」嗎？這不會影響已經完成的訓練紀錄。`)) return;
    await onDeleteRoutine(routine.id);
  };

  const handleSaveBackfill = async (data) => {
    setSaving(true);
    try {
      const ok = await onCreateBackfill(data);
      if (ok) setView("list");
    } finally {
      setSaving(false);
    }
  };

  if (view === "templates") {
    return (
      <TemplateLibrary
        onBack={() => setView("list")}
        onAdd={handleAddTemplate}
        existingNames={existingNames}
        addingId={addingTemplateId}
      />
    );
  }

  if (view === "builder") {
    return (
      <RoutineBuilder
        routine={editingRoutine}
        exercises={exercises}
        onSave={handleSaveRoutine}
        onCancel={() => { setView("list"); setEditingRoutine(null); }}
        saving={saving}
      />
    );
  }

  if (view === "backfill") {
    return (
      <BackfillForm
        routines={routines}
        exercises={exercises}
        onSave={handleSaveBackfill}
        onCancel={() => setView("list")}
        saving={saving}
      />
    );
  }

  return (
    <RoutineList
      routines={routines}
      onStart={onStart}
      onOpenTemplates={() => setView("templates")}
      onOpenBuilder={() => { setEditingRoutine(null); setView("builder"); }}
      onOpenBackfill={() => setView("backfill")}
      onEdit={(r) => { setEditingRoutine(r); setView("builder"); }}
      onDelete={handleDelete}
    />
  );
}
