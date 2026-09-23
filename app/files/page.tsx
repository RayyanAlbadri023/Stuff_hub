"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/hooks/useAuth";
import { useRequest } from "@/app/hooks/useRequest";
import { useLang } from "@/app/context/LangContext";
import LangToggle from "@/app/components/LangToggle";

interface SharedFile {
  id: string;
  title: string;
  fileData: string;
  fileName: string;
  fileSize: number;
  uploadedByName: string;
  uploadedByEmail: string;
  uploadedByRole: string;
  createdAt?: string;
}

const MAX_RAW_BYTES = 8 * 1024 * 1024; // 8 MB

function formatSize(bytes: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function SharedFilesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { execute } = useRequest();
  const { t, isRTL } = useLang();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<SharedFile[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [pendingFile, setPendingFile] = useState<{ data: string; name: string; size: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [formError, setFormError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const loadData = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    async function fetchFiles() {
      setDataLoading(true);
      const res = await execute("/api/files");
      if (cancelled) return;
      setFiles((res as { files?: SharedFile[] })?.files ?? []);
      setDataLoading(false);
    }
    fetchFiles();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, reloadKey]);

  if (authLoading) return null;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_RAW_BYTES) {
      setFormError(t("sharedFileTooLarge"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPendingFile({ data: reader.result as string, name: file.name, size: file.size });
      setFormError("");
    };
    reader.readAsDataURL(file);
  }

  async function upload() {
    setFormError(""); setSuccessMsg("");
    if (!pendingFile) return setFormError(t("sharedFileRequired"));

    setUploading(true);
    try {
      const result = await execute("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          fileData: pendingFile.data,
          fileName: pendingFile.name,
          fileSize: pendingFile.size,
          uploadedByName: `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || "Employee",
          uploadedByEmail: user?.email || "",
          uploadedByRole: user?.role || "",
        }),
      });
      if (!result) return;

      setSuccessMsg(t("sharedFileUploaded"));
      setTitle(""); setPendingFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      loadData();
    } finally {
      setUploading(false);
    }
  }

  async function deleteFile(id: string) {
    if (!confirm(t("deleteFileConfirm"))) return;
    await execute(`/api/files/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requesterEmail: user?.email || "", requesterRole: user?.role || "" }),
    });
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }

  const canDelete = (f: SharedFile) => f.uploadedByEmail === user?.email || user?.role === "admin" || user?.role === "manager";

  const homePath = user?.role === "admin" ? "/admin" : user?.role === "manager" ? "/manager" : "/employee";

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-white flex justify-center p-4">
      <div className="w-full max-w-3xl flex flex-col gap-6">
        {/* HEADER */}
        <div className="bg-[#030405] border border-[#030405] shadow-sm rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
          <button onClick={() => router.push(homePath)} className="px-3 sm:px-4 py-2 text-sm text-white rounded-full bg-gradient-to-r from-[#F33615] to-[#ff6b4a]">
            {t("homeBtn")}
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-white order-last sm:order-none w-full sm:w-auto text-center">📁 {t("sharedFilesTitle")}</h1>
          <LangToggle dark />
        </div>

        {/* UPLOAD FORM */}
        <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-6">
          {(formError) && <p className="text-red-500 text-sm mb-3">{formError}</p>}
          {successMsg && <p className="text-green-600 text-sm mb-3">{successMsg}</p>}

          <input
            placeholder={t("fileTitlePlaceholder")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-3 rounded-lg border border-gray-300 outline-none bg-white/80 text-black mb-3"
          />

          <div className="mb-4">
            {pendingFile ? (
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-[#F33615]">📎 {pendingFile.name} ({formatSize(pendingFile.size)})</span>
                <button type="button" onClick={() => fileInputRef.current?.click()} className="text-xs text-blue-600 underline">
                  {t("changeFile")}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-6 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 hover:border-[#F33615] hover:text-[#F33615] transition text-sm"
              >
                📎 {t("chooseFile")}
              </button>
            )}
            <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" />
          </div>

          <button onClick={upload} disabled={uploading} className="w-full py-3 rounded-full text-white font-semibold bg-gradient-to-r from-[#F33615] to-[#ff6b4a] disabled:opacity-60">
            {uploading ? t("sending") : t("uploadSharedFile")}
          </button>
        </div>

        {/* FILE LIST */}
        <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-6">
          {dataLoading ? (
            <p className="text-center text-gray-500 py-4">{t("loading")}</p>
          ) : files.length === 0 ? (
            <p className="text-center text-gray-500 py-4">{t("noSharedFiles")}</p>
          ) : (
            <div className="space-y-2">
              {files.map((f) => (
                <div key={f.id} className="flex flex-wrap gap-3 justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="min-w-0">
                    <p className="font-medium text-black break-words">{f.title || f.fileName}</p>
                    <p className="text-xs text-gray-500 break-words">📎 {f.fileName} {f.fileSize ? `· ${formatSize(f.fileSize)}` : ""}</p>
                    <p className="text-xs text-gray-400">
                      {t("uploadedBy")}: {f.uploadedByName}
                      {f.uploadedByRole && <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-600">{f.uploadedByRole}</span>}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-1">{f.createdAt ? new Date(f.createdAt).toLocaleString() : ""}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a href={f.fileData} download={f.fileName} className="px-3 py-1.5 rounded-lg bg-[#F33615] text-white text-xs font-semibold hover:bg-[#d92c0f] transition">
                      {t("download")}
                    </a>
                    {canDelete(f) && (
                      <button onClick={() => deleteFile(f.id)} className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-400 text-xs font-semibold hover:border-red-300 hover:text-red-600 transition">
                        🗑
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
