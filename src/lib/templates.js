// 課表範本庫 — 靜態資料,不存在資料庫裡。
// 使用者點「加入我的課表」時，會用 exerciseNames 去比對動作庫，
// 找到對應的 exercise id 後建立一份屬於該使用者的 routines row。
// exerciseNames 必須跟 supabase/seed.sql 裡的動作名稱完全一致。

export const TEMPLATES = [
  {
    id: "fullbody-a",
    name: "新手全身訓練 A",
    tag: "全身 · 適合新手",
    estMinutes: 40,
    exerciseNames: ["深蹲", "槓鈴臥推", "槓鈴划船", "肩推", "捲腹"],
  },
  {
    id: "fullbody-b",
    name: "新手全身訓練 B",
    tag: "全身 · 適合新手",
    estMinutes: 40,
    exerciseNames: ["硬舉", "上斜啞鈴推舉", "滑輪下拉", "啞鈴側平舉", "抬腿"],
  },
  {
    id: "upper",
    name: "上肢訓練日",
    tag: "胸 / 背 / 肩 / 手臂",
    estMinutes: 50,
    exerciseNames: ["槓鈴臥推", "槓鈴划船", "肩推", "滑輪下拉", "二頭彎舉", "三頭下拉"],
  },
  {
    id: "lower",
    name: "下肢訓練日",
    tag: "腿部 · 完整訓練",
    estMinutes: 50,
    exerciseNames: ["深蹲", "腿推", "羅馬尼亞硬舉", "腿彎舉", "提踵"],
  },
  {
    id: "push",
    name: "推力訓練日",
    tag: "胸 / 肩 / 三頭肌",
    estMinutes: 45,
    exerciseNames: ["槓鈴臥推", "肩推", "上斜啞鈴推舉", "三頭下拉"],
  },
  {
    id: "pull",
    name: "拉力訓練日",
    tag: "背 / 二頭肌",
    estMinutes: 50,
    exerciseNames: ["硬舉", "槓鈴划船", "滑輪下拉", "二頭彎舉"],
  },
  {
    id: "legs",
    name: "腿部訓練日",
    tag: "股四頭肌 / 後側鏈",
    estMinutes: 55,
    exerciseNames: ["深蹲", "腿推", "羅馬尼亞硬舉", "提踵"],
  },
  {
    id: "core",
    name: "核心強化",
    tag: "核心 · 短時間高效",
    estMinutes: 25,
    exerciseNames: ["捲腹", "抬腿"],
  },
];
