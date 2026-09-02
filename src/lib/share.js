import { COLORS } from "../theme";

// 畫一張跟 APP 視覺一致的分享卡片(canvas → PNG blob)
function drawShareCard({ title, subtitle, stats }) {
  const canvas = document.createElement("canvas");
  const scale = 2; // 提高解析度，分享出去比較清楚
  canvas.width = 600 * scale;
  canvas.height = 750 * scale;
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);

  // 背景
  const grad = ctx.createLinearGradient(0, 0, 0, 750);
  grad.addColorStop(0, "#1B1D3A");
  grad.addColorStop(1, COLORS.bg);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 600, 750);

  // Logo 標記
  ctx.fillStyle = COLORS.accent;
  ctx.beginPath();
  ctx.roundRect(48, 56, 56, 56, 16);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "700 24px 'Space Grotesk', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("💪", 76, 86);

  ctx.textAlign = "left";
  ctx.fillStyle = COLORS.textDim;
  ctx.font = "500 18px 'Inter', sans-serif";
  ctx.fillText("健身記錄", 120, 78);
  ctx.fillStyle = "#fff";
  ctx.font = "700 30px 'Space Grotesk', sans-serif";
  ctx.fillText(title, 120, 106);

  if (subtitle) {
    ctx.fillStyle = COLORS.textDim;
    ctx.font = "400 18px 'Inter', sans-serif";
    ctx.fillText(subtitle, 48, 170);
  }

  // 統計數字區塊
  const startY = 220;
  const rowH = 130;
  stats.forEach((s, i) => {
    const y = startY + i * rowH;
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.beginPath();
    ctx.roundRect(48, y, 504, 104, 20);
    ctx.fill();

    ctx.fillStyle = s.accent ? COLORS.lime : "#fff";
    ctx.font = "700 46px 'Space Grotesk', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(s.value, 76, y + 62);

    ctx.fillStyle = COLORS.textDim;
    ctx.font = "500 17px 'Inter', sans-serif";
    ctx.fillText(s.label, 76, y + 88);
  });

  // 底部標語
  ctx.fillStyle = COLORS.textFaint;
  ctx.font = "400 15px 'Inter', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("用「健身記錄」記錄每一次進步", 300, 715);

  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

// 主要入口：產生圖片並嘗試用原生分享，依序退回下載 / 複製文字
export async function shareCard({ title, subtitle, stats, textFallback, filename = "workout-share.png" }) {
  const blob = await drawShareCard({ title, subtitle, stats });
  const file = new File([blob], filename, { type: "image/png" });

  if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title, text: textFallback });
      return { method: "share" };
    } catch (err) {
      if (err.name === "AbortError") return { method: "cancelled" };
      // 分享失敗就繼續往下退回下載
    }
  }

  // 退回：直接下載圖片
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return { method: "download" };
}
