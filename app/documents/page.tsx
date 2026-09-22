"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/hooks/useAuth";
import { useRequest } from "@/app/hooks/useRequest";
import { useLang } from "@/app/context/LangContext";
import LangToggle from "@/app/components/LangToggle";
import { getDocStatus, worstStatus, daysUntil, type DocStatus } from "@/app/lib/workPermit";

interface DocumentsData {
  nationality?: "omani" | "expat";
  workPermitExpiry?: string;
  residencyExpiry?: string;
  passportExpiry?: string;
  residencyCardFile?: string;
  residencyCardFileName?: string;
  workPermitFile?: string;
  workPermitFileName?: string;
  personalIdFile?: string;
  personalIdFileName?: string;
  certifiedCvFile?: string;
  certifiedCvFileName?: string;
}

type FileFieldKey = "residencyCardFile" | "workPermitFile" | "personalIdFile" | "certifiedCvFile";

const DOC_STATUS_COLORS: Record<DocStatus, string> = {
  valid: "bg-green-100 text-green-700",
  expiring_soon: "bg-yellow-100 text-yellow-700",
  expired: "bg-red-100 text-red-700",
  missing: "bg-gray-100 text-gray-500",
};

export default function DocumentsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { execute } = useRequest();
  const { t, isRTL } = useLang();

  const [data, setData] = useState<DocumentsData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  const residencyCardInputRef = useRef<HTMLInputElement>(null);
  const workPermitInputRef = useRef<HTMLInputElement>(null);
  const personalIdInputRef = useRef<HTMLInputElement>(null);
  const certifiedCvInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (authLoading || !user?.id) return;
    let cancelled = false;

    async function load() {
      setDataLoading(true);
      const res = await execute(`/api/users/${user!.id}`);
      if (cancelled) return;
      if (res && typeof res === "object") setData(res as DocumentsData);
      setDataLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [authLoading, user?.id, execute]);

  const update = (patch: Partial<DocumentsData>) => setData((prev) => ({ ...(prev ?? {}), ...patch }));

  const handleFileChange = (fileKey: FileFieldKey, nameKey: `${FileFieldKey}Name`) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => update({ [fileKey]: reader.result as string, [nameKey]: file.name } as Partial<DocumentsData>);
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (!user?.id || !data) return;
    setSaving(true);
    try {
      await execute(`/api/users/edit/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workPermitExpiry: data.workPermitExpiry ?? "",
          residencyExpiry: data.residencyExpiry ?? "",
          passportExpiry: data.passportExpiry ?? "",
          residencyCardFile: data.residencyCardFile ?? "",
          residencyCardFileName: data.residencyCardFileName ?? "",
          workPermitFile: data.workPermitFile ?? "",
          workPermitFileName: data.workPermitFileName ?? "",
          personalIdFile: data.personalIdFile ?? "",
          personalIdFileName: data.personalIdFileName ?? "",
          certifiedCvFile: data.certifiedCvFile ?? "",
          certifiedCvFileName: data.certifiedCvFileName ?? "",
        }),
      });
      setSavedMsg(t("changesSaved"));
      setTimeout(() => setSavedMsg(""), 2500);
    } finally {
      setSaving(false);
    }
  };

  const status = data ? worstStatus(data) : "missing";
  const wpStatus = getDocStatus(data?.workPermitExpiry);
  const resStatus = getDocStatus(data?.residencyExpiry);
  const wpDays = daysUntil(data?.workPermitExpiry);
  const resDays = daysUntil(data?.residencyExpiry);

  const DOC_STATUS_LABELS: Record<DocStatus, string> = {
    valid: t("docStatusValid"),
    expiring_soon: t("docStatusExpiringSoon"),
    expired: t("docStatusExpired"),
    missing: t("docStatusMissing"),
  };

  const isExpat = data?.nationality === "expat";
  const inputClass = "w-full p-2.5 border border-gray-200 rounded-lg text-black text-sm focus:outline-none focus:ring-2 focus:ring-[#F33615]/30";

  if (authLoading) return null;

  // Reusable file-upload block: shows a download link + "change" once a file
  // exists, otherwise a dashed upload button. Mirrors the contract-upload
  // pattern used in the admin employee profile page.
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
      <label className="text-xs text-gray-600 block mb-1">{label}</label>
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
  );

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-white flex justify-center p-4">
      <div className="w-full max-w-2xl flex flex-col gap-6">
        {/* HEADER */}
        <div className="bg-[#030405] border border-[#030405] shadow-sm rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
          <button onClick={() => router.push("/employee")} className="px-3 sm:px-4 py-2 text-sm text-white rounded-full bg-gradient-to-r from-[#F33615] to-[#ff6b4a]">
            {t("homeBtn")}
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-white order-last sm:order-none w-full sm:w-auto text-center">🛂 {t("myDocumentsTitle")}</h1>
          <LangToggle dark />
        </div>

        {dataLoading && <div className="text-center py-10 text-[#F33615] font-semibold text-lg animate-pulse">{t("loading")}</div>}

        {!dataLoading && isExpat && data && (
          <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-6 flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-gray-500">{t("editDocumentDates")}</p>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${DOC_STATUS_COLORS[status]}`}>
                {t("status")}: {DOC_STATUS_LABELS[status]}
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-gray-600">{t("workPermitExpiry")}</label>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${DOC_STATUS_COLORS[wpStatus]}`}>
                  {DOC_STATUS_LABELS[wpStatus]}{wpDays !== null && (wpDays >= 0 ? ` (${wpDays} ${t("daysLeft")})` : ` (${Math.abs(wpDays)} ${t("daysOverdue")})`)}
                </span>
              </div>
              <input type="date" value={data.workPermitExpiry ?? ""} onChange={(e) => update({ workPermitExpiry: e.target.value })} className={inputClass} />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-gray-600">{t("residencyExpiry")}</label>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${DOC_STATUS_COLORS[resStatus]}`}>
                  {DOC_STATUS_LABELS[resStatus]}{resDays !== null && (resDays >= 0 ? ` (${resDays} ${t("daysLeft")})` : ` (${Math.abs(resDays)} ${t("daysOverdue")})`)}
                </span>
              </div>
              <input type="date" value={data.residencyExpiry ?? ""} onChange={(e) => update({ residencyExpiry: e.target.value })} className={inputClass} />
            </div>

            <div>
              <label className="text-xs text-gray-600 block mb-1">{t("passportExpiry")}</label>
              <input type="date" value={data.passportExpiry ?? ""} onChange={(e) => update({ passportExpiry: e.target.value })} className={inputClass} />
            </div>

            <FileUploadField
              label={t("residencyCardDocument")}
              fileUrl={data.residencyCardFile}
              fileName={data.residencyCardFileName}
              inputRef={residencyCardInputRef}
              onChange={handleFileChange("residencyCardFile", "residencyCardFileName")}
            />

            <FileUploadField
              label={t("workPermitDocument")}
              fileUrl={data.workPermitFile}
              fileName={data.workPermitFileName}
              inputRef={workPermitInputRef}
              onChange={handleFileChange("workPermitFile", "workPermitFileName")}
            />

            <button
              onClick={save}
              disabled={saving}
              className="w-full py-3 rounded-full text-white font-semibold bg-gradient-to-r from-[#F33615] to-[#ff6b4a] disabled:opacity-60"
            >
              {saving ? "..." : t("saveChanges")}
            </button>
            {savedMsg && <p className="text-center text-green-600 text-sm font-semibold">{savedMsg}</p>}
          </div>
        )}

        {!dataLoading && !isExpat && data && (
          <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-6 flex flex-col gap-5">
            <p className="text-sm text-gray-500">{t("editDocumentDates")}</p>

            <FileUploadField
              label={t("personalIdDocument")}
              fileUrl={data.personalIdFile}
              fileName={data.personalIdFileName}
              inputRef={personalIdInputRef}
              onChange={handleFileChange("personalIdFile", "personalIdFileName")}
            />

            <FileUploadField
              label={t("certifiedCvDocument")}
              fileUrl={data.certifiedCvFile}
              fileName={data.certifiedCvFileName}
              inputRef={certifiedCvInputRef}
              onChange={handleFileChange("certifiedCvFile", "certifiedCvFileName")}
            />

            <button
              onClick={save}
              disabled={saving}
              className="w-full py-3 rounded-full text-white font-semibold bg-gradient-to-r from-[#F33615] to-[#ff6b4a] disabled:opacity-60"
            >
              {saving ? "..." : t("saveChanges")}
            </button>
            {savedMsg && <p className="text-center text-green-600 text-sm font-semibold">{savedMsg}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
