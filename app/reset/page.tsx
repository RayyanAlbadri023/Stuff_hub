"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useLang } from "@/app/context/LangContext";
import LangToggle from "@/app/components/LangToggle";

function ResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { t, isRTL } = useLang();

  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const resetPassword = async () => {
    setMessage("");
    if (!token)                      { setMessage(t("missingToken")); return; }
    if (!newPassword)                { setMessage(t("enterNewPass")); return; }
    if (newPassword !== confirm)     { setMessage(t("passwordsMismatch")); return; }
    if (newPassword.length < 6)     { setMessage(t("passwordTooShort")); return; }
    try {
      setLoading(true);
      const res = await fetch("/api/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, newPassword }) });
      const data = await res.json();
      if (!res.ok) { setIsSuccess(false); setMessage(data.message || "Reset failed"); return; }
      setIsSuccess(true); setMessage(t("resetSuccess"));
      setTimeout(() => router.push("/login"), 2000);
    } catch (err: unknown) {
      setIsSuccess(false); setMessage(err instanceof Error ? err.message : "Something went wrong");
    } finally { setLoading(false); }
  };

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen flex items-center justify-center bg-white p-5">
      <div className={`absolute top-4 ${isRTL ? "left-4" : "right-4"}`}><LangToggle /></div>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#030405] mb-4 overflow-hidden">
            <img src="/ibana.png" className="h-full w-full object-cover" alt="logo" />
          </div>
          <h1 className="text-xl font-semibold text-black tracking-tight">{t("resetPasswordTitle")}</h1>
        </div>
        <div className="border border-black/10 rounded-2xl p-6 text-center">
          <input type="password" placeholder={t("newPassword")} value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
            className="w-full p-3 mb-3 rounded-lg border border-black/10 text-black outline-none focus:border-[#F33615]/50 focus:ring-2 focus:ring-[#F33615]/10 transition" />
          <input type="password" placeholder={t("confirmNewPassword")} value={confirm} onChange={(e) => setConfirm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && resetPassword()}
            className="w-full p-3 mb-3 rounded-lg border border-black/10 text-black outline-none focus:border-[#F33615]/50 focus:ring-2 focus:ring-[#F33615]/10 transition" />
          {message && <p className={`text-sm mb-3 font-medium ${isSuccess ? "text-green-600" : "text-red-500"}`}>{message}</p>}
          <button onClick={resetPassword} disabled={loading || isSuccess} className="w-full py-3 rounded-full text-white font-semibold bg-[#030405] hover:bg-[#F33615] disabled:opacity-50 transition-colors">
            {loading ? t("resetting") : t("resetBtn")}
          </button>
          <button onClick={() => router.push("/forget")} className="w-full mt-3 py-2 text-sm text-[#F33615] hover:underline transition">{t("sendResetLink")}</button>
          <button onClick={() => router.push("/login")} className="w-full mt-1 py-2 text-sm text-black/40 hover:text-[#F33615] transition underline">{t("backToLogin")}</button>
        </div>
      </div>
    </div>
  );
}

export default function ResetPage() {
  return <Suspense><ResetForm /></Suspense>;
}
