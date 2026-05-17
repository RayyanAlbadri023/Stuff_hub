"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/app/hooks/useAuth";
import { useLang } from "@/app/context/LangContext";
import LangToggle from "@/app/components/LangToggle";

export default function EmployeeDashboard() {
  const router = useRouter();
  const { user, loading, logout } = useAuth({ requiredRole: "employee" });
  const { t, isRTL } = useLang();

  if (loading) return null;

  function calculate() {
    const salary   = parseFloat((document.getElementById("salary")   as HTMLInputElement)?.value || "0");
    const bonus    = parseFloat((document.getElementById("bonus")    as HTMLInputElement)?.value || "0");
    const absents  = parseFloat((document.getElementById("absents")  as HTMLInputElement)?.value || "0");
    const expenses = parseFloat((document.getElementById("expenses") as HTMLInputElement)?.value || "0");
    const daily       = salary / 30;
    const absentTotal = daily * absents;
    const tot         = salary + bonus + expenses;
    const finalSalary = tot - absentTotal;
    const dailyEl  = document.getElementById("daily");
    const absentEl = document.getElementById("absentTotal");
    const finalEl  = document.getElementById("finalSalary");
    if (dailyEl)  dailyEl.innerText  = daily.toFixed(2);
    if (absentEl) absentEl.innerText = absentTotal.toFixed(2);
    if (finalEl)  finalEl.innerText  = finalSalary.toFixed(2);
  }

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-gradient-to-br from-[#F5F7FF] to-[#ce908b] flex justify-center p-4">
      <div className="w-full max-w-5xl flex flex-col gap-6">
        {/* HEADER */}
        <div className="bg-white/60 backdrop-blur-xl border border-[#ec510e]/20 rounded-2xl p-4 flex items-center justify-between">
          <button onClick={() => router.push("/home")} className="px-4 py-2 text-sm text-white rounded-full bg-gradient-to-r from-[#ec510e] to-[#ecbcaf]">
            {t("homeBtn")}
          </button>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-[#ec510e]">{t("employeeDashboard")}</h1>
            <p className="text-sm text-gray-700">{t("welcomeDear")} <span className="font-semibold text-black ml-1">{user?.firstName || "..."}</span></p>
          </div>
          <div className="flex items-center gap-2">
            <LangToggle />
            <button onClick={logout} className="px-4 py-2 text-sm text-white rounded-full bg-gradient-to-r from-red-500 to-red-400">{t("logout")}</button>
          </div>
        </div>

        {/* FORM */}
        <div className="bg-white/60 backdrop-blur-xl border border-[#ec510e]/20 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <input id="salary"   type="number" placeholder={t("baseSalary")}  className="p-3 rounded-lg border bg-white text-black" />
          <input id="bonus"    type="number" placeholder={t("bonus")}        className="p-3 rounded-lg border bg-white text-black" />
          <input id="absents"  type="number" placeholder={t("absentDays")}   className="p-3 rounded-lg border bg-white text-black" />
          <input id="expenses" type="number" placeholder={t("expenses")}     className="p-3 rounded-lg border bg-white text-black" />
          <button onClick={calculate} className="md:col-span-2 py-3 rounded-full text-white font-semibold bg-gradient-to-r from-[#ec510e] to-[#ecbcaf]">
            {t("calculate")}
          </button>
        </div>

        {/* RESULT */}
        <div className="bg-white/60 backdrop-blur-xl border border-[#ec510e]/20 rounded-2xl p-6 text-center">
          <h2 className="text-lg font-semibold text-[#ec510e] mb-4">{t("result")}</h2>
          <p className="text-black">{t("dailyDeduction")} <span id="daily" className="font-semibold" /></p>
          <p className="text-black">{t("absentDeduction")} <span id="absentTotal" className="font-semibold" /></p>
          <p className="text-black">{t("finalSalary")} <span id="finalSalary" className="font-semibold" /></p>
        </div>

        {/* BUTTONS */}
        <div className="flex flex-wrap justify-center gap-3">
          {[
            { label: t("requestVacation"), path: "/veccation" },
            { label: t("appliance"),       path: "/appeal" },
            { label: t("suggestions"),     path: "/suggestions" },
            { label: t("resignation"),     path: "/resignation" },
          ].map(({ label, path }) => (
            <button key={path} onClick={() => router.push(path)} className="px-6 py-3 rounded-full text-white bg-gradient-to-r from-[#ec510e] to-[#ecbcaf]">
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
