"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/app/hooks/useAuth";
import { useRequest } from "@/app/hooks/useRequest";
import { useLang } from "@/app/context/LangContext";
import LangToggle from "@/app/components/LangToggle";

interface User {
  id: number;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  role?: string;
}

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

type ApiUsersResponse = User[];
type ApiRequestsResponse = { requests: RequestItem[] };
type RequestStatus = RequestItem["status"];
type RequestType   = RequestItem["type"];

const STATUS_COLORS: Record<RequestStatus, string> = {
  pending:  "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

const ITEMS_PER_PAGE = 5;

export default function AdminPage() {
  const { loading: authLoading, logout } = useAuth({ requiredRole: "admin" });
  const { execute } = useRequest();
  const { t, isRTL } = useLang();

  const [users,        setUsers]        = useState<User[]>([]);
  const [requests,     setRequests]     = useState<RequestItem[]>([]);
  const [editUser,     setEditUser]     = useState<User | null>(null);
  const [dataLoading,  setDataLoading]  = useState(true);
  const [apiError,     setApiError]     = useState("");
  const [search,       setSearch]       = useState("");
  const [filterType,   setFilterType]   = useState<RequestType | "all">("all");
  const [filterStatus, setFilterStatus] = useState<RequestStatus | "all">("all");
  const [currentPage,  setCurrentPage]  = useState(1);
  const [reloadKey,    setReloadKey]    = useState(0);
  const loadData = useCallback(() => setReloadKey((k) => k + 1), []);

  const executeRef = useRef(execute);
  useEffect(() => { executeRef.current = execute; });

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    async function fetchData() {
      setDataLoading(true); setApiError("");
      try {
        const [usersData, reqData] = await Promise.all([
          executeRef.current("/api/users"),
          executeRef.current("/api/requests"),
        ]);
        if (cancelled) return;
        setUsers(Array.isArray(usersData) ? (usersData as ApiUsersResponse) : []);
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

  const deleteUser = async (id: number) => {
    if (!confirm(t("deleteUser"))) return;
    await execute(`/api/users/${id}`, { method: "DELETE" });
    setUsers((prev) => prev.filter((u) => u.id !== id));
  };

  const saveEdit = async () => {
    if (!editUser) return;
    await execute(`/api/users/edit/${editUser.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: editUser.email, role: editUser.role }) });
    setEditUser(null); loadData();
  };

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
    vacation:    t("vacation"),
    suggestion:  t("suggestion"),
    appeal:      t("appeal"),
    resignation: t("resignationLabel"),
  };

  const filteredRequests = requests.filter((r) => {
    const typeMatch   = filterType   === "all" || r.type   === filterType;
    const statusMatch = filterStatus === "all" || r.status === filterStatus;
    return typeMatch && statusMatch;
  });

  const filteredUsers  = users.filter((u) => `${u.firstName ?? ""} ${u.lastName ?? ""} ${u.email}`.toLowerCase().includes(search.toLowerCase()));
  const totalPages     = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const pendingCount   = requests.filter((r) => r.status === "pending").length;

  if (authLoading) return null;

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-gradient-to-br from-[#d78383] via-[#ecdfdd] to-[#ce908b] p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-[#ec510e] flex items-center gap-2">⚡ {t("adminPanel")}</h1>
          <div className="flex items-center gap-3">
            {pendingCount > 0 && <span className="bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full">{pendingCount} {t("pending")}</span>}
            <LangToggle />
            <button onClick={logout} className="px-4 py-2 rounded-lg bg-white/80 text-[#ec510e] font-semibold border border-[#ec510e]/30 hover:bg-[#ec510e] hover:text-white transition">🚪 {t("logout")}</button>
          </div>
        </div>

        {apiError && (
          <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-xl">
            ❌ {apiError}<button onClick={loadData} className="ml-3 underline text-sm">Retry</button>
          </div>
        )}

        {dataLoading && <div className="text-center py-10 text-[#ec510e] font-semibold text-lg animate-pulse">{t("loading")}</div>}

        {!dataLoading && (
          <>
            <input placeholder={t("searchPlaceholder")} value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              className="w-full p-3 border rounded-xl text-black bg-white/70 focus:outline-none focus:ring-2 focus:ring-[#ec510e]/30" />

            {/* USERS */}
            <div className="bg-white/70 p-5 rounded-xl shadow">
              <h2 className="font-bold mb-3 text-[#ec510e] text-lg">👥 {t("users")} ({filteredUsers.length})</h2>
              {paginatedUsers.length === 0 ? (
                <p className="text-gray-500 text-sm">{t("noUsers")}</p>
              ) : (
                <div className="space-y-2">
                  {paginatedUsers.map((u) => (
                    <div key={u.id} className="flex justify-between items-center p-3 bg-white/60 rounded-lg border border-white/80">
                      <div>
                        <p className="font-medium text-black">{u.firstName} {u.lastName}</p>
                        <p className="text-sm text-gray-500">{u.email}</p>
                        {u.phone && <p className="text-xs text-gray-400">{u.phone}</p>}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${u.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                          {u.role ?? "employee"}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setEditUser(u)} className="px-3 py-1 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition">{t("edit")}</button>
                        <button onClick={() => deleteUser(u.id)} className="px-3 py-1 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition">{t("delete")}</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {totalPages > 1 && (
                <div className="flex gap-2 mt-4 justify-center">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button key={p} onClick={() => setCurrentPage(p)} className={`w-8 h-8 rounded-full text-sm font-semibold ${currentPage === p ? "bg-[#ec510e] text-white" : "bg-white text-gray-700 hover:bg-gray-100"}`}>{p}</button>
                  ))}
                </div>
              )}
            </div>

            {/* REQUESTS */}
            <div className="bg-white/70 p-5 rounded-xl shadow">
              <h2 className="font-bold mb-4 text-[#ec510e] text-lg">📋 {t("requests")} ({filteredRequests.length})</h2>

              <div className="flex flex-wrap gap-2 mb-3">
                <span className="text-sm text-gray-600 self-center font-medium">{t("filterType")}:</span>
                {(["all", "vacation", "suggestion", "appeal", "resignation"] as const).map((type) => (
                  <button key={type} onClick={() => setFilterType(type)} className={`px-3 py-1 rounded-full text-sm font-medium transition ${filterType === type ? "bg-[#ec510e] text-white" : "bg-white text-gray-700 hover:bg-gray-100"}`}>
                    {type === "all" ? t("all") : TYPE_LABELS[type]}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-2 mb-5">
                <span className="text-sm text-gray-600 self-center font-medium">{t("filterStatus")}:</span>
                {(["all", "pending", "approved", "rejected"] as const).map((s) => (
                  <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1 rounded-full text-sm font-medium transition ${filterStatus === s ? "bg-[#ec510e] text-white" : "bg-white text-gray-700 hover:bg-gray-100"}`}>
                    {s === "all" ? t("all") : s === "pending" ? t("pending") : s === "approved" ? t("approved") : t("rejected")}
                  </button>
                ))}
              </div>

              {filteredRequests.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">{t("noRequests")}</p>
              ) : (
                <div className="space-y-3">
                  {filteredRequests.map((r) => (
                    <div key={`${r.type}-${r.id}`} className="p-4 bg-white/60 rounded-xl border border-white/80 shadow-sm">
                      <div className="flex flex-wrap justify-between items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="font-semibold text-[#ec510e]">{TYPE_LABELS[r.type]}</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[r.status]}`}>{r.status.toUpperCase()}</span>
                          </div>
                          <p className="text-sm font-medium text-gray-800">{r.name}</p>
                          {r.email && <p className="text-xs text-gray-500">{r.email}</p>}
                          {r.type === "vacation" && (r.start ?? r.end) && (
                            <p className="text-xs text-gray-600 mt-1">📅 {r.start} → {r.end}{r.days != null ? ` (${r.days} ${t("days")})` : ""}</p>
                          )}
                          {r.message && <p className="text-sm text-gray-700 mt-2 bg-white/60 rounded-lg p-2 italic">&ldquo;{r.message}&rdquo;</p>}
                          <p className="text-xs text-gray-400 mt-2">{r.createdAt ? new Date(r.createdAt).toLocaleString() : ""}</p>
                        </div>
                        <div className="flex flex-col gap-2 min-w-[100px]">
                          {r.status === "pending" ? (
                            <>
                              <button onClick={() => updateRequest(r.id, "approved", r.type)} className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition">✅ {t("approve")}</button>
                              <button onClick={() => updateRequest(r.id, "rejected", r.type)} className="px-3 py-1.5 rounded-lg bg-yellow-500 text-white text-sm font-semibold hover:bg-yellow-600 transition">❌ {t("reject")}</button>
                            </>
                          ) : (
                            <button onClick={() => updateRequest(r.id, r.status === "approved" ? "rejected" : "approved", r.type)} className="px-3 py-1.5 rounded-lg bg-gray-500 text-white text-sm font-semibold hover:bg-gray-600 transition">↩ Undo</button>
                          )}
                          <button onClick={() => deleteRequest(r.id)} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition">🗑 {t("delete")}</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* EDIT MODAL */}
      {editUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div dir={isRTL ? "rtl" : "ltr"} className="bg-white p-6 rounded-xl w-[320px] shadow-xl">
            <h3 className="font-bold text-[#ec510e] mb-4 text-lg">{t("editUser")}</h3>
            <label className="text-sm text-gray-600 block mb-1">{t("email2")}</label>
            <input value={editUser.email} onChange={(e) => setEditUser({ ...editUser, email: e.target.value })} className="w-full p-2 border mb-3 rounded-lg text-black" />
            <label className="text-sm text-gray-600 block mb-1">{t("role")}</label>
            <select value={editUser.role ?? "employee"} onChange={(e) => setEditUser({ ...editUser, role: e.target.value })} className="w-full p-2 border mb-4 rounded-lg text-black">
              <option value="employee">Employee</option>
              <option value="admin">Admin</option>
            </select>
            <button onClick={saveEdit} className="w-full bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 transition">{t("save")}</button>
            <button onClick={() => setEditUser(null)} className="w-full mt-2 text-red-600 font-semibold">{t("cancel")}</button>
          </div>
        </div>
      )}
    </div>
  );
}
