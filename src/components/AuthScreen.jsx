import { useState } from "react";
import { Dumbbell } from "lucide-react";
import { COLORS, display, body } from "../theme";
import { signIn, signUp } from "../lib/api";

export default function AuthScreen() {
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const inputStyle = {
    background: COLORS.surfaceElevated,
    color: COLORS.text,
    border: `1px solid ${COLORS.borderSoft}`,
    ...body,
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      if (mode === "signin") {
        await signIn({ email, password });
      } else {
        const result = await signUp({ email, password, displayName: displayName || "訓練者" });
        if (!result.session) {
          setNotice("註冊成功，請至信箱收信完成驗證後再登入。");
          setMode("signin");
        }
      }
    } catch (err) {
      setError(err.message || "發生錯誤，請再試一次");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex justify-center" style={{ background: "#0A0A0D", minHeight: "100dvh" }}>
      <div
        className="w-full flex flex-col justify-center px-6"
        style={{ maxWidth: "480px", minHeight: "100dvh", background: COLORS.bg }}
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: COLORS.accentSoft }}>
            <Dumbbell size={26} color={COLORS.accent} />
          </div>
          <div className="text-2xl" style={{ ...display, color: COLORS.text, fontWeight: 700 }}>健身記錄</div>
          <div className="text-sm mt-1" style={{ ...body, color: COLORS.textDim }}>
            {mode === "signin" ? "登入繼續你的訓練紀錄" : "建立帳號，開始記錄"}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {mode === "signup" && (
            <div>
              <label className="text-xs mb-1.5 block" style={{ ...body, color: COLORS.textDim }}>顯示名稱</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="例如：阿明"
                className="w-full rounded-xl px-4 py-3 text-sm"
                style={inputStyle}
              />
            </div>
          )}
          <div>
            <label className="text-xs mb-1.5 block" style={{ ...body, color: COLORS.textDim }}>Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl px-4 py-3 text-sm"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="text-xs mb-1.5 block" style={{ ...body, color: COLORS.textDim }}>密碼</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少 6 個字元"
              className="w-full rounded-xl px-4 py-3 text-sm"
              style={inputStyle}
            />
          </div>

          {error && (
            <div className="rounded-xl px-4 py-3 text-sm" style={{ background: COLORS.dangerSoft, color: COLORS.danger, ...body }}>
              {error}
            </div>
          )}
          {notice && (
            <div className="rounded-xl px-4 py-3 text-sm" style={{ background: COLORS.limeSoft, color: COLORS.lime, ...body }}>
              {notice}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl py-4 mt-2"
            style={{ background: COLORS.accent, color: "#fff", opacity: loading ? 0.7 : 1 }}
          >
            <span style={{ ...display, fontWeight: 700, fontSize: "16px" }}>
              {loading ? "處理中…" : mode === "signin" ? "登入" : "註冊"}
            </span>
          </button>
        </form>

        <button
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
            setNotice(null);
          }}
          className="text-sm mt-5 text-center"
          style={{ ...body, color: COLORS.textDim }}
        >
          {mode === "signin" ? "還沒有帳號？點此註冊" : "已經有帳號？點此登入"}
        </button>
      </div>
    </div>
  );
}
