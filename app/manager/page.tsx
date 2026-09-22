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
import { exportToExcel, parseExcelFile } from "@/app/lib/excelUtils";
import { downloadMonthlyReport } from "@/app/lib/monthlyReport";

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
  otherAllowance?: number;
  nationality?: Nationality;
  insuranceNumber?: string;
  workPermitNumber?: string;
  workPermitExpiry?: string;
  residencyNumber?: string;
  residencyExpiry?: string;
  passportNumber?: string;
  passportExpiry?: string;
  joinDate?: string;
  contractType?: string;
  contractStart?: string;
  contractEnd?: string;
  contractFile?: string;
  contractFileName?: string;
  personalIdFile?: string;
  personalIdFileName?: string;
  certifiedCvFile?: string;
  certifiedCvFileName?: string;
}

type ApiUsersResponse = User[];

const DOC_STATUS_COLORS: Record<DocStatus, string> = {
  valid:         "bg-green-100 text-green-700",
  expiring_soon: "bg-amber-100 text-amber-700",
  expired:       "bg-red-100 text-red-700",
  missing:       "bg-gray-100 text-gray-500",
};

const ITEMS_PER_PAGE = 5;

export default function ManagerPage() {
  const router = useRouter();
  const { loading: authLoading, logout } = useAuth({ requiredRole: "manager" });
  const { execute } = useRequest();
  const { t, isRTL } = useLang();

  const [users,        setUsers]        = useState<User[]>([]);
  const [dataLoading,  setDataLoading]  = useState(true);
  const [apiError,     setApiError]     = useState("");
  const [search,       setSearch]       = useState("");
  const [currentPage,  setCurrentPage]  = useState(1);
  const [reloadKey,    setReloadKey]    = useState(0);
  const loadData = useCallback(() => setReloadKey((k) => k + 1), []);

  const [omanization, setOmanization] = useState<OmanizationSettings>(DEFAULT_OMANIZATION_SETTINGS);
  const [omanizationSavedMsg, setOmanizationSavedMsg] = useState("");

  const importFileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");
  const [reportLoading, setReportLoading] = useState(false);

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

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true); setImportMsg("");
    try {
      const rows = await parseExcelFile(file);
      const res = await execute("/api/users/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const r = res as { createdCount?: number; skipped?: { row: number; reason: string }[] } | null;
      if (r) {
        const created = r.createdCount ?? 0;
        const skippedCount = r.skipped?.length ?? 0;
        setImportMsg(`${t("importDone")}: ${created} ${t("importCreated")}${skippedCount ? `, ${skippedCount} ${t("importSkipped")}` : ""}`);
        loadData();
      } else {
        setImportMsg(t("importFailed"));
      }
    } catch {
      setImportMsg(t("importFailed"));
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  const handleExportUsers = () => {
    exportToExcel("employees", "Employees", filteredUsers.map((u) => ({
      "First Name": u.firstName ?? "",
      "Last Name": u.lastName ?? "",
      Email: u.email,
      Phone: u.phone ?? "",
      Role: u.role ?? "employee",
      Nationality: u.nationality === "expat" ? "Expat" : "Omani",
      "Base Salary": u.baseSalary ?? 0,
      "Join Date": u.joinDate ?? "",
    })));
  };

  const EXPORT_STATUS_LABELS: Record<DocStatus, string> = {
    valid: "Valid",
    expiring_soon: "Expiring Soon",
    expired: "Expired",
    missing: "Not on file",
  };

  const handleExportDocuments = () => {
    exportToExcel("work-permits-residency", "Documents", allDocRows.map(({ user: u, isExpat, status }) => ({
      Employee: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim(),
      "Work Permit Expiry": isExpat ? (u.workPermitExpiry || "—") : "—",
      "Resident Card Expiry": isExpat ? (u.residencyExpiry || "—") : "—",
      "Passport Expiry": isExpat ? (u.passportExpiry || "—") : "—",
      "Personal ID": isExpat ? "—" : (u.personalIdFile ? "On file" : "Not on file"),
      "Certified CV": isExpat ? "—" : (u.certifiedCvFile ? "On file" : "Not on file"),
      Status: status === "valid" && !isExpat ? "On file" : EXPORT_STATUS_LABELS[status],
    })));
  };

  const handleDownloadReport = async () => {
    setReportLoading(true);
    try {
      const [reqData, expData, taskData] = await Promise.all([
        execute("/api/requests"),
        execute("/api/expenses"),
        execute("/api/tasks"),
      ]);
      const requests = Array.isArray((reqData as { requests?: unknown[] } | null)?.requests)
        ? ((reqData as { requests: any[] }).requests)
        : [];
      const expensesList = Array.isArray((expData as { expenses?: unknown[] } | null)?.expenses)
        ? ((expData as { expenses: any[] }).expenses)
        : [];
      const tasksList = Array.isArray((taskData as { tasks?: unknown[] } | null)?.tasks)
        ? ((taskData as { tasks: any[] }).tasks)
        : [];
      await downloadMonthlyReport({
        omanizationStats,
        requests,
        expenses: expensesList,
        tasks: tasksList,
        companyLabel: omanization.sectorLabel || undefined,
      });
    } finally {
      setReportLoading(false);
    }
  };

  const omanizationStats = computeOmanizationStats(users.map((u) => u.nationality), omanization);

  // Unified compliance-documents table: expatriates are tracked by work
  // permit / resident card / passport expiry, Omani employees by whether
  // their personal ID and certified CV are on file. Both nationalities show
  // in one list so HR has a single place to check everyone's status.
  const allDocRows = users.map((u) => {
    const isExpat = u.nationality === "expat";
    if (isExpat) {
      return {
        user: u,
        isExpat,
        workPermitStatus: getDocStatus(u.workPermitExpiry),
        residencyStatus: getDocStatus(u.residencyExpiry),
        idOnFile: false,
        cvOnFile: false,
        status: worstStatus(u),
      };
    }
    const idOnFile = !!u.personalIdFile;
    const cvOnFile = !!u.certifiedCvFile;
    return {
      user: u,
      isExpat,
      workPermitStatus: "missing" as DocStatus,
      residencyStatus: "missing" as DocStatus,
      idOnFile,
      cvOnFile,
      status: (idOnFile && cvOnFile ? "valid" : "missing") as DocStatus,
    };
  });
  const needsAttentionCount = allDocRows.filter((r) => r.status !== "valid").length;

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
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">{t("managerPanel")}</h1>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button onClick={handleDownloadReport} disabled={reportLoading} className="px-3 sm:px-4 py-2 text-sm rounded-lg bg-white/10 text-white font-semibold border border-white/20 hover:bg-[#F33615] hover:border-[#F33615] transition disabled:opacity-60">
              📄 {reportLoading ? t("sending") : t("monthlyReport")}
            </button>
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
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <h2 className="font-bold text-[#F33615] text-lg">👥 {t("users")} ({filteredUsers.length})</h2>
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={handleExportUsers} className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 text-xs font-semibold hover:border-[#F33615] hover:text-[#F33615] transition">
                    📤 {t("exportExcel")}
                  </button>
                  <button onClick={() => importFileInputRef.current?.click()} disabled={importing} className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 text-xs font-semibold hover:border-[#F33615] hover:text-[#F33615] transition disabled:opacity-60">
                    📥 {importing ? t("sending") : t("importExcel")}
                  </button>
                  <input ref={importFileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImportFile} className="hidden" />
                </div>
              </div>
              {importMsg && <p className="text-xs text-gray-600 mb-3">{importMsg}</p>}
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
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${u.role === "admin" ? "bg-purple-100 text-purple-700" : u.role === "manager" ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"}`}>
                          {u.role ?? "employee"}
                        </span>
                        {!!u.baseSalary && (
                          <span className="ml-2 text-xs text-gray-500">{t("baseSalary")}: {u.baseSalary}</span>
                        )}
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <button onClick={() => router.push(`/admin/employee?id=${u.id}`)} className="px-3 py-1 rounded-lg bg-[#F33615] text-white text-sm font-semibold hover:bg-[#d92c0f] transition">{t("viewProfile")}</button>
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

            {/* WORK PERMITS & RESIDENCY (all employees) */}
            <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
                <h2 className="font-bold text-[#F33615] text-lg">🛂 {t("workPermitTitle")}</h2>
                <div className="flex flex-wrap items-center gap-2">
                  {needsAttentionCount > 0 && (
                    <span className="bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full">{needsAttentionCount} {t("needsAttention")}</span>
                  )}
                  <button onClick={handleExportDocuments} className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 text-xs font-semibold hover:border-[#F33615] hover:text-[#F33615] transition">
                    📤 {t("exportExcel")}
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-4">{t("workPermitNote")}</p>

              {allDocRows.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-6 bg-white rounded-xl border border-gray-200">{t("noUsers")}</p>
              ) : (
                <div className="overflow-x-auto bg-white rounded-xl border border-gray-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-600 border-b border-gray-200">
                        <th className="text-start py-2 px-3">{t("users")}</th>
                        <th className="text-start py-2 px-3">{t("workPermitExpiry")}</th>
                        <th className="text-start py-2 px-3">{t("residencyExpiry")}</th>
                        <th className="text-start py-2 px-3">{t("passportExpiry")}</th>
                        <th className="text-start py-2 px-3">{t("personalIdDocument")}</th>
                        <th className="text-start py-2 px-3">{t("certifiedCvDocument")}</th>
                        <th className="text-start py-2 px-3">{t("status")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allDocRows.map(({ user: u, isExpat, status, workPermitStatus, residencyStatus, idOnFile, cvOnFile }) => {
                        const wpDays = daysUntil(u.workPermitExpiry);
                        const resDays = daysUntil(u.residencyExpiry);
                        return (
                          <tr key={u.id} className="border-b border-gray-100">
                            <td className="py-2 px-3 text-black">{u.firstName} {u.lastName}</td>
                            {isExpat ? (
                              <>
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
                                <td className="py-2 px-3 text-gray-400">—</td>
                                <td className="py-2 px-3 text-gray-400">—</td>
                              </>
                            ) : (
                              <>
                                <td className="py-2 px-3 text-gray-400">—</td>
                                <td className="py-2 px-3 text-gray-400">—</td>
                                <td className="py-2 px-3 text-gray-400">—</td>
                                <td className="py-2 px-3">
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${idOnFile ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                                    {idOnFile ? t("docStatusOnFile") : t("docStatusMissing")}
                                  </span>
                                </td>
                                <td className="py-2 px-3">
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${cvOnFile ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                                    {cvOnFile ? t("docStatusOnFile") : t("docStatusMissing")}
                                  </span>
                                </td>
                              </>
                            )}
                            <td className="py-2 px-3">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${status === "valid" ? "bg-green-100 text-green-700" : DOC_STATUS_COLORS[status]}`}>
                                {status === "valid" && !isExpat ? t("docStatusOnFile") : DOC_STATUS_LABELS[status]}
                              </span>
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

    </div>
  );
}
