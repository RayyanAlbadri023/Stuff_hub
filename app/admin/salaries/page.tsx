"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth, ADMIN_OR_MANAGER } from "@/app/hooks/useAuth";
import { useRequest } from "@/app/hooks/useRequest";
import { useLang } from "@/app/context/LangContext";
import LangToggle from "@/app/components/LangToggle";
import {
  computeSocialInsurance,
  DEFAULT_SOCIAL_INSURANCE_RATES,
  SOCIAL_INSURANCE_RATE_KEYS,
  type SocialInsuranceRates,
  type Nationality,
} from "@/app/lib/socialInsurance";
import { computeGratuity, DEFAULT_GRATUITY_SETTINGS, type GratuitySettings } from "@/app/lib/gratuity";
import { exportToExcel } from "@/app/lib/excelUtils";

interface User {
  id: number;
  firstName?: string;
  lastName?: string;
  email: string;
  baseSalary?: number;
  allowance?: number;
  phoneAllowance?: number;
  transportationAllowance?: number;
  otherAllowance?: number;
  nationality?: Nationality;
  joinDate?: string;
}

type ApiUsersResponse = User[];

const RATE_LABEL_KEYS: Record<(typeof SOCIAL_INSURANCE_RATE_KEYS)[number], "rate_pensionEmployee" | "rate_pensionEmployer" | "rate_jobSecurityEmployee" | "rate_jobSecurityEmployer" | "rate_occInjuryEmployer"> = {
  pensionEmployeeRate: "rate_pensionEmployee",
  pensionEmployerRate: "rate_pensionEmployer",
  jobSecurityEmployeeRate: "rate_jobSecurityEmployee",
  jobSecurityEmployerRate: "rate_jobSecurityEmployer",
  occupationalInjuryEmployerRate: "rate_occInjuryEmployer",
};

export default function AdminSalariesPage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth({ requiredRole: ADMIN_OR_MANAGER });
  const { execute } = useRequest();
  const { t, isRTL } = useLang();

  const [users, setUsers] = useState<User[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const loadData = useCallback(() => setReloadKey((k) => k + 1), []);

  const [rates, setRates] = useState<SocialInsuranceRates>(DEFAULT_SOCIAL_INSURANCE_RATES);
  const [ratesSavedMsg, setRatesSavedMsg] = useState("");
  const [gratuitySettings, setGratuitySettings] = useState<GratuitySettings>(DEFAULT_GRATUITY_SETTINGS);
  const [gratuitySavedMsg, setGratuitySavedMsg] = useState("");

  const executeRef = useRef(execute);
  useEffect(() => { executeRef.current = execute; });

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    async function fetchData() {
      setDataLoading(true); setApiError("");
      try {
        const [usersData, ratesData, gratuityData] = await Promise.all([
          executeRef.current("/api/users"),
          executeRef.current("/api/settings/social-insurance"),
          executeRef.current("/api/settings/gratuity"),
        ]);
        if (cancelled) return;
        setUsers(Array.isArray(usersData) ? (usersData as ApiUsersResponse) : []);
        if (ratesData && typeof ratesData === "object") setRates({ ...DEFAULT_SOCIAL_INSURANCE_RATES, ...(ratesData as Partial<SocialInsuranceRates>) });
        if (gratuityData && typeof gratuityData === "object") setGratuitySettings({ ...DEFAULT_GRATUITY_SETTINGS, ...(gratuityData as Partial<GratuitySettings>) });
      } catch (err) {
        if (!cancelled) setApiError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, [authLoading, reloadKey]);

  const saveRates = async () => {
    const updated = await execute("/api/settings/social-insurance", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rates),
    });
    if (updated && typeof updated === "object") setRates({ ...DEFAULT_SOCIAL_INSURANCE_RATES, ...(updated as Partial<SocialInsuranceRates>) });
    setRatesSavedMsg(t("ratesSaved"));
    setTimeout(() => setRatesSavedMsg(""), 2500);
  };

  const saveGratuitySettings = async () => {
    const updated = await execute("/api/settings/gratuity", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(gratuitySettings),
    });
    if (updated && typeof updated === "object") setGratuitySettings({ ...DEFAULT_GRATUITY_SETTINGS, ...(updated as Partial<GratuitySettings>) });
    setGratuitySavedMsg(t("gratuitySettingsSaved"));
    setTimeout(() => setGratuitySavedMsg(""), 2500);
  };

  const insuranceRows = users.map((u) => ({
    user: u,
    breakdown: computeSocialInsurance(u.nationality ?? "omani", u.baseSalary ?? 0, u.allowance ?? 0, rates),
  }));
  const totalEmployerCost = insuranceRows.reduce((sum, r) => sum + r.breakdown.employerShare, 0);
  const totalEmployeeDeductions = insuranceRows.reduce((sum, r) => sum + r.breakdown.employeeShare, 0);

  const gratuityRows = users.map((u) => ({
    user: u,
    breakdown: computeGratuity(u.baseSalary ?? 0, u.joinDate, u.nationality ?? "omani", gratuitySettings),
  }));
  const totalAccruedLiability = gratuityRows.reduce((sum, r) => sum + r.breakdown.totalAmount, 0);

  const totalMonthlyPayroll = users.reduce((sum, u) => sum + (u.baseSalary ?? 0) + (u.allowance ?? 0) + (u.phoneAllowance ?? 0) + (u.transportationAllowance ?? 0) + (u.otherAllowance ?? 0), 0);

  const handleExportSalaries = () => {
    exportToExcel("salaries", "Salaries", users.map((u) => {
      const total = (u.baseSalary ?? 0) + (u.allowance ?? 0) + (u.phoneAllowance ?? 0) + (u.transportationAllowance ?? 0) + (u.otherAllowance ?? 0);
      return {
        Employee: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim(),
        "Base Salary": u.baseSalary ?? 0,
        Allowance: u.allowance ?? 0,
        "Phone Allowance": u.phoneAllowance ?? 0,
        "Transportation Allowance": u.transportationAllowance ?? 0,
        "Other Allowance": u.otherAllowance ?? 0,
        "Total Salary": total,
      };
    }));
  };

  if (authLoading) return null;

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-white p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* HEADER */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#030405] rounded-2xl p-4 shadow-sm">
          <button onClick={() => router.push(user?.role === "manager" ? "/manager" : "/admin")} className="px-3 sm:px-4 py-2 text-sm text-white rounded-full bg-gradient-to-r from-[#F33615] to-[#ff6b4a]">
            {t("backToDashboard")}
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-white order-last sm:order-none w-full sm:w-auto text-center">{t("salariesPageTitle")}</h1>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
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
          <>
            {/* PAYROLL SUMMARY */}
            <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <h2 className="font-bold text-[#F33615] text-lg">💵 {t("salaryBreakdown")}</h2>
                <button onClick={handleExportSalaries} className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 text-xs font-semibold hover:border-[#F33615] hover:text-[#F33615] transition">
                  📤 {t("exportExcel")}
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                <div className="bg-white rounded-xl p-3 text-center border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">{t("users")}</p>
                  <p className="text-2xl font-bold text-gray-700">{users.length}</p>
                </div>
                <div className="bg-white rounded-xl p-3 text-center border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">{t("totalSalary")}</p>
                  <p className="text-2xl font-bold text-[#F33615]">{totalMonthlyPayroll.toFixed(2)}</p>
                </div>
                <div className="bg-white rounded-xl p-3 text-center border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">{t("totalAccruedLiability")}</p>
                  <p className="text-2xl font-bold text-[#F33615]">{totalAccruedLiability.toFixed(2)}</p>
                </div>
              </div>
              <div className="overflow-x-auto bg-white rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-600 border-b border-gray-200">
                      <th className="text-start py-2 px-3">{t("users")}</th>
                      <th className="text-start py-2 px-3">{t("baseSalary")}</th>
                      <th className="text-start py-2 px-3">{t("allowance")}</th>
                      <th className="text-start py-2 px-3">{t("phoneAllowance")}</th>
                      <th className="text-start py-2 px-3">{t("transportationAllowance")}</th>
                      <th className="text-start py-2 px-3">{t("otherAllowance")}</th>
                      <th className="text-start py-2 px-3 font-bold">{t("totalSalary")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length === 0 ? (
                      <tr><td colSpan={7} className="text-center text-gray-500 py-6">{t("noUsers")}</td></tr>
                    ) : (
                      users.map((u) => {
                        const total = (u.baseSalary ?? 0) + (u.allowance ?? 0) + (u.phoneAllowance ?? 0) + (u.transportationAllowance ?? 0) + (u.otherAllowance ?? 0);
                        return (
                          <tr key={u.id} className="border-b border-gray-100">
                            <td className="py-2 px-3 text-black">{u.firstName} {u.lastName}</td>
                            <td className="py-2 px-3 text-black">{(u.baseSalary ?? 0).toFixed(2)}</td>
                            <td className="py-2 px-3 text-black">{(u.allowance ?? 0).toFixed(2)}</td>
                            <td className="py-2 px-3 text-black">{(u.phoneAllowance ?? 0).toFixed(2)}</td>
                            <td className="py-2 px-3 text-black">{(u.transportationAllowance ?? 0).toFixed(2)}</td>
                            <td className="py-2 px-3 text-black">{(u.otherAllowance ?? 0).toFixed(2)}</td>
                            <td className="py-2 px-3 font-bold text-[#F33615]">{total.toFixed(2)}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SOCIAL INSURANCE */}
            <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
              <h2 className="font-bold mb-1 text-[#F33615] text-lg">🪪 {t("socialInsuranceTitle")}</h2>
              <p className="text-xs text-gray-500 mb-4">{t("insuranceNote")}</p>

              {/* RATE SETTINGS */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {SOCIAL_INSURANCE_RATE_KEYS.map((key) => (
                    <div key={key}>
                      <label className="text-xs text-gray-600 block mb-1">{t(RATE_LABEL_KEYS[key])}</label>
                      <input
                        type="number"
                        step="0.1"
                        value={rates[key]}
                        onChange={(e) => setRates({ ...rates, [key]: Number(e.target.value) })}
                        className="w-full p-2 border rounded-lg text-black text-sm"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <button onClick={saveRates} className="px-4 py-2 rounded-lg text-white text-sm font-semibold bg-[#030405] hover:bg-[#F33615] transition">{t("saveRates")}</button>
                  {ratesSavedMsg && <span className="text-green-600 text-sm font-medium">{ratesSavedMsg}</span>}
                </div>
              </div>

              {/* SUMMARY */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-white rounded-xl p-3 text-center border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">{t("totalEmployerCost")}</p>
                  <p className="text-xl font-bold text-[#F33615]">{totalEmployerCost.toFixed(2)}</p>
                </div>
                <div className="bg-white rounded-xl p-3 text-center border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">{t("totalEmployeeDeductions")}</p>
                  <p className="text-xl font-bold text-[#F33615]">{totalEmployeeDeductions.toFixed(2)}</p>
                </div>
              </div>

              {/* PER-EMPLOYEE TABLE */}
              <div className="overflow-x-auto bg-white rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-600 border-b border-gray-200">
                      <th className="text-start py-2 px-3">{t("users")}</th>
                      <th className="text-start py-2 px-3">{t("nationality")}</th>
                      <th className="text-start py-2 px-3">{t("contributableSalary")}</th>
                      <th className="text-start py-2 px-3">{t("employeeShare")}</th>
                      <th className="text-start py-2 px-3">{t("employerShare")}</th>
                      <th className="text-start py-2 px-3 font-bold">{t("totalContribution")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {insuranceRows.length === 0 ? (
                      <tr><td colSpan={6} className="text-center text-gray-500 py-6">{t("noUsers")}</td></tr>
                    ) : (
                      insuranceRows.map(({ user: u, breakdown }) => (
                        <tr key={u.id} className="border-b border-gray-100">
                          <td className="py-2 px-3 text-black">{u.firstName} {u.lastName}</td>
                          <td className="py-2 px-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${u.nationality === "expat" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                              {u.nationality === "expat" ? t("expat") : t("omani")}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-black">{breakdown.contributableSalary.toFixed(2)}</td>
                          <td className="py-2 px-3 text-black">{breakdown.employeeShare.toFixed(2)}</td>
                          <td className="py-2 px-3 text-black">{breakdown.employerShare.toFixed(2)}</td>
                          <td className="py-2 px-3 font-bold text-[#F33615]">{breakdown.total.toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* END OF SERVICE GRATUITY */}
            <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
              <h2 className="font-bold mb-1 text-[#F33615] text-lg">🎁 {t("gratuityTitle")}</h2>
              <p className="text-xs text-gray-500 mb-4">{t("gratuityNote")}</p>

              {/* SETTINGS */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">{t("firstPeriodYears")}</label>
                    <input type="number" step="1" value={gratuitySettings.firstPeriodYears} onChange={(e) => setGratuitySettings({ ...gratuitySettings, firstPeriodYears: Number(e.target.value) })} className="w-full p-2 border rounded-lg text-black text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">{t("firstPeriodDaysPerYear")}</label>
                    <input type="number" step="1" value={gratuitySettings.firstPeriodDaysPerYear} onChange={(e) => setGratuitySettings({ ...gratuitySettings, firstPeriodDaysPerYear: Number(e.target.value) })} className="w-full p-2 border rounded-lg text-black text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">{t("secondPeriodDaysPerYear")}</label>
                    <input type="number" step="1" value={gratuitySettings.secondPeriodDaysPerYear} onChange={(e) => setGratuitySettings({ ...gratuitySettings, secondPeriodDaysPerYear: Number(e.target.value) })} className="w-full p-2 border rounded-lg text-black text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">{t("applicableTo")}</label>
                    <select value={gratuitySettings.applicableTo} onChange={(e) => setGratuitySettings({ ...gratuitySettings, applicableTo: e.target.value as GratuitySettings["applicableTo"] })} className="w-full p-2 border rounded-lg text-black text-sm">
                      <option value="expat_only">{t("applicableExpatOnly")}</option>
                      <option value="all">{t("applicableAll")}</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <button onClick={saveGratuitySettings} className="px-4 py-2 rounded-lg text-white text-sm font-semibold bg-[#030405] hover:bg-[#F33615] transition">{t("saveGratuitySettings")}</button>
                  {gratuitySavedMsg && <span className="text-green-600 text-sm font-medium">{gratuitySavedMsg}</span>}
                </div>
              </div>

              {/* TOTAL LIABILITY */}
              <div className="bg-white rounded-xl p-3 text-center border border-gray-200 mb-5 max-w-xs">
                <p className="text-xs text-gray-500 mb-1">{t("totalAccruedLiability")}</p>
                <p className="text-2xl font-bold text-[#F33615]">{totalAccruedLiability.toFixed(2)}</p>
              </div>

              {/* PER-EMPLOYEE TABLE */}
              <div className="overflow-x-auto bg-white rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-600 border-b border-gray-200">
                      <th className="text-start py-2 px-3">{t("users")}</th>
                      <th className="text-start py-2 px-3">{t("nationality")}</th>
                      <th className="text-start py-2 px-3">{t("joinDate")}</th>
                      <th className="text-start py-2 px-3">{t("yearsOfService")}</th>
                      <th className="text-start py-2 px-3 font-bold">{t("gratuityAmount")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gratuityRows.length === 0 ? (
                      <tr><td colSpan={5} className="text-center text-gray-500 py-6">{t("noUsers")}</td></tr>
                    ) : (
                      gratuityRows.map(({ user: u, breakdown }) => (
                        <tr key={u.id} className="border-b border-gray-100">
                          <td className="py-2 px-3 text-black">{u.firstName} {u.lastName}</td>
                          <td className="py-2 px-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${u.nationality === "expat" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                              {u.nationality === "expat" ? t("expat") : t("omani")}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-gray-600">{u.joinDate || "—"}</td>
                          <td className="py-2 px-3 text-black">{breakdown.yearsOfService}</td>
                          <td className="py-2 px-3 font-bold text-[#F33615]">
                            {breakdown.applicable ? breakdown.totalAmount.toFixed(2) : <span className="text-xs font-normal text-gray-400">{t("notApplicablePension")}</span>}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
