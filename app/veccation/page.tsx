"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/hooks/useAuth";
import { useRequest } from "@/app/hooks/useRequest";
import { useLang } from "@/app/context/LangContext";
import LangToggle from "@/app/components/LangToggle";
import { computeVacationBalance, ANNUAL_VACATION_DAYS, type VacationRecord } from "@/app/lib/vacationBalance";

export default function VacationPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { execute, loading: submitting, error } = useRequest();
  const { t, isRTL } = useLang();

  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (loading || !user?.email) return;
    let cancelled = false;
    (async () => {
      const res = await execute(`/api/requests`);
      if (cancelled) return;
      const requests = (res as { requests?: any[] })?.requests ?? [];
      const mine: VacationRecord[] = requests
        .filter((r) => r.type === "vacation" && r.email === user!.email && (r.status === "approved" || r.status === "pending"))
        .map((r) => ({ startDate: r.start, status: r.status, days: r.days }));
      setRemaining(computeVacationBalance(mine).remaining);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user?.email]);

  if (loading) return null;

  // Business-day count for the requested range — Friday & Saturday
  // (the weekend) are not counted against the employee's balance.
  function calculateDays(s: string, e: string): number {
    const cur = new Date(s);
    const last = new Date(e);
    let count = 0;
    while (cur <= last) {
      const day = cur.getDay();
      if (day !== 5 && day !== 6) count++;
      cur.setDate(cur.getDate() + 1);
    }
    return count;
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
    if (days <= 0) return alert(t("weekendError"));
    if (remaining !== null && days > remaining) {
      return alert(`${t("vacationLimitError")} (${remaining}/${ANNUAL_VACATION_DAYS})`);
    }
    const result = await execute("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: user?.firstName || "Employee", email: user?.email || "", type: "vacation", message: `Vacation from ${start} to ${end} (${days} days)`, start, end, days }),
    });
    if (!result) return;
    setSuccessMsg(t("vacationSuccess"));
    setRemaining((r) => (r === null ? r : r - days));
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
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-white flex items-center justify-center p-5">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 bg-[#030405]">
          <h1 className="text-xl font-bold text-white">{t("requestVacationTitle")}</h1>
          <LangToggle dark />
        </div>
        <div className="p-6">
        {/* VACATION POLICY */}
        <div className="mb-4 bg-gray-50 border border-gray-200 rounded-xl p-3">
          <p className="text-xs font-semibold text-[#F33615] mb-1.5">📜 {t("vacationPolicyTitle")}</p>
          <ul className="list-disc ps-4 text-[11px] text-gray-600 space-y-1">
            <li>{t("vacationPolicyRule1")}</li>
            <li>{t("vacationPolicyRule2")}</li>
            <li>{t("vacationPolicyRule3")}</li>
          </ul>
        </div>

        {error      && <p className="text-red-500 text-sm mb-2">{error}</p>}
        {successMsg && <p className="text-green-600 text-sm mb-2">{successMsg}</p>}
        {remaining !== null && (
          <p className="text-xs text-gray-500 mb-3">
            {t("remainingDays")}: <span className="font-bold text-[#F33615]">{remaining}</span> / {ANNUAL_VACATION_DAYS}
          </p>
        )}
        <label className="text-sm text-black">{t("startDate")}</label>
        <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="w-full p-3 mb-3 rounded-lg border bg-white text-black" />
        <label className="text-sm text-black">{t("endDate")}</label>
        <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="w-full p-3 mb-3 rounded-lg border bg-white text-black" />
        <button onClick={handleSubmit} disabled={submitting} className="w-full py-3 rounded-full text-white font-semibold bg-gradient-to-r from-[#F33615] to-[#ff6b4a] disabled:opacity-60">
          {submitting ? t("submitting") : t("submitDownload")}
        </button>
        <button onClick={() => router.push("/employee")} className="w-full mt-3 py-2 text-sm text-gray-700 underline">{t("backToDashboard")}</button>
        </div>
      </div>
    </div>
  );
}
