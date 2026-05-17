"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/hooks/useAuth";
import { useRequest } from "@/app/hooks/useRequest";
import { useLang } from "@/app/context/LangContext";
import LangToggle from "@/app/components/LangToggle";

export default function VacationPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { execute, loading: submitting, error } = useRequest();
  const { t, isRTL } = useLang();

  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  if (loading) return null;

  function calculateDays(s: string, e: string): number {
    return (new Date(e).getTime() - new Date(s).getTime()) / (1000 * 60 * 60 * 24) + 1;
  }

  function validateDate(dateStr: string): string | null {
    const date = new Date(dateStr);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (date < today) return t("pastDateError");
    const day = date.getDay();
    if (day === 5 || day === 6) return t("weekendError");
    return null;
  }

  async function handleSubmit() {
    if (!start || !end) return alert(t("selectDates"));
    const startError = validateDate(start);
    const endError   = validateDate(end);
    if (startError) return alert(startError);
    if (endError)   return alert(endError);
    if (new Date(end) < new Date(start)) return alert(t("endBeforeStart"));
    const days = calculateDays(start, end);
    const result = await execute("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: user?.firstName || "Employee", email: user?.email || "", type: "vacation", message: `Vacation from ${start} to ${end} (${days} days)`, start, end, days }),
    });
    if (!result) return;
    setSuccessMsg(t("vacationSuccess"));
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    doc.setFontSize(16); doc.text("Vacation Request", 20, 20);
    doc.setFontSize(12);
    doc.text(`Name: ${user?.firstName || "Employee"}`, 20, 40);
    doc.text(`Start Date: ${start}`, 20, 50);
    doc.text(`End Date: ${end}`, 20, 60);
    doc.text(`Total Days: ${days}`, 20, 70);
    doc.text("Status: Pending Approval", 20, 90);
    doc.save("vacation-request.pdf");
  }

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-gradient-to-br from-[#F5F7FF] to-[#ce908b] flex items-center justify-center p-5">
      <div className="w-full max-w-lg bg-white/60 backdrop-blur-xl p-6 rounded-2xl border border-[#ec510e]/20">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold text-[#ec510e]">{t("requestVacationTitle")}</h1>
          <LangToggle />
        </div>
        {error      && <p className="text-red-500 text-sm mb-2">{error}</p>}
        {successMsg && <p className="text-green-600 text-sm mb-2">{successMsg}</p>}
        <label className="text-sm text-black">{t("startDate")}</label>
        <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="w-full p-3 mb-3 rounded-lg border bg-white text-black" />
        <label className="text-sm text-black">{t("endDate")}</label>
        <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="w-full p-3 mb-3 rounded-lg border bg-white text-black" />
        <button onClick={handleSubmit} disabled={submitting} className="w-full py-3 rounded-full text-white font-semibold bg-gradient-to-r from-[#ec510e] to-[#ecbcaf] disabled:opacity-60">
          {submitting ? t("submitting") : t("submitDownload")}
        </button>
        <button onClick={() => router.push("/employee")} className="w-full mt-3 py-2 text-sm text-gray-700 underline">{t("backToDashboard")}</button>
      </div>
    </div>
  );
}
