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
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F5F7FF] to-[#ce908b] p-5">
      <div className={`absolute top-4 ${isRTL ? "left-4" : "right-4"}`}><LangToggle /></div>
      <div className="w-[400px] p-8 rounded-2xl bg-white/60 backdrop-blur-xl border border-[#ec510e]/20 text-center">
        <h1 className="text-2xl font-semibold text-[#ec510e] mb-2">{t("resetPasswordTitle")}</h1>
        <input type="password" placeholder={t("newPassword")} value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
          className="w-full p-3 mb-3 rounded-lg bg-white text-black border focus:outline-none focus:ring-2 focus:ring-[#ec510e]/40" />
        <input type="password" placeholder={t("confirmNewPassword")} value={confirm} onChange={(e) => setConfirm(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && resetPassword()}
          className="w-full p-3 mb-3 rounded-lg bg-white text-black border focus:outline-none focus:ring-2 focus:ring-[#ec510e]/40" />
        {message && <p className={`text-sm mb-3 font-medium ${isSuccess ? "text-green-600" : "text-red-500"}`}>{message}</p>}
        <button onClick={resetPassword} disabled={loading || isSuccess} className="w-full py-3 rounded-full text-white font-semibold bg-gradient-to-r from-[#ec510e] to-[#ecbcaf] disabled:opacity-60 transition">
          {loading ? t("resetting") : t("resetBtn")}
        </button>
        <button onClick={() => router.push("/forget")} className="w-full mt-3 py-2 text-sm text-[#ec510e] hover:underline transition">{t("sendResetLink")}</button>
        <button onClick={() => router.push("/login")} className="w-full mt-1 py-2 text-sm text-gray-500 hover:text-[#ec510e] transition underline">{t("backToLogin")}</button>
      </div>
    </div>
  );
}

export default function ResetPage() {
  return <Suspense><ResetForm /></Suspense>;
}
