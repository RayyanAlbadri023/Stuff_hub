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
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen flex items-center justify-center bg-white p-5">
      <div className={`absolute top-4 ${isRTL ? "left-4" : "right-4"}`}><LangToggle /></div>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#030405] mb-4 overflow-hidden">
            <img src="/ibana.png" className="h-full w-full object-cover" alt="logo" />
          </div>
          <h1 className="text-xl font-semibold text-black tracking-tight">{t("forgotPasswordTitle")}</h1>
          <p className="text-black/40 text-sm mt-1">{t("forgotPasswordSubtitle")}</p>
        </div>
        <div className="border border-black/10 rounded-2xl p-6 text-center">
          {!isSuccess ? (
            <>
              <input type="email" placeholder={t("emailPlaceholder")} value={email} onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendResetLink()}
                className="w-full p-3 mb-3 rounded-lg border border-black/10 text-black outline-none focus:border-[#F33615]/50 focus:ring-2 focus:ring-[#F33615]/10 transition" />
              {message && <p className="text-sm text-red-500 mb-3">{message}</p>}
              <button onClick={sendResetLink} disabled={loading} className="w-full py-3 rounded-full text-white font-semibold bg-[#030405] hover:bg-[#F33615] disabled:opacity-50 transition-colors">
                {loading ? t("sending") : t("sendResetLink")}
              </button>
            </>
          ) : (
            <div className="bg-black/[0.03] border border-black/10 rounded-xl p-5 mb-4">
              <div className="text-4xl mb-2">📩</div>
              <p className="text-black/70 font-semibold text-sm">{message}</p>
              <p className="text-black/40 text-xs mt-2">{t("checkInbox")}</p>
            </div>
          )}
          <button onClick={() => router.push("/login")} className="w-full mt-3 py-2 text-sm text-black/50 hover:text-[#F33615] transition underline">
            {t("backToLogin")}
          </button>
        </div>
      </div>
    </div>
  );
}
