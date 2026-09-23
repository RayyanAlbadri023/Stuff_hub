"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/hooks/useAuth";
import { useRequest } from "@/app/hooks/useRequest";
import { useLang } from "@/app/context/LangContext";
import LangToggle from "@/app/components/LangToggle";

export default function ExcusePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { execute, loading: submitting, error } = useRequest();
  const { t, isRTL } = useLang();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [date, setDate] = useState("");
  const [message, setMessage] = useState("");
  const [attachment, setAttachment] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [formError, setFormError] = useState("");

  if (loading) return null;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAttachment(reader.result as string);
      setAttachmentName(file.name);
      setFormError("");
    };
    reader.readAsDataURL(file);
  }

  async function sendExcuse() {
    setFormError(""); setSuccessMsg("");
    if (!date) return setFormError(t("excuseDateRequired"));
    if (!message.trim() || !attachment) return setFormError(t("excuseEmpty"));

    const result = await execute("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user?.id || null,
        name: `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || "Employee",
        email: user?.email || "",
        type: "excuse",
        message,
        start: date,
        attachment,
        attachmentName,
      }),
    });
    if (!result) return;

    setSuccessMsg(t("excuseSuccess"));
    setDate(""); setMessage(""); setAttachment(null); setAttachmentName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-white flex items-center justify-center p-5">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 bg-[#030405]">
          <h1 className="text-xl font-bold text-white">📝 {t("excuseTitle")}</h1>
          <LangToggle dark />
        </div>
        <div className="p-6">
          {(error || formError) && <p className="text-red-500 text-sm mb-3">{formError || error}</p>}
          {successMsg && <p className="text-green-600 text-sm mb-3">{successMsg}</p>}

          <label className="text-sm text-gray-600 block mb-1">{t("excuseDate")}</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full p-3 rounded-lg border border-gray-300 outline-none bg-white/80 text-black mb-4"
          />

          <label className="text-sm text-gray-600 block mb-1">{t("excuseReasonPlaceholder")}</label>
          <textarea
            placeholder={t("excuseReasonPlaceholder")}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full h-32 p-3 rounded-lg border border-gray-300 outline-none resize-none bg-white/80 text-black placeholder-gray-500 mb-4"
          />

          <label className="text-sm text-gray-600 block mb-1">{t("excuseAttachment")}</label>
          <div className="mb-4">
            {attachment ? (
              <div className="flex items-center gap-3 flex-wrap">
                <a href={attachment} download={attachmentName || "attachment"} className="text-sm text-[#F33615] underline">
                  📎 {attachmentName}
                </a>
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
                📎 {t("uploadFile")} — {t("excuseAttachment")}
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*,application/pdf" onChange={handleFileChange} className="hidden" />
          </div>

          <button onClick={sendExcuse} disabled={submitting} className="w-full py-3 rounded-full text-white font-semibold bg-gradient-to-r from-[#F33615] to-[#ff6b4a] disabled:opacity-60">
            {submitting ? t("sending") : t("sendExcuse")}
          </button>
          <button onClick={() => router.push("/employee")} className="w-full mt-3 py-2 text-sm text-gray-700 underline">{t("backToDashboard")}</button>
        </div>
      </div>
    </div>
  );
}
