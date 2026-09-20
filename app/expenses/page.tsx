"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/hooks/useAuth";
import { useRequest } from "@/app/hooks/useRequest";
import { useLang } from "@/app/context/LangContext";
import LangToggle from "@/app/components/LangToggle";

interface ExpenseItem {
  id: string;
  amount: number;
  description: string;
  receiptImage: string;
  status: "pending" | "approved" | "rejected";
  createdAt?: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

const MAX_DIMENSION = 1000;
const JPEG_QUALITY = 0.7;

function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to load image"));
      img.onload = () => {
        let { width, height } = img;
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          const scale = MAX_DIMENSION / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas not supported"));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function ExpensesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { execute, loading: submitting, error } = useRequest();
  const { t, isRTL } = useLang();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [formError, setFormError] = useState("");
  const [history, setHistory] = useState<ExpenseItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [viewImage, setViewImage] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user?.email) return;
    let cancelled = false;
    async function load() {
      setHistoryLoading(true);
      const res = await execute(`/api/expenses?email=${encodeURIComponent(user!.email!)}`);
      if (cancelled) return;
      const items = (res as { expenses?: ExpenseItem[] })?.expenses ?? [];
      setHistory(items);
      setHistoryLoading(false);
    }
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.email]);

  if (authLoading) return null;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImage(file);
      setReceiptPreview(dataUrl);
      setFormError("");
    } catch {
      setFormError(t("expenseReceiptRequired"));
    }
  }

  async function submitExpense() {
    setFormError(""); setSuccessMsg("");
    if (!receiptPreview) return setFormError(t("expenseReceiptRequired"));
    const numAmount = Number(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) return setFormError(t("expenseAmountRequired"));
    if (!description.trim()) return setFormError(t("expenseDescRequired"));

    const result = await execute("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user?.id || null,
        name: `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || "Employee",
        email: user?.email || "",
        amount: numAmount,
        description,
        receiptImage: receiptPreview,
      }),
    });
    if (!result) return;

    setSuccessMsg(t("expenseSubmitted"));
    setAmount(""); setDescription(""); setReceiptPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";

    const res = await execute(`/api/expenses?email=${encodeURIComponent(user?.email || "")}`);
    const items = (res as { expenses?: ExpenseItem[] })?.expenses ?? [];
    setHistory(items);
  }

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-white flex justify-center p-4">
      <div className="w-full max-w-2xl flex flex-col gap-6">
        {/* HEADER */}
        <div className="bg-[#030405] border border-[#030405] shadow-sm rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
          <button onClick={() => router.push("/employee")} className="px-3 sm:px-4 py-2 text-sm text-white rounded-full bg-gradient-to-r from-[#F33615] to-[#ff6b4a]">
            {t("homeBtn")}
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-white order-last sm:order-none w-full sm:w-auto text-center">🧾 {t("expensesTitle")}</h1>
          <LangToggle dark />
        </div>

        {/* FORM */}
        <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-6">
          {(error || formError) && <p className="text-red-500 text-sm mb-3">{formError || error}</p>}
          {successMsg && <p className="text-green-600 text-sm mb-3">{successMsg}</p>}

          <label className="text-sm text-gray-600 block mb-1">{t("uploadReceipt")}</label>
          <div className="mb-4">
            {receiptPreview ? (
              <div className="relative inline-block">
                <img src={receiptPreview} alt="receipt" className="max-h-56 rounded-lg border border-gray-200" />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="block mt-2 text-sm text-[#F33615] underline"
                >
                  {t("changeReceipt")}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-8 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 hover:border-[#F33615] hover:text-[#F33615] transition"
              >
                📷 {t("uploadReceipt")}
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          </div>

          <label className="text-sm text-gray-600 block mb-1">{t("expenseAmount")}</label>
          <input
            type="number"
            step="0.01"
            placeholder={t("expenseAmountPlaceholder")}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full p-3 rounded-lg border border-gray-300 outline-none bg-white/80 text-black mb-4"
          />

          <label className="text-sm text-gray-600 block mb-1">{t("expenseDescription")}</label>
          <textarea
            placeholder={t("expenseDescPlaceholder")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full h-24 p-3 rounded-lg border border-gray-300 outline-none resize-none bg-white/80 text-black placeholder-gray-500 mb-4"
          />

          <button onClick={submitExpense} disabled={submitting} className="w-full py-3 rounded-full text-white font-semibold bg-gradient-to-r from-[#F33615] to-[#ff6b4a] disabled:opacity-60">
            {submitting ? t("sending") : t("submitExpense")}
          </button>
        </div>

        {/* HISTORY */}
        <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-[#F33615] mb-4">📋 {t("myExpensesHistory")}</h2>
          {historyLoading ? (
            <p className="text-center text-gray-500 py-4">{t("loading")}</p>
          ) : history.length === 0 ? (
            <p className="text-center text-gray-500 py-4">{t("noExpenses")}</p>
          ) : (
            <div className="space-y-2">
              {history.map((ex) => (
                <div key={ex.id} className="flex flex-wrap gap-3 justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3 min-w-0">
                    <button onClick={() => setViewImage(ex.receiptImage)} className="shrink-0">
                      <img src={ex.receiptImage} alt="receipt" className="w-12 h-12 object-cover rounded-lg border border-gray-200" />
                    </button>
                    <div className="min-w-0">
                      <p className="font-medium text-black break-words">{ex.description}</p>
                      <p className="text-xs text-gray-400">{ex.createdAt ? new Date(ex.createdAt).toLocaleString() : ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#F33615]">{ex.amount.toFixed(2)}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[ex.status]}`}>
                      {ex.status === "pending" ? t("pending") : ex.status === "approved" ? t("approved") : t("rejected")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* IMAGE VIEWER */}
      {viewImage && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setViewImage(null)}>
          <img src={viewImage} alt="receipt" className="max-w-full max-h-full rounded-lg" />
        </div>
      )}
    </div>
  );
}
