"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/hooks/useAuth";
import { useRequest } from "@/app/hooks/useRequest";
import { useLang } from "@/app/context/LangContext";
import LangToggle from "@/app/components/LangToggle";

interface ExpenseItem {
  id: string;
  name: string;
  email: string;
  amount: number;
  description: string;
  receiptImage: string;
  status: "pending" | "approved" | "rejected";
  createdAt?: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

export default function AdminExpensesPage() {
  const router = useRouter();
  const { loading: authLoading, logout } = useAuth({ requiredRole: "admin" });
  const { execute } = useRequest();
  const { t, isRTL } = useLang();

  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [reloadKey, setReloadKey] = useState(0);
  const loadData = useCallback(() => setReloadKey((k) => k + 1), []);
  const [viewImage, setViewImage] = useState<string | null>(null);

  const executeRef = useRef(execute);
  useEffect(() => { executeRef.current = execute; });

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    async function fetchData() {
      setDataLoading(true); setApiError("");
      try {
        const res = await executeRef.current("/api/expenses");
        if (cancelled) return;
        setExpenses(Array.isArray((res as { expenses?: ExpenseItem[] })?.expenses) ? (res as { expenses: ExpenseItem[] }).expenses : []);
      } catch (err) {
        if (!cancelled) setApiError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, [authLoading, reloadKey]);

  const updateStatus = async (id: string, status: "approved" | "rejected") => {
    await execute(`/api/expenses/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    loadData();
  };

  const deleteExpense = async (id: string) => {
    if (!confirm(t("deleteRequest"))) return;
    await execute(`/api/expenses/${id}`, { method: "DELETE" });
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  const filtered = expenses.filter((e) => filterStatus === "all" || e.status === filterStatus);
  const pendingCount = expenses.filter((e) => e.status === "pending").length;
  const approvedCount = expenses.filter((e) => e.status === "approved").length;
  const rejectedCount = expenses.filter((e) => e.status === "rejected").length;
  const totalApprovedAmount = expenses.filter((e) => e.status === "approved").reduce((sum, e) => sum + e.amount, 0);

  if (authLoading) return null;

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-white p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* HEADER */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#030405] rounded-2xl p-4 shadow-sm">
          <button onClick={() => router.push("/admin")} className="px-3 sm:px-4 py-2 text-sm text-white rounded-full bg-gradient-to-r from-[#F33615] to-[#ff6b4a]">
            {t("backToDashboard")}
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-white order-last sm:order-none w-full sm:w-auto text-center flex items-center justify-center gap-2">🧾 {t("navExpenses")}</h1>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {pendingCount > 0 && <span className="bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full">{pendingCount} {t("pending")}</span>}
            <LangToggle dark />
            <button onClick={logout} className="px-3 sm:px-4 py-2 text-sm rounded-lg bg-white/10 text-white font-semibold border border-white/20 hover:bg-[#F33615] hover:border-[#F33615] transition">🚪 {t("logout")}</button>
          </div>
        </div>

        {apiError && (
          <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-xl">
            ❌ {apiError}<button onClick={loadData} className="ml-3 underline text-sm">Retry</button>
          </div>
        )}

        {dataLoading && <div className="text-center py-10 text-[#F33615] font-semibold text-lg animate-pulse">{t("loading")}</div>}

        {!dataLoading && (
          <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
            <h2 className="font-bold text-[#F33615] text-lg mb-4 flex items-center gap-2">🧾 {t("expensesPageTitle")} <span className="text-gray-400 font-normal text-sm">({filtered.length})</span></h2>

            {/* STATUS OVERVIEW */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              <button onClick={() => setFilterStatus("pending")} className={`bg-white rounded-xl p-3 text-center border transition ${filterStatus === "pending" ? "border-yellow-400 ring-2 ring-yellow-200" : "border-gray-200 hover:border-gray-300"}`}>
                <p className="text-xs text-gray-500 mb-1">{t("pending")}</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
              </button>
              <button onClick={() => setFilterStatus("approved")} className={`bg-white rounded-xl p-3 text-center border transition ${filterStatus === "approved" ? "border-green-400 ring-2 ring-green-200" : "border-gray-200 hover:border-gray-300"}`}>
                <p className="text-xs text-gray-500 mb-1">{t("approved")}</p>
                <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
              </button>
              <button onClick={() => setFilterStatus("rejected")} className={`bg-white rounded-xl p-3 text-center border transition ${filterStatus === "rejected" ? "border-red-400 ring-2 ring-red-200" : "border-gray-200 hover:border-gray-300"}`}>
                <p className="text-xs text-gray-500 mb-1">{t("rejected")}</p>
                <p className="text-2xl font-bold text-red-600">{rejectedCount}</p>
              </button>
              <div className="bg-white rounded-xl p-3 text-center border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">{t("totalApprovedAmount")}</p>
                <p className="text-2xl font-bold text-[#F33615]">{totalApprovedAmount.toFixed(2)}</p>
              </div>
            </div>

            {/* FILTER */}
            <div className="flex flex-wrap gap-1.5 mb-5 bg-white border border-gray-200 rounded-xl p-2">
              {(["all", "pending", "approved", "rejected"] as const).map((s) => (
                <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${filterStatus === s ? "bg-[#F33615] text-white" : "text-gray-600 hover:bg-gray-100"}`}>
                  {s === "all" ? t("all") : s === "pending" ? t("pending") : s === "approved" ? t("approved") : t("rejected")}
                </button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">{t("noExpensesAdmin")}</p>
            ) : (
              <div className="space-y-2.5">
                {filtered.map((ex) => (
                  <div key={ex.id} className="flex overflow-hidden bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div className={`w-1.5 shrink-0 ${STATUS_COLORS[ex.status].includes("yellow") ? "bg-yellow-400" : STATUS_COLORS[ex.status].includes("green") ? "bg-green-500" : "bg-red-500"}`} />
                    <div className="flex-1 p-4 flex flex-wrap justify-between items-start gap-4">
                      <div className="flex gap-3 flex-1 min-w-0">
                        <button onClick={() => setViewImage(ex.receiptImage)} className="shrink-0">
                          <img src={ex.receiptImage} alt="receipt" className="w-14 h-14 object-cover rounded-lg border border-gray-200 hover:opacity-80 transition" />
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-0.5">
                            <span className="font-semibold text-black text-sm">{ex.name}</span>
                            <span className="text-xs text-gray-400">·</span>
                            <span className="font-bold text-[#F33615] text-sm">{ex.amount.toFixed(2)}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${STATUS_COLORS[ex.status]}`}>{ex.status}</span>
                          </div>
                          {ex.email && <p className="text-xs text-gray-400">{ex.email}</p>}
                          {ex.description && <p className="text-sm text-gray-700 mt-2 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">{ex.description}</p>}
                          <p className="text-[11px] text-gray-400 mt-2">{ex.createdAt ? new Date(ex.createdAt).toLocaleString() : ""}</p>
                        </div>
                      </div>
                      <div className="flex sm:flex-col gap-1.5 shrink-0">
                        {ex.status === "pending" ? (
                          <>
                            <button onClick={() => updateStatus(ex.id, "approved")} className="px-3 py-1.5 rounded-lg bg-[#030405] text-white text-xs font-semibold hover:bg-green-600 transition whitespace-nowrap">✓ {t("approve")}</button>
                            <button onClick={() => updateStatus(ex.id, "rejected")} className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 text-xs font-semibold hover:border-red-300 hover:text-red-600 transition whitespace-nowrap">✕ {t("reject")}</button>
                          </>
                        ) : (
                          <button onClick={() => updateStatus(ex.id, ex.status === "approved" ? "rejected" : "approved")} className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 transition whitespace-nowrap">↩ Undo</button>
                        )}
                        <button onClick={() => deleteExpense(ex.id)} className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-400 text-xs font-semibold hover:border-red-300 hover:text-red-600 transition whitespace-nowrap">🗑</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* IMAGE VIEWER */}
      {viewImage && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setViewImage(null)}>
          <img src={viewImage} alt="receipt" className="max-w-full max-h-full rounded-lg" />
        </div>
      )}
    </div>
  );
}
