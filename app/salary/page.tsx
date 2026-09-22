"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/hooks/useAuth";
import { useRequest } from "@/app/hooks/useRequest";
import { useLang } from "@/app/context/LangContext";
import LangToggle from "@/app/components/LangToggle";
import { computeVacationBalance, type VacationRecord } from "@/app/lib/vacationBalance";
import { computeSocialInsurance, DEFAULT_SOCIAL_INSURANCE_RATES, type Nationality, type SocialInsuranceRates } from "@/app/lib/socialInsurance";
import { computeGratuity, DEFAULT_GRATUITY_SETTINGS, type GratuitySettings } from "@/app/lib/gratuity";

interface SalaryData {
  baseSalary: number;
  allowance: number;
  phoneAllowance: number;
  transportationAllowance: number;
  otherAllowance: number;
  nationality?: Nationality;
  insuranceNumber?: string;
  joinDate?: string;
}

interface VacationHistoryItem {
  id: string;
  start?: string;
  end?: string;
  days?: number;
  status: "pending" | "approved" | "rejected";
  createdAt?: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

export default function SalaryPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { execute } = useRequest();
  const { t, isRTL } = useLang();

  const [salary, setSalary] = useState<SalaryData | null>(null);
  const [history, setHistory] = useState<VacationHistoryItem[]>([]);
  const [rates, setRates] = useState<SocialInsuranceRates>(DEFAULT_SOCIAL_INSURANCE_RATES);
  const [gratuitySettings, setGratuitySettings] = useState<GratuitySettings>(DEFAULT_GRATUITY_SETTINGS);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !user?.id) return;
    let cancelled = false;

    async function load() {
      setDataLoading(true);
      const [salaryRes, reqRes, ratesRes, gratuityRes] = await Promise.all([
        execute(`/api/users/${user!.id}`),
        execute(`/api/requests`),
        execute(`/api/settings/social-insurance`),
        execute(`/api/settings/gratuity`),
      ]);
      if (cancelled) return;

      if (salaryRes && typeof salaryRes === "object") {
        const s = salaryRes as Partial<SalaryData>;
        setSalary({
          baseSalary: s.baseSalary ?? 0,
          allowance: s.allowance ?? 0,
          phoneAllowance: s.phoneAllowance ?? 0,
          transportationAllowance: s.transportationAllowance ?? 0,
          otherAllowance: s.otherAllowance ?? 0,
          nationality: s.nationality ?? "omani",
          insuranceNumber: s.insuranceNumber ?? "",
          joinDate: s.joinDate ?? "",
        });
      }
      if (ratesRes && typeof ratesRes === "object") {
        setRates({ ...DEFAULT_SOCIAL_INSURANCE_RATES, ...(ratesRes as Partial<SocialInsuranceRates>) });
      }
      if (gratuityRes && typeof gratuityRes === "object") {
        setGratuitySettings({ ...DEFAULT_GRATUITY_SETTINGS, ...(gratuityRes as Partial<GratuitySettings>) });
      }

      const requests = (reqRes as { requests?: any[] })?.requests ?? [];
      const mine = requests.filter((r) => r.type === "vacation" && r.email === user!.email);
      setHistory(mine);
      setDataLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [authLoading, user?.id, user?.email, execute]);

  if (authLoading) return null;

  const total = salary
    ? salary.baseSalary + salary.allowance + salary.phoneAllowance + salary.transportationAllowance + salary.otherAllowance
    : 0;

  const insurance = salary
    ? computeSocialInsurance(salary.nationality, salary.baseSalary, salary.allowance, rates)
    : null;
  const netSalary = insurance ? total - insurance.employeeShare : total;

  const gratuity = salary
    ? computeGratuity(salary.baseSalary, salary.joinDate, salary.nationality, gratuitySettings)
    : null;

  const balanceRecords: VacationRecord[] = history.map((h) => ({
    startDate: h.start,
    status: h.status,
    days: h.days,
  }));
  const balance = computeVacationBalance(balanceRecords);

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-white flex justify-center p-4">
      <div className="w-full max-w-4xl flex flex-col gap-6">
        {/* HEADER */}
        <div className="bg-[#030405] border border-[#030405] shadow-sm rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
          <button onClick={() => router.push("/employee")} className="px-3 sm:px-4 py-2 text-sm text-white rounded-full bg-gradient-to-r from-[#F33615] to-[#ff6b4a]">
            {t("homeBtn")}
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-white order-last sm:order-none w-full sm:w-auto text-center">{t("mySalaryTitle")}</h1>
          <LangToggle dark />
        </div>

        {dataLoading && <div className="text-center py-10 text-[#F33615] font-semibold text-lg animate-pulse">{t("loading")}</div>}

        {!dataLoading && (
          <>
            {/* SALARY BREAKDOWN */}
            <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-[#F33615] mb-4">💰 {t("salaryBreakdown")}</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-600 border-b border-[#F33615]/20">
                      <th className="text-start py-2">{t("baseSalary")}</th>
                      <th className="text-start py-2">{t("allowance")}</th>
                      <th className="text-start py-2">{t("phoneAllowance")}</th>
                      <th className="text-start py-2">{t("transportationAllowance")}</th>
                      <th className="text-start py-2">{t("otherAllowance")}</th>
                      <th className="text-start py-2 font-bold">{t("totalSalary")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="text-black">
                      <td className="py-3">{salary?.baseSalary.toFixed(2) ?? "—"}</td>
                      <td className="py-3">{salary?.allowance.toFixed(2) ?? "—"}</td>
                      <td className="py-3">{salary?.phoneAllowance.toFixed(2) ?? "—"}</td>
                      <td className="py-3">{salary?.transportationAllowance.toFixed(2) ?? "—"}</td>
                      <td className="py-3">{salary?.otherAllowance.toFixed(2) ?? "—"}</td>
                      <td className="py-3 font-bold text-[#F33615]">{total.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* SOCIAL INSURANCE */}
            {insurance && (
              <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-[#F33615] mb-4">🪪 {t("socialInsuranceTitle")}</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">{t("nationality")}</p>
                    <p className="text-sm font-bold text-[#F33615]">{salary?.nationality === "expat" ? t("expat") : t("omani")}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">{t("employeeShare")}</p>
                    <p className="text-xl font-bold text-[#F33615]">{insurance.employeeShare.toFixed(2)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">{t("employerShare")}</p>
                    <p className="text-xl font-bold text-[#F33615]">{insurance.employerShare.toFixed(2)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">{t("netSalary")}</p>
                    <p className="text-xl font-bold text-[#F33615]">{netSalary.toFixed(2)}</p>
                  </div>
                </div>
                {!insurance.appliesPension && (
                  <p className="text-xs text-gray-500">ℹ️ {t("pensionNotApplicable")}</p>
                )}
              </div>
            )}

            {/* GRATUITY ESTIMATE */}
            {gratuity && gratuity.applicable && (
              <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-[#F33615] mb-4">🎁 {t("myGratuityEstimate")}</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">{t("yearsOfService")}</p>
                    <p className="text-xl font-bold text-[#F33615]">{gratuity.yearsOfService}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">{t("gratuityAmount")}</p>
                    <p className="text-xl font-bold text-[#F33615]">{gratuity.totalAmount.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* VACATION BALANCE */}
            <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-[#F33615] mb-4">🏖️ {t("vacationBalance")}</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                {[
                  { label: t("annualDays"), value: balance.annual },
                  { label: t("carriedIn"), value: balance.carriedIn },
                  { label: t("totalAvailable"), value: balance.totalAvailable },
                  { label: t("usedDays"), value: balance.used },
                  { label: t("remainingDays"), value: balance.remaining },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-3 text-center border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">{label}</p>
                    <p className="text-xl font-bold text-[#F33615]">{value}</p>
                  </div>
                ))}
              </div>
              {balance.carriedIn > 0 && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                  ⚠️ {t("carryExpiryNotice")}
                </p>
              )}

              {/* HISTORY TABLE */}
              <div className="overflow-x-auto mt-5">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-600 border-b border-[#F33615]/20">
                      <th className="text-start py-2">{t("startDate")}</th>
                      <th className="text-start py-2">{t("endDate")}</th>
                      <th className="text-start py-2">{t("days")}</th>
                      <th className="text-start py-2">{t("status2")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.length === 0 ? (
                      <tr><td colSpan={4} className="text-center text-gray-500 py-6">{t("noVacationHistory")}</td></tr>
                    ) : (
                      history.map((h) => (
                        <tr key={h.id} className="text-black border-b border-gray-100">
                          <td className="py-2">{h.start}</td>
                          <td className="py-2">{h.end}</td>
                          <td className="py-2">{h.days ?? "—"}</td>
                          <td className="py-2">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[h.status]}`}>
                              {h.status === "pending" ? t("pending") : h.status === "approved" ? t("approved") : t("rejected")}
                            </span>
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
