"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/hooks/useAuth";
import { useRequest } from "@/app/hooks/useRequest";
import { useLang } from "@/app/context/LangContext";
import LangToggle from "@/app/components/LangToggle";

interface RequestItem {
  id: number;
  type: "vacation" | "suggestion" | "appeal" | "resignation";
  name: string;
  email: string;
  message?: string;
  start?: string;
  end?: string;
  days?: number;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

type ApiRequestsResponse = { requests: RequestItem[] };
type RequestStatus = RequestItem["status"];
type RequestType = RequestItem["type"];

const STATUS_COLORS: Record<RequestStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

const TYPE_ICONS: Record<RequestType, string> = {
  vacation: "🏖️",
  suggestion: "💡",
  appeal: "📣",
  resignation: "🚪",
};

const TYPE_ACCENT: Record<RequestType, string> = {
  vacation: "bg-[#F33615]",
  suggestion: "bg-[#DBFA00]",
  appeal: "bg-blue-500",
  resignation: "bg-gray-800",
};

export default function AdminVacationsPage() {
  const router = useRouter();
  const { loading: authLoading, logout } = useAuth({ requiredRole: "admin" });
  const { execute } = useRequest();
  const { t, isRTL } = useLang();

  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [filterType, setFilterType] = useState<RequestType | "all">("all");
  const [filterStatus, setFilterStatus] = useState<RequestStatus | "all">("all");
  const [reloadKey, setReloadKey] = useState(0);
  const loadData = useCallback(() => setReloadKey((k) => k + 1), []);

  const executeRef = useRef(execute);
  useEffect(() => { executeRef.current = execute; });

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    async function fetchData() {
      setDataLoading(true); setApiError("");
      try {
        const reqData = await executeRef.current("/api/requests");
        if (cancelled) return;
        setRequests(Array.isArray((reqData as ApiRequestsResponse)?.requests) ? (reqData as ApiRequestsResponse).requests : []);
      } catch (err) {
        if (!cancelled) setApiError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, [authLoading, reloadKey]);

  const updateRequest = async (id: number, status: "approved" | "rejected", type: RequestType) => {
    await execute(`/api/requests/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, source: type === "vacation" ? "vacation" : "request" }) });
    loadData();
  };

  const deleteRequest = async (id: number) => {
    if (!confirm(t("deleteRequest"))) return;
    await execute(`/api/requests/${id}`, { method: "DELETE" });
    setRequests((prev) => prev.filter((r) => r.id !== id));
  };

  const TYPE_LABELS: Record<RequestType, string> = {
    vacation: t("vacation"),
    suggestion: t("suggestion"),
    appeal: t("appeal"),
    resignation: t("resignationLabel"),
  };

  const filteredRequests = requests.filter((r) => {
    const typeMatch = filterType === "all" || r.type === filterType;
    const statusMatch = filterStatus === "all" || r.status === filterStatus;
    return typeMatch && statusMatch;
  });

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;
  const rejectedCount = requests.filter((r) => r.status === "rejected").length;

  const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";

  if (authLoading) return null;

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-white p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* HEADER */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#030405] rounded-2xl p-4 shadow-sm">
          <button onClick={() => router.push("/admin")} className="px-3 sm:px-4 py-2 text-sm text-white rounded-full bg-gradient-to-r from-[#F33615] to-[#ff6b4a]">
            {t("backToDashboard")}
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-white order-last sm:order-none w-full sm:w-auto text-center">{t("vacationsPageTitle")}</h1>
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
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="font-bold text-[#F33615] text-lg flex items-center gap-2">📋 {t("requests")} <span className="text-gray-400 font-normal text-sm">({filteredRequests.length})</span></h2>
            </div>

            {/* STATUS OVERVIEW */}
            <div className="grid grid-cols-3 gap-3 mb-5">
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
            </div>

            {/* FILTERS */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-5 bg-white border border-gray-200 rounded-xl p-2">
              <div className="flex flex-wrap gap-1.5">
                {(["all", "vacation", "suggestion", "appeal", "resignation"] as const).map((type) => (
                  <button key={type} onClick={() => setFilterType(type)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${filterType === type ? "bg-[#030405] text-white" : "text-gray-600 hover:bg-gray-100"}`}>
                    {type === "all" ? t("all") : `${TYPE_ICONS[type]} ${TYPE_LABELS[type]}`}
                  </button>
                ))}
              </div>
              <div className="hidden sm:block w-px h-6 bg-gray-200" />
              <div className="flex flex-wrap gap-1.5">
                {(["all", "pending", "approved", "rejected"] as const).map((s) => (
                  <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${filterStatus === s ? "bg-[#F33615] text-white" : "text-gray-600 hover:bg-gray-100"}`}>
                    {s === "all" ? t("all") : s === "pending" ? t("pending") : s === "approved" ? t("approved") : t("rejected")}
                  </button>
                ))}
              </div>
            </div>

            {filteredRequests.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">{t("noRequests")}</p>
            ) : (
              <div className="space-y-2.5">
                {filteredRequests.map((r) => (
                  <div key={`${r.type}-${r.id}`} className="flex overflow-hidden bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div className={`w-1.5 shrink-0 ${TYPE_ACCENT[r.type]}`} />
                    <div className="flex-1 p-4 flex flex-wrap justify-between items-start gap-4">
                      <div className="flex gap-3 flex-1 min-w-0">
                        <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#030405] text-white text-xs font-bold">
                          {initials(r.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-0.5">
                            <span className="font-semibold text-black text-sm">{r.name}</span>
                            <span className="text-xs text-gray-400">·</span>
                            <span className="text-xs font-medium text-gray-600 flex items-center gap-1">{TYPE_ICONS[r.type]} {TYPE_LABELS[r.type]}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${STATUS_COLORS[r.status]}`}>{r.status}</span>
                          </div>
                          {r.email && <p className="text-xs text-gray-400">{r.email}</p>}
                          {r.type === "vacation" && (r.start ?? r.end) && (
                            <p className="text-xs text-gray-600 mt-1.5">📅 {r.start} → {r.end}{r.days != null ? ` · ${r.days} ${t("days")}` : ""}</p>
                          )}
                          {r.message && <p className="text-sm text-gray-700 mt-2 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 italic">&ldquo;{r.message}&rdquo;</p>}
                          <p className="text-[11px] text-gray-400 mt-2">{r.createdAt ? new Date(r.createdAt).toLocaleString() : ""}</p>
                        </div>
                      </div>
                      <div className="flex sm:flex-col gap-1.5 shrink-0">
                        {r.status === "pending" ? (
                          <>
                            <button onClick={() => updateRequest(r.id, "approved", r.type)} className="px-3 py-1.5 rounded-lg bg-[#030405] text-white text-xs font-semibold hover:bg-green-600 transition whitespace-nowrap">✓ {t("approve")}</button>
                            <button onClick={() => updateRequest(r.id, "rejected", r.type)} className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 text-xs font-semibold hover:border-red-300 hover:text-red-600 transition whitespace-nowrap">✕ {t("reject")}</button>
                          </>
                        ) : (
                          <button onClick={() => updateRequest(r.id, r.status === "approved" ? "rejected" : "approved", r.type)} className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 transition whitespace-nowrap">↩ Undo</button>
                        )}
                        <button onClick={() => deleteRequest(r.id)} className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-400 text-xs font-semibold hover:border-red-300 hover:text-red-600 transition whitespace-nowrap">🗑</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
