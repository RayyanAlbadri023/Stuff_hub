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

  const cards = [
    { label: t("mySalaryTitle"),   desc: t("mySalaryDesc"),   path: "/salary" },
    { label: t("myContractTitle"), desc: t("myContractDesc"), path: "/contract" },
    { label: t("myDocumentsTitle"), desc: t("myDocumentsDesc"), path: "/documents" },
    { label: t("myTasksTitle"),    desc: t("myTasksDesc"),    path: "/tasks" },
    { label: t("requestVacation"), desc: t("requestVacationDesc"), path: "/veccation" },
    { label: t("appliance"),       desc: t("applianceDesc"),  path: "/appeal" },
    { label: t("suggestions"),     desc: t("suggestionsDesc"), path: "/suggestions" },
    { label: t("resignation"),     desc: t("resignationDesc"), path: "/resignation" },
    { label: t("expensesCardTitle"), desc: t("expensesCardDesc"), path: "/expenses" },
  ];

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-white flex justify-center p-4">
      <div className="w-full max-w-5xl flex flex-col gap-6">
        {/* HEADER */}
        <div className="bg-[#030405] border border-[#030405] shadow-sm rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
          <button onClick={() => router.push("/home")} className="px-3 sm:px-4 py-2 text-sm text-white rounded-full bg-gradient-to-r from-[#F33615] to-[#ff6b4a]">
            {t("homeBtn")}
          </button>
          <div className="text-center order-last sm:order-none w-full sm:w-auto">
            <h1 className="text-xl sm:text-2xl font-bold text-white">{t("employeeDashboard")}</h1>
            <p className="text-sm text-gray-400">{t("welcomeDear")} <span className="font-semibold text-white ml-1">{user?.firstName || "..."}</span></p>
          </div>
          <div className="flex items-center gap-2">
            <LangToggle dark />
            <button onClick={logout} className="px-3 sm:px-4 py-2 text-sm text-white rounded-full bg-gradient-to-r from-red-500 to-red-400">{t("logout")}</button>
          </div>
        </div>

        {/* CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map(({ label, desc, path }) => (
            <button
              key={path}
              onClick={() => router.push(path)}
              className="text-start bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all shadow-sm"
            >
              <h3 className="font-bold text-[#F33615] mb-1">{label}</h3>
              <p className="text-sm text-gray-600">{desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
