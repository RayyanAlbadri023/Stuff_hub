"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/app/context/LangContext";
import LangToggle from "@/app/components/LangToggle";

export default function ForgetPage() {
  const router = useRouter();
  const { t, isRTL } = useLang();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const sendResetLink = async () => {
    setMessage("");
    if (!email) { setMessage(t("enterEmail")); return; }
    try {
      setLoading(true);
      const res = await fetch("/api/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Request failed");
      setIsSuccess(true); setMessage(data.message);
    } catch (err: unknown) {
      setIsSuccess(false); setMessage(err instanceof Error ? err.message : "Something went wrong");
    } finally { setLoading(false); }
  };

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F5F7FF] to-[#ce908b] p-5">
      <div className={`absolute top-4 ${isRTL ? "left-4" : "right-4"}`}><LangToggle /></div>
      <div className="w-[400px] p-8 rounded-2xl bg-white/60 backdrop-blur-xl border border-[#ec510e]/20 text-center">
        <h1 className="text-2xl font-semibold text-[#ec510e] mb-2">{t("forgotPasswordTitle")}</h1>
        <p className="text-sm text-gray-500 mb-5">{t("forgotPasswordSubtitle")}</p>
        {!isSuccess ? (
          <>
            <input type="email" placeholder={t("emailPlaceholder")} value={email} onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendResetLink()}
              className="w-full p-3 mb-3 rounded-lg bg-white text-black border focus:outline-none focus:ring-2 focus:ring-[#ec510e]/40" />
            {message && <p className="text-sm text-red-500 mb-3">{message}</p>}
            <button onClick={sendResetLink} disabled={loading} className="w-full py-3 rounded-full text-white font-semibold bg-gradient-to-r from-[#ec510e] to-[#ecbcaf] disabled:opacity-60 transition">
              {loading ? t("sending") : t("sendResetLink")}
            </button>
          </>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-4">
            <div className="text-4xl mb-2">📩</div>
            <p className="text-green-700 font-semibold text-sm">{message}</p>
            <p className="text-gray-500 text-xs mt-2">{t("checkInbox")}</p>
          </div>
        )}
        <button onClick={() => router.push("/login")} className="w-full mt-3 py-2 text-sm text-gray-600 hover:text-[#ec510e] transition underline">
          {t("backToLogin")}
        </button>
      </div>
    </div>
  );
}
