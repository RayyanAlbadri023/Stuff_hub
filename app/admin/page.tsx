"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/hooks/useAuth";
import { useRequest } from "@/app/hooks/useRequest";
import { useLang } from "@/app/context/LangContext";
import LangToggle from "@/app/components/LangToggle";
import { type Nationality } from "@/app/lib/socialInsurance";
import { computeOmanizationStats, DEFAULT_OMANIZATION_SETTINGS, type OmanizationSettings } from "@/app/lib/omanization";
import { getDocStatus, worstStatus, daysUntil, type DocStatus } from "@/app/lib/workPermit";

interface User {
  id: number;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  role?: string;
  baseSalary?: number;
  allowance?: number;
  phoneAllowance?: number;
  transportationAllowance?: number;
  nationality?: Nationality;
  insuranceNumber?: string;
  workPermitNumber?: string;
  workPermitExpiry?: string;
  residencyNumber?: string;
  residencyExpiry?: string;
  passportNumber?: string;
  passportExpiry?: string;
  joinDate?: string;
}

type ApiUsersResponse = User[];

const DOC_STATUS_COLORS: Record<DocStatus, string> = {
  valid:         "bg-green-100 text-green-700",
  expiring_soon: "bg-amber-100 text-amber-700",
  expired:       "bg-red-100 text-red-700",
  missing:       "bg-gray-100 text-gray-500",
};

const ITEMS_PER_PAGE = 5;

export default function AdminPage() {
  const router = useRouter();
  const { loading: authLoading, logout } = useAuth({ requiredRole: "admin" });
  const { execute } = useRequest();
  const { t, isRTL } = useLang();

  const [users,        setUsers]        = useState<User[]>([]);
  const [editUser,     setEditUser]     = useState<User | null>(null);
  const [dataLoading,  setDataLoading]  = useState(true);
  const [apiError,     setApiError]     = useState("");
  const [search,       setSearch]       = useState("");
  const [currentPage,  setCurrentPage]  = useState(1);
  const [reloadKey,    setReloadKey]    = useState(0);
  const loadData = useCallback(() => setReloadKey((k) => k + 1), []);

  const [omanization, setOmanization] = useState<OmanizationSettings>(DEFAULT_OMANIZATION_SETTINGS);
  const [omanizationSavedMsg, setOmanizationSavedMsg] = useState("");

  const executeRef = useRef(execute);
  useEffect(() => { executeRef.current = execute; });

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    async function fetchData() {
      setDataLoading(true); setApiError("");
      try {
        const [usersData, omanizationData] = await Promise.all([
          executeRef.current("/api/users"),
          executeRef.current("/api/settings/omanization"),
        ]);
        if (cancelled) return;
        setUsers(Array.isArray(usersData) ? (usersData as ApiUsersResponse) : []);
        if (omanizationData && typeof omanizationData === "object") setOmanization({ ...DEFAULT_OMANIZATION_SETTINGS, ...(omanizationData as Partial<OmanizationSettings>) });
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
    await execute(`/api/users/edit/${editUser.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: editUser.email,
        role: editUser.role,
        baseSalary: editUser.baseSalary ?? 0,
        allowance: editUser.allowance ?? 0,
        phoneAllowance: editUser.phoneAllowance ?? 0,
        transportationAllowance: editUser.transportationAllowance ?? 0,
        nationality: editUser.nationality ?? "omani",
        insuranceNumber: editUser.insuranceNumber ?? "",
        workPermitNumber: editUser.workPermitNumber ?? "",
        workPermitExpiry: editUser.workPermitExpiry ?? "",
        residencyNumber: editUser.residencyNumber ?? "",
        residencyExpiry: editUser.residencyExpiry ?? "",
        passportNumber: editUser.passportNumber ?? "",
        passportExpiry: editUser.passportExpiry ?? "",
        joinDate: editUser.joinDate ?? "",
      }),
    });
    setEditUser(null); loadData();
  };

  const saveOmanization = async () => {
    const updated = await execute("/api/settings/omanization", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(omanization),
    });
    if (updated && typeof updated === "object") setOmanization({ ...DEFAULT_OMANIZATION_SETTINGS, ...(updated as Partial<OmanizationSettings>) });
    setOmanizationSavedMsg(t("targetSaved"));
    setTimeout(() => setOmanizationSavedMsg(""), 2500);
  };

  const omanizationStats = computeOmanizationStats(users.map((u) => u.nationality), omanization);

  const expatDocRows = users
    .filter((u) => u.nationality === "expat")
    .map((u) => ({
      user: u,
      status: worstStatus(u),
      workPermitStatus: getDocStatus(u.workPermitExpiry),
      residencyStatus: getDocStatus(u.residencyExpiry),
    }));
  const expiringOrExpiredCount = expatDocRows.filter((r) => r.status === "expiring_soon" || r.status === "expired").length;

  const DOC_STATUS_LABELS: Record<DocStatus, string> = {
    valid: t("docStatusValid"),
    expiring_soon: t("docStatusExpiringSoon"),
    expired: t("docStatusExpired"),
    missing: t("docStatusMissing"),
  };

  const filteredUsers  = users.filter((u) => `${u.firstName ?? ""} ${u.lastName ?? ""} ${u.email}`.toLowerCase().includes(search.toLowerCase()));
  const totalPages     = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  if (authLoading) return null;

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-white p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* HEADER */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#030405] rounded-2xl p-4 shadow-sm">
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">⚡ {t("adminPanel")}</h1>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <LangToggle dark />
            <button onClick={logout} className="px-3 sm:px-4 py-2 text-sm rounded-lg bg-white/10 text-white font-semibold border border-white/20 hover:bg-[#F33615] hover:border-[#F33615] transition">🚪 {t("logout")}</button>
          </div>
        </div>

        {/* QUICK LINKS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button onClick={() => router.push("/admin/vacations")} className="flex items-center justify-center gap-2 py-4 rounded-xl bg-gray-50 border border-gray-200 hover:border-[#F33615] hover:bg-white transition font-semibold text-black">
            {t("navVacations")}
          </button>
          <button onClick={() => router.push("/admin/salaries")} className="flex items-center justify-center gap-2 py-4 rounded-xl bg-gray-50 border border-gray-200 hover:border-[#F33615] hover:bg-white transition font-semibold text-black">
            {t("navSalaries")}
          </button>
          <button onClick={() => router.push("/admin/tasks")} className="flex items-center justify-center gap-2 py-4 rounded-xl bg-gray-50 border border-gray-200 hover:border-[#F33615] hover:bg-white transition font-semibold text-black">
            {t("navTasks")}
          </button>
          <button onClick={() => router.push("/admin/expenses")} className="flex items-center justify-center gap-2 py-4 rounded-xl bg-gray-50 border border-gray-200 hover:border-[#F33615] hover:bg-white transition font-semibold text-black">
            {t("navExpenses")}
          </button>
        </div>

        {apiError && (
          <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-xl">
            ❌ {apiError}<button onClick={loadData} className="ml-3 underline text-sm">Retry</button>
          </div>
        )}

        {dataLoading && <div className="text-center py-10 text-[#F33615] font-semibold text-lg animate-pulse">{t("loading")}</div>}

        {!dataLoading && (
          <>
            <input placeholder={t("searchPlaceholder")} value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              className="w-full p-3 border border-gray-200 rounded-xl text-black bg-white focus:outline-none focus:ring-2 focus:ring-[#F33615]/30" />

            {/* USERS */}
            <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
              <h2 className="font-bold mb-3 text-[#F33615] text-lg">👥 {t("users")} ({filteredUsers.length})</h2>
              {paginatedUsers.length === 0 ? (
                <p className="text-gray-500 text-sm">{t("noUsers")}</p>
              ) : (
                <div className="space-y-2">
                  {paginatedUsers.map((u) => (
                    <div key={u.id} className="flex flex-wrap gap-3 justify-between items-center p-3 bg-white rounded-lg border border-gray-200">
                      <div className="min-w-0">
                        <p className="font-medium text-black break-words">{u.firstName} {u.lastName}</p>
                        <p className="text-sm text-gray-500 break-words">{u.email}</p>
                        {u.phone && <p className="text-xs text-gray-400">{u.phone}</p>}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${u.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                          {u.role ?? "employee"}
                        </span>
                        <span className={`ml-1.5 text-xs px-2 py-0.5 rounded-full font-semibold ${u.nationality === "expat" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                          {u.nationality === "expat" ? t("expat") : t("omani")}
                        </span>
                        {!!u.baseSalary && (
                          <span className="ml-2 text-xs text-gray-500">{t("baseSalary")}: {u.baseSalary}</span>
                        )}
                      </div>
                      <div className="flex gap-2 flex-wrap">
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
                    <button key={p} onClick={() => setCurrentPage(p)} className={`w-8 h-8 rounded-full text-sm font-semibold ${currentPage === p ? "bg-[#F33615] text-white" : "bg-white text-gray-700 hover:bg-gray-100"}`}>{p}</button>
                  ))}
                </div>
              )}
            </div>

            {/* OMANIZATION */}
            <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
              <h2 className="font-bold mb-1 text-[#F33615] text-lg">🇴🇲 {t("omanizationTitle")}</h2>
              <p className="text-xs text-gray-500 mb-4">{t("omanizationNote")}</p>

              {/* TARGET SETTINGS */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">{t("sectorLabel")}</label>
                    <input
                      value={omanization.sectorLabel}
                      onChange={(e) => setOmanization({ ...omanization, sectorLabel: e.target.value })}
                      className="w-full p-2 border rounded-lg text-black text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">{t("targetPercentage")}</label>
                    <input
                      type="number"
                      step="0.5"
                      value={omanization.targetPercentage}
                      onChange={(e) => setOmanization({ ...omanization, targetPercentage: Number(e.target.value) })}
                      className="w-full p-2 border rounded-lg text-black text-sm"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <button onClick={saveOmanization} className="px-4 py-2 rounded-lg text-white text-sm font-semibold bg-[#030405] hover:bg-[#F33615] transition">{t("saveTarget")}</button>
                  {omanizationSavedMsg && <span className="text-green-600 text-sm font-medium">{omanizationSavedMsg}</span>}
                </div>
              </div>

              {/* OVERVIEW */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="bg-white rounded-xl p-3 text-center border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">{t("totalEmployees")}</p>
                  <p className="text-2xl font-bold text-gray-700">{omanizationStats.totalEmployees}</p>
                </div>
                <div className="bg-white rounded-xl p-3 text-center border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">{t("omaniCount")}</p>
                  <p className="text-2xl font-bold text-emerald-600">{omanizationStats.omaniCount}</p>
                </div>
                <div className="bg-white rounded-xl p-3 text-center border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">{t("expatCount")}</p>
                  <p className="text-2xl font-bold text-amber-600">{omanizationStats.expatCount}</p>
                </div>
                <div className={`rounded-xl p-3 text-center border ${omanizationStats.compliant ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                  <p className="text-xs text-gray-500 mb-1">{t("currentPercentage")}</p>
                  <p className={`text-2xl font-bold ${omanizationStats.compliant ? "text-green-600" : "text-red-600"}`}>{omanizationStats.currentPercentage}%</p>
                </div>
              </div>

              {/* PROGRESS BAR */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex justify-between items-center mb-2 text-xs text-gray-600">
                  <span>{t("currentPercentage")}: {omanizationStats.currentPercentage}%</span>
                  <span>{t("targetPercentage")}: {omanizationStats.targetPercentage}%</span>
                </div>
                <div className="relative w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${omanizationStats.compliant ? "bg-green-500" : "bg-[#F33615]"}`}
                    style={{ width: `${Math.min(100, omanizationStats.currentPercentage)}%` }}
                  />
                  <div className="absolute top-0 bottom-0 w-0.5 bg-gray-700" style={{ left: `${Math.min(100, omanizationStats.targetPercentage)}%` }} />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${omanizationStats.compliant ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {omanizationStats.compliant ? `✓ ${t("compliant")}` : `⚠ ${t("nonCompliant")}`}
                  </span>
                  {!omanizationStats.compliant && omanizationStats.gapCount > 0 && (
                    <span className="text-xs text-gray-600">{t("omaniHiresNeeded")}: <strong>{omanizationStats.gapCount}</strong></span>
                  )}
                </div>
              </div>
            </div>

            {/* WORK PERMITS & RESIDENCY */}
            <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
                <h2 className="font-bold text-[#F33615] text-lg">🛂 {t("workPermitTitle")}</h2>
                {expiringOrExpiredCount > 0 && (
                  <span className="bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full">{expiringOrExpiredCount} {t("docStatusExpiringSoon")}</span>
                )}
              </div>
              <p className="text-xs text-gray-500 mb-4">{t("workPermitNote")}</p>

              {expatDocRows.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-6 bg-white rounded-xl border border-gray-200">{t("noExpats")}</p>
              ) : (
                <div className="overflow-x-auto bg-white rounded-xl border border-gray-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-600 border-b border-gray-200">
                        <th className="text-start py-2 px-3">{t("users")}</th>
                        <th className="text-start py-2 px-3">{t("workPermitExpiry")}</th>
                        <th className="text-start py-2 px-3">{t("residencyExpiry")}</th>
                        <th className="text-start py-2 px-3">{t("passportExpiry")}</th>
                        <th className="text-start py-2 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expatDocRows.map(({ user: u, status, workPermitStatus, residencyStatus }) => {
                        const wpDays = daysUntil(u.workPermitExpiry);
                        const resDays = daysUntil(u.residencyExpiry);
                        return (
                          <tr key={u.id} className="border-b border-gray-100">
                            <td className="py-2 px-3 text-black">{u.firstName} {u.lastName}</td>
                            <td className="py-2 px-3">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${DOC_STATUS_COLORS[workPermitStatus]}`}>
                                {u.workPermitExpiry || "—"} {wpDays !== null && (wpDays >= 0 ? `(${wpDays} ${t("daysLeft")})` : `(${Math.abs(wpDays)} ${t("daysOverdue")})`)}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${DOC_STATUS_COLORS[residencyStatus]}`}>
                                {u.residencyExpiry || "—"} {resDays !== null && (resDays >= 0 ? `(${resDays} ${t("daysLeft")})` : `(${Math.abs(resDays)} ${t("daysOverdue")})`)}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-gray-600">{u.passportExpiry || "—"}</td>
                            <td className="py-2 px-3">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${DOC_STATUS_COLORS[status]}`}>{DOC_STATUS_LABELS[status]}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* EDIT MODAL */}
      {editUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div dir={isRTL ? "rtl" : "ltr"} className="bg-white p-6 rounded-xl w-full max-w-sm shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-[#F33615] mb-4 text-lg">{t("editUser")}</h3>
            <label className="text-sm text-gray-600 block mb-1">{t("email2")}</label>
            <input value={editUser.email} onChange={(e) => setEditUser({ ...editUser, email: e.target.value })} className="w-full p-2 border mb-3 rounded-lg text-black" />
            <label className="text-sm text-gray-600 block mb-1">{t("role")}</label>
            <select value={editUser.role ?? "employee"} onChange={(e) => setEditUser({ ...editUser, role: e.target.value })} className="w-full p-2 border mb-4 rounded-lg text-black">
              <option value="employee">Employee</option>
              <option value="admin">Admin</option>
            </select>

            <h4 className="font-semibold text-[#F33615] mb-2 text-sm">🪪 {t("socialInsuranceTitle")}</h4>
            <label className="text-sm text-gray-600 block mb-1">{t("nationality")}</label>
            <select value={editUser.nationality ?? "omani"} onChange={(e) => setEditUser({ ...editUser, nationality: e.target.value as Nationality })} className="w-full p-2 border mb-3 rounded-lg text-black">
              <option value="omani">{t("omani")}</option>
              <option value="expat">{t("expat")}</option>
            </select>
            <label className="text-sm text-gray-600 block mb-1">{t("insuranceNumber")}</label>
            <input value={editUser.insuranceNumber ?? ""} onChange={(e) => setEditUser({ ...editUser, insuranceNumber: e.target.value })} className="w-full p-2 border mb-3 rounded-lg text-black" />
            <label className="text-sm text-gray-600 block mb-1">{t("joinDate")}</label>
            <input type="date" value={editUser.joinDate ?? ""} onChange={(e) => setEditUser({ ...editUser, joinDate: e.target.value })} className="w-full p-2 border mb-4 rounded-lg text-black" />

            {editUser.nationality === "expat" && (
              <>
                <h4 className="font-semibold text-[#F33615] mb-2 text-sm">🛂 {t("workPermitTitle")}</h4>
                <label className="text-sm text-gray-600 block mb-1">{t("workPermitNumber")}</label>
                <input value={editUser.workPermitNumber ?? ""} onChange={(e) => setEditUser({ ...editUser, workPermitNumber: e.target.value })} className="w-full p-2 border mb-3 rounded-lg text-black" />
                <label className="text-sm text-gray-600 block mb-1">{t("workPermitExpiry")}</label>
                <input type="date" value={editUser.workPermitExpiry ?? ""} onChange={(e) => setEditUser({ ...editUser, workPermitExpiry: e.target.value })} className="w-full p-2 border mb-3 rounded-lg text-black" />
                <label className="text-sm text-gray-600 block mb-1">{t("residencyNumber")}</label>
                <input value={editUser.residencyNumber ?? ""} onChange={(e) => setEditUser({ ...editUser, residencyNumber: e.target.value })} className="w-full p-2 border mb-3 rounded-lg text-black" />
                <label className="text-sm text-gray-600 block mb-1">{t("residencyExpiry")}</label>
                <input type="date" value={editUser.residencyExpiry ?? ""} onChange={(e) => setEditUser({ ...editUser, residencyExpiry: e.target.value })} className="w-full p-2 border mb-3 rounded-lg text-black" />
                <label className="text-sm text-gray-600 block mb-1">{t("passportNumber")}</label>
                <input value={editUser.passportNumber ?? ""} onChange={(e) => setEditUser({ ...editUser, passportNumber: e.target.value })} className="w-full p-2 border mb-3 rounded-lg text-black" />
                <label className="text-sm text-gray-600 block mb-1">{t("passportExpiry")}</label>
                <input type="date" value={editUser.passportExpiry ?? ""} onChange={(e) => setEditUser({ ...editUser, passportExpiry: e.target.value })} className="w-full p-2 border mb-4 rounded-lg text-black" />
              </>
            )}

            <h4 className="font-semibold text-[#F33615] mb-2 text-sm">💰 {t("salaryBreakdown")}</h4>
            <label className="text-sm text-gray-600 block mb-1">{t("baseSalary")}</label>
            <input type="number" value={editUser.baseSalary ?? 0} onChange={(e) => setEditUser({ ...editUser, baseSalary: Number(e.target.value) })} className="w-full p-2 border mb-3 rounded-lg text-black" />
            <label className="text-sm text-gray-600 block mb-1">{t("allowance")}</label>
            <input type="number" value={editUser.allowance ?? 0} onChange={(e) => setEditUser({ ...editUser, allowance: Number(e.target.value) })} className="w-full p-2 border mb-3 rounded-lg text-black" />
            <label className="text-sm text-gray-600 block mb-1">{t("phoneAllowance")}</label>
            <input type="number" value={editUser.phoneAllowance ?? 0} onChange={(e) => setEditUser({ ...editUser, phoneAllowance: Number(e.target.value) })} className="w-full p-2 border mb-3 rounded-lg text-black" />
            <label className="text-sm text-gray-600 block mb-1">{t("transportationAllowance")}</label>
            <input type="number" value={editUser.transportationAllowance ?? 0} onChange={(e) => setEditUser({ ...editUser, transportationAllowance: Number(e.target.value) })} className="w-full p-2 border mb-4 rounded-lg text-black" />

            <button onClick={saveEdit} className="w-full bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 transition">{t("save")}</button>
            <button onClick={() => setEditUser(null)} className="w-full mt-2 text-red-600 font-semibold">{t("cancel")}</button>
          </div>
        </div>
      )}
    </div>
  );
}
