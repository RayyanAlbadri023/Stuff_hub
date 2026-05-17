"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/hooks/useAuth";
import { useRequest } from "@/app/hooks/useRequest";
import { useLang } from "@/app/context/LangContext";
import LangToggle from "@/app/components/LangToggle";

export default function Page() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { execute, loading: submitting, error } = useRequest();
  const { t, isRTL } = useLang();
  const [message, setMessage] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  if (loading) return null;

  async function sendRequest() {
    if (!message.trim()) return alert(t("suggestionEmpty"));
    const result = await execute("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: user?.firstName || "Employee", email: user?.email || "", type: "suggestion", message }),
    });
    if (!result) return;
    setSuccessMsg(t("suggestionSuccess"));
    setMessage("");
  }

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-gradient-to-br from-[#F5F7FF] to-[#ce908b] flex items-center justify-center p-5">
      <div className="w-full max-w-lg bg-white/60 backdrop-blur-xl p-6 rounded-2xl border border-[#ec510e]/20">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold text-[#ec510e]">{t("suggestionsTitle")}</h1>
          <LangToggle />
        </div>
        {error      && <p className="text-red-500 text-sm mb-2">{error}</p>}
        {successMsg && <p className="text-green-600 text-sm mb-2">{successMsg}</p>}
        <textarea placeholder={t("suggestionsPlaceholder")} value={message} onChange={(e) => setMessage(e.target.value)}
          className="w-full h-40 p-3 rounded-lg border border-gray-300 outline-none resize-none bg-white/80 text-black placeholder-gray-500" />
        <button onClick={sendRequest} disabled={submitting} className="w-full mt-4 py-3 rounded-full text-white font-semibold bg-gradient-to-r from-[#ec510e] to-[#ecbcaf] disabled:opacity-60">
          {submitting ? t("sending") : t("sendSuggestion")}
        </button>
        <button onClick={() => router.push("/employee")} className="w-full mt-3 py-2 text-sm text-gray-700 underline">{t("backToDashboard")}</button>
      </div>
    </div>
  );
}
