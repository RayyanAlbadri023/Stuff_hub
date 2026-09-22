"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth, ADMIN_OR_MANAGER } from "@/app/hooks/useAuth";
import { useRequest } from "@/app/hooks/useRequest";
import { useLang } from "@/app/context/LangContext";
import LangToggle from "@/app/components/LangToggle";
import { type Nationality } from "@/app/lib/socialInsurance";

const COUNTRIES: { value: string; ar: string; en: string }[] = [
  { value: "oman", ar: "عماني", en: "Omani" },
  { value: "saudi", ar: "سعودي", en: "Saudi" },
  { value: "uae", ar: "إماراتي", en: "Emirati" },
  { value: "qatar", ar: "قطري", en: "Qatari" },
  { value: "bahrain", ar: "بحريني", en: "Bahraini" },
  { value: "kuwait", ar: "كويتي", en: "Kuwaiti" },
  { value: "yemen", ar: "يمني", en: "Yemeni" },
  { value: "jordan", ar: "أردني", en: "Jordanian" },
  { value: "morocco", ar: "مغربي", en: "Moroccan" },
  { value: "syria", ar: "سوري", en: "Syrian" },
  { value: "sudan", ar: "سوداني", en: "Sudanese" },
  { value: "egypt", ar: "مصري", en: "Egyptian" },
  { value: "india", ar: "هندي", en: "Indian" },
  { value: "pakistan", ar: "باكستاني", en: "Pakistani" },
  { value: "bangladesh", ar: "بنغلاديشي", en: "Bangladeshi" },
  { value: "philippines", ar: "فلبيني", en: "Filipino" },
  { value: "srilanka", ar: "سريلانكي", en: "Sri Lankan" },
  { value: "nepal", ar: "نيبالي", en: "Nepali" },
  { value: "other", ar: "أخرى", en: "Other" },
];

interface EmployeeDetail {
  id?: string | number;
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
  countryName?: string;
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
  residencyCardFile?: string;
  residencyCardFileName?: string;
  workPermitFile?: string;
  workPermitFileName?: string;
  personalIdFile?: string;
  personalIdFileName?: string;
  certifiedCvFile?: string;
  certifiedCvFileName?: string;
}

type FileFieldKey = "contractFile" | "residencyCardFile" | "workPermitFile" | "personalIdFile" | "certifiedCvFile";

function EmployeeProfile() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { user, loading: authLoading } = useAuth({ requiredRole: ADMIN_OR_MANAGER });
  const { execute } = useRequest();
  const { t, isRTL, lang } = useLang();
  const contractFileInputRef = useRef<HTMLInputElement>(null);
  const residencyCardInputRef = useRef<HTMLInputElement>(null);
  const workPermitInputRef = useRef<HTMLInputElement>(null);
  const personalIdInputRef = useRef<HTMLInputElement>(null);
  const certifiedCvInputRef = useRef<HTMLInputElement>(null);

  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (authLoading || !id) return;
    let cancelled = false;
    async function load() {
      setDataLoading(true);
      const res = await execute(`/api/users/${id}`);
      if (cancelled) return;
      if (res && typeof res === "object") setEmployee(res as EmployeeDetail);
      setDataLoading(false);
    }
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, id]);

  if (authLoading) return null;

  if (!id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-gray-500">
        {t("noUsers")}
      </div>
    );
  }

  const update = (patch: Partial<EmployeeDetail>) => setEmployee((prev) => prev && { ...prev, ...patch });

  const handleFileChange = (fileKey: FileFieldKey, nameKey: `${FileFieldKey}Name`) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => update({ [fileKey]: reader.result as string, [nameKey]: file.name } as Partial<EmployeeDetail>);
    reader.readAsDataURL(file);
  };

  const handleContractFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => update({ contractFile: reader.result as string, contractFileName: file.name });
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (!employee) return;
    setSaving(true); setSavedMsg(""); setErrorMsg("");
    const res = await execute(`/api/users/edit/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: employee.firstName ?? "",
        lastName: employee.lastName ?? "",
        phone: employee.phone ?? "",
        email: employee.email,
        role: employee.role,
        nationality: employee.nationality ?? "omani",
        countryName: employee.countryName ?? "",
        baseSalary: employee.baseSalary ?? 0,
        allowance: employee.allowance ?? 0,
        phoneAllowance: employee.phoneAllowance ?? 0,
        transportationAllowance: employee.transportationAllowance ?? 0,
        otherAllowance: employee.otherAllowance ?? 0,
        insuranceNumber: employee.insuranceNumber ?? "",
        workPermitNumber: employee.workPermitNumber ?? "",
        workPermitExpiry: employee.workPermitExpiry ?? "",
        residencyNumber: employee.residencyNumber ?? "",
        residencyExpiry: employee.residencyExpiry ?? "",
        passportNumber: employee.passportNumber ?? "",
        passportExpiry: employee.passportExpiry ?? "",
        joinDate: employee.joinDate ?? "",
        contractType: employee.contractType ?? "permanent",
        contractStart: employee.contractStart ?? "",
        contractEnd: employee.contractEnd ?? "",
        contractFile: employee.contractFile ?? "",
        contractFileName: employee.contractFileName ?? "",
        residencyCardFile: employee.residencyCardFile ?? "",
        residencyCardFileName: employee.residencyCardFileName ?? "",
        workPermitFile: employee.workPermitFile ?? "",
        workPermitFileName: employee.workPermitFileName ?? "",
        personalIdFile: employee.personalIdFile ?? "",
        personalIdFileName: employee.personalIdFileName ?? "",
        certifiedCvFile: employee.certifiedCvFile ?? "",
        certifiedCvFileName: employee.certifiedCvFileName ?? "",
      }),
    });
    setSaving(false);
    if (res) setSavedMsg(t("changesSaved"));
    else setErrorMsg("Error");
  };

  const inputClass = "w-full p-2 border mb-3 rounded-lg text-black";
  const labelClass = "text-sm text-gray-600 block mb-1";

  const FileUploadField = ({
    label, fileUrl, fileName, inputRef, onChange,
  }: {
    label: string;
    fileUrl?: string;
    fileName?: string;
    inputRef: React.RefObject<HTMLInputElement | null>;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  }) => (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="mb-2">
        {fileUrl ? (
          <div className="flex items-center gap-3 flex-wrap">
            <a href={fileUrl} download={fileName || label} className="text-sm text-[#F33615] underline">
              📎 {fileName || label}
            </a>
            <button type="button" onClick={() => inputRef.current?.click()} className="text-xs text-blue-600 underline">
              {t("changeFile")}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-full py-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 hover:border-[#F33615] hover:text-[#F33615] transition text-sm"
          >
            📎 {t("uploadFile")} — {label}
          </button>
        )}
        <input ref={inputRef} type="file" accept="image/*,application/pdf" onChange={onChange} className="hidden" />
      </div>
    </div>
  );

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-white flex justify-center p-4">
      <div className="w-full max-w-3xl flex flex-col gap-6">
        {/* HEADER */}
        <div className="bg-[#030405] border border-[#030405] shadow-sm rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
          <button onClick={() => router.push(user?.role === "manager" ? "/manager" : "/admin")} className="px-3 sm:px-4 py-2 text-sm text-white rounded-full bg-gradient-to-r from-[#F33615] to-[#ff6b4a]">
            {t("back")}
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-white order-last sm:order-none w-full sm:w-auto text-center">
            👤 {t("employeeProfileTitle")} {employee ? `— ${employee.firstName ?? ""} ${employee.lastName ?? ""}` : ""}
          </h1>
          <LangToggle dark />
        </div>

        {dataLoading && <div className="text-center py-10 text-[#F33615] font-semibold text-lg animate-pulse">{t("loading")}</div>}

        {!dataLoading && employee && (
          <>
            {savedMsg && <p className="text-green-600 text-sm text-center">{savedMsg}</p>}
            {errorMsg && <p className="text-red-500 text-sm text-center">{errorMsg}</p>}

            {/* PERSONAL INFO */}
            <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-[#F33615] mb-4">🙍 {t("personalInfo")}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                <div>
                  <label className={labelClass}>{t("firstName")}</label>
                  <input value={employee.firstName ?? ""} onChange={(e) => update({ firstName: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{t("lastName")}</label>
                  <input value={employee.lastName ?? ""} onChange={(e) => update({ lastName: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{t("email2")}</label>
                  <input value={employee.email ?? ""} onChange={(e) => update({ email: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{t("phone")}</label>
                  <input value={employee.phone ?? ""} onChange={(e) => update({ phone: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{t("role")}</label>
                  <select value={employee.role ?? "employee"} onChange={(e) => update({ role: e.target.value })} className={inputClass}>
                    <option value="employee">Employee</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>{t("nationality")}</label>
                  <select
                    value={employee.countryName ?? (employee.nationality === "expat" ? "other" : "oman")}
                    onChange={(e) => {
                      const value = e.target.value;
                      update({ countryName: value, nationality: (value === "oman" ? "omani" : "expat") as Nationality });
                    }}
                    className={inputClass}
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.value} value={c.value}>{lang === "ar" ? c.ar : c.en}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* SOCIAL INSURANCE */}
            <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-[#F33615] mb-4">🪪 {t("socialInsuranceTitle")}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                <div>
                  <label className={labelClass}>{t("insuranceNumber")}</label>
                  <input value={employee.insuranceNumber ?? ""} onChange={(e) => update({ insuranceNumber: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{t("joinDate")}</label>
                  <input type="date" value={employee.joinDate ?? ""} onChange={(e) => update({ joinDate: e.target.value })} className={inputClass} />
                </div>
              </div>
            </div>

            {/* WORK PERMIT (expat only) */}
            {employee.nationality === "expat" && (
              <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-[#F33615] mb-4">🛂 {t("workPermitTitle")}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                  <div>
                    <label className={labelClass}>{t("workPermitNumber")}</label>
                    <input value={employee.workPermitNumber ?? ""} onChange={(e) => update({ workPermitNumber: e.target.value })} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>{t("workPermitExpiry")}</label>
                    <input type="date" value={employee.workPermitExpiry ?? ""} onChange={(e) => update({ workPermitExpiry: e.target.value })} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>{t("residencyNumber")}</label>
                    <input value={employee.residencyNumber ?? ""} onChange={(e) => update({ residencyNumber: e.target.value })} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>{t("residencyExpiry")}</label>
                    <input type="date" value={employee.residencyExpiry ?? ""} onChange={(e) => update({ residencyExpiry: e.target.value })} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>{t("passportNumber")}</label>
                    <input value={employee.passportNumber ?? ""} onChange={(e) => update({ passportNumber: e.target.value })} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>{t("passportExpiry")}</label>
                    <input type="date" value={employee.passportExpiry ?? ""} onChange={(e) => update({ passportExpiry: e.target.value })} className={inputClass} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 mt-2">
                  <FileUploadField
                    label={t("residencyCardDocument")}
                    fileUrl={employee.residencyCardFile}
                    fileName={employee.residencyCardFileName}
                    inputRef={residencyCardInputRef}
                    onChange={handleFileChange("residencyCardFile", "residencyCardFileName")}
                  />
                  <FileUploadField
                    label={t("workPermitDocument")}
                    fileUrl={employee.workPermitFile}
                    fileName={employee.workPermitFileName}
                    inputRef={workPermitInputRef}
                    onChange={handleFileChange("workPermitFile", "workPermitFileName")}
                  />
                </div>
              </div>
            )}

            {/* PERSONAL DOCUMENTS (Omani only) */}
            {employee.nationality !== "expat" && (
              <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-[#F33615] mb-4">🪪 {t("personalDocumentsTitle")}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                  <FileUploadField
                    label={t("personalIdDocument")}
                    fileUrl={employee.personalIdFile}
                    fileName={employee.personalIdFileName}
                    inputRef={personalIdInputRef}
                    onChange={handleFileChange("personalIdFile", "personalIdFileName")}
                  />
                  <FileUploadField
                    label={t("certifiedCvDocument")}
                    fileUrl={employee.certifiedCvFile}
                    fileName={employee.certifiedCvFileName}
                    inputRef={certifiedCvInputRef}
                    onChange={handleFileChange("certifiedCvFile", "certifiedCvFileName")}
                  />
                </div>
              </div>
            )}

            {/* SALARY BREAKDOWN */}
            <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-[#F33615] mb-4">💰 {t("salaryBreakdown")}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                <div>
                  <label className={labelClass}>{t("baseSalary")}</label>
                  <input type="number" value={employee.baseSalary ?? 0} onChange={(e) => update({ baseSalary: Number(e.target.value) })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{t("allowance")}</label>
                  <input type="number" value={employee.allowance ?? 0} onChange={(e) => update({ allowance: Number(e.target.value) })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{t("phoneAllowance")}</label>
                  <input type="number" value={employee.phoneAllowance ?? 0} onChange={(e) => update({ phoneAllowance: Number(e.target.value) })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{t("transportationAllowance")}</label>
                  <input type="number" value={employee.transportationAllowance ?? 0} onChange={(e) => update({ transportationAllowance: Number(e.target.value) })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{t("otherAllowance")}</label>
                  <input type="number" value={employee.otherAllowance ?? 0} onChange={(e) => update({ otherAllowance: Number(e.target.value) })} className={inputClass} />
                </div>
              </div>
            </div>

            {/* CONTRACT */}
            <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-[#F33615] mb-4">📄 {t("contractSectionTitle")}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                <div>
                  <label className={labelClass}>{t("contractType")}</label>
                  <select value={employee.contractType ?? "permanent"} onChange={(e) => update({ contractType: e.target.value })} className={inputClass}>
                    <option value="permanent">{t("contractTypePermanent")}</option>
                    <option value="fixed">{t("contractTypeFixed")}</option>
                  </select>
                </div>
                <div />
                <div>
                  <label className={labelClass}>{t("contractStart")}</label>
                  <input type="date" value={employee.contractStart ?? ""} onChange={(e) => update({ contractStart: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{t("contractEnd")}</label>
                  <input type="date" value={employee.contractEnd ?? ""} onChange={(e) => update({ contractEnd: e.target.value })} className={inputClass} />
                </div>
              </div>

              <label className={labelClass}>{t("contractSectionTitle")}</label>
              <div className="mb-2">
                {employee.contractFile ? (
                  <div className="flex items-center gap-3 flex-wrap">
                    <a href={employee.contractFile} download={employee.contractFileName || "contract"} className="text-sm text-[#F33615] underline">
                      📎 {employee.contractFileName || t("viewContract")}
                    </a>
                    <button type="button" onClick={() => contractFileInputRef.current?.click()} className="text-xs text-blue-600 underline">
                      {t("changeContract")}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => contractFileInputRef.current?.click()}
                    className="w-full py-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 hover:border-[#F33615] hover:text-[#F33615] transition text-sm"
                  >
                    📎 {t("uploadContract")}
                  </button>
                )}
                <input ref={contractFileInputRef} type="file" accept="image/*,application/pdf" onChange={handleContractFileChange} className="hidden" />
              </div>
            </div>

            <button onClick={save} disabled={saving} className="w-full py-3 rounded-full text-white font-semibold bg-gradient-to-r from-[#F33615] to-[#ff6b4a] disabled:opacity-60">
              {saving ? t("sending") : t("saveChanges")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function EmployeeProfilePage() {
  return (
    <Suspense>
      <EmployeeProfile />
    </Suspense>
  );
}
