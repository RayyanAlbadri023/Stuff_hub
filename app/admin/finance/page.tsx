"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/hooks/useAuth";
import { useRequest } from "@/app/hooks/useRequest";
import { useLang } from "@/app/context/LangContext";
import LangToggle from "@/app/components/LangToggle";
import type { TranslationKeys } from "@/app/context/translations";
import {
  type FinanceType,
  type FinanceRecord,
  filterFinanceRecords,
  sumAmount,
  yearlyTotals,
  monthlyTotalsForYear,
  currentYear,
  distinctYears,
} from "@/app/lib/finance";
import {
  ACCOUNT_TYPES,
  type Account,
  type AccountType,
  type JournalEntry,
  type JournalLine,
  sumDebits,
  sumCredits,
  isBalanced,
  accountBalance,
} from "@/app/lib/accounting";
import { exportToExcel, parseExcelFile } from "@/app/lib/excelUtils";

type DataMap = Record<FinanceType, FinanceRecord[]>;

const EMPTY_DATA: DataMap = {
  invoices: [], assets: [], vendors: [], sales: [], income: [], expenses: [], refunds: [], cards: [], contracts: [],
};

// Brand-consistent, fixed two-series palette (income vs outcome) reused
// across every chart on this page. Never swapped or cycled.
const COLOR_INCOME = "#10b981"; // emerald — matches the app's existing "positive/approved" green
const COLOR_OUTCOME = "#F33615"; // the app's own brand color — used here for outflow

interface SelectOption {
  value: string;
  labelKey: TranslationKeys;
}

interface FieldConfig {
  key: "amount" | "date" | "category" | "status" | "ref" | "note" | "endDate" | "bankGuarantee" | "paymentDate" | "file";
  labelKey: TranslationKeys;
  type: "text" | "number" | "date" | "select" | "file";
  options?: SelectOption[];
}

interface ModuleConfig {
  type: FinanceType;
  icon: string;
  titleKey: TranslationKeys;
  nameLabelKey: TranslationKeys;
  fields: FieldConfig[];
  showTotal?: boolean;
}

const MODULES: ModuleConfig[] = [
  {
    type: "invoices", icon: "🧾", titleKey: "financeInvoices", nameLabelKey: "finNameInvoice", showTotal: true,
    fields: [
      { key: "ref", labelKey: "finRefInvoice", type: "text" },
      { key: "amount", labelKey: "finAmount", type: "number" },
      { key: "date", labelKey: "date", type: "date" },
      { key: "status", labelKey: "status", type: "select", options: [
        { value: "paid", labelKey: "finInvoiceStatusPaid" },
        { value: "pending", labelKey: "finInvoiceStatusPending" },
        { value: "overdue", labelKey: "finInvoiceStatusOverdue" },
      ] },
      { key: "note", labelKey: "finNote", type: "text" },
      { key: "file", labelKey: "finInvoiceFile", type: "file" },
    ],
  },
  {
    type: "assets", icon: "🏢", titleKey: "financeAssets", nameLabelKey: "finNameAsset", showTotal: true,
    fields: [
      { key: "category", labelKey: "finCategory", type: "text" },
      { key: "amount", labelKey: "finAmount", type: "number" },
      { key: "date", labelKey: "date", type: "date" },
      { key: "note", labelKey: "finNote", type: "text" },
    ],
  },
  {
    type: "vendors", icon: "🤝", titleKey: "financeVendors", nameLabelKey: "finNameVendor",
    fields: [
      { key: "ref", labelKey: "finRefPhone", type: "text" },
      { key: "category", labelKey: "finCategory", type: "text" },
      { key: "date", labelKey: "date", type: "date" },
      { key: "note", labelKey: "finNote", type: "text" },
    ],
  },
  {
    type: "sales", icon: "💹", titleKey: "financeSales", nameLabelKey: "finNameInvoice", showTotal: true,
    fields: [
      { key: "ref", labelKey: "finRefSale", type: "text" },
      { key: "amount", labelKey: "finAmount", type: "number" },
      { key: "date", labelKey: "date", type: "date" },
      { key: "note", labelKey: "finNote", type: "text" },
    ],
  },
  {
    type: "income", icon: "💰", titleKey: "financeIncome", nameLabelKey: "finNameIncome", showTotal: true,
    fields: [
      { key: "category", labelKey: "finCategory", type: "text" },
      { key: "amount", labelKey: "finAmount", type: "number" },
      { key: "date", labelKey: "date", type: "date" },
      { key: "note", labelKey: "finNote", type: "text" },
    ],
  },
  {
    type: "expenses", icon: "💸", titleKey: "financeOutcome", nameLabelKey: "finNameExpense", showTotal: true,
    fields: [
      { key: "category", labelKey: "finCategory", type: "text" },
      { key: "amount", labelKey: "finAmount", type: "number" },
      { key: "date", labelKey: "date", type: "date" },
      { key: "status", labelKey: "status", type: "select", options: [
        { value: "salary", labelKey: "finCardTypeSalary" },
        { value: "daily", labelKey: "finCardTypeDaily" },
        { value: "main", labelKey: "finCardTypeMain" },
      ] },
      { key: "note", labelKey: "finNote", type: "text" },
    ],
  },
  {
    type: "refunds", icon: "↩️", titleKey: "financeRefunds", nameLabelKey: "finNameRefund", showTotal: true,
    fields: [
      { key: "amount", labelKey: "finAmount", type: "number" },
      { key: "date", labelKey: "date", type: "date" },
      { key: "note", labelKey: "finNote", type: "text" },
    ],
  },
  {
    type: "cards", icon: "💳", titleKey: "financeCards", nameLabelKey: "finNameCard", showTotal: true,
    fields: [
      { key: "ref", labelKey: "finRefCard", type: "text" },
      { key: "status", labelKey: "status", type: "select", options: [
        { value: "salary", labelKey: "finCardTypeSalary" },
        { value: "daily", labelKey: "finCardTypeDaily" },
        { value: "main", labelKey: "finCardTypeMain" },
      ] },
      { key: "amount", labelKey: "finAmount", type: "number" },
      { key: "date", labelKey: "date", type: "date" },
    ],
  },
  {
    type: "contracts", icon: "📜", titleKey: "financeContracts", nameLabelKey: "finNameContract", showTotal: true,
    fields: [
      { key: "date", labelKey: "finContractStart", type: "date" },
      { key: "endDate", labelKey: "finContractEnd", type: "date" },
      { key: "amount", labelKey: "finAmountDue", type: "number" },
      { key: "bankGuarantee", labelKey: "finBankGuarantee", type: "file" },
      { key: "paymentDate", labelKey: "finPaymentDate", type: "date" },
      { key: "note", labelKey: "finNote", type: "text" },
      { key: "file", labelKey: "finContractFile", type: "file" },
    ],
  },
];

function optionLabel(t: (k: TranslationKeys) => string, fields: FieldConfig[], key: FieldConfig["key"], value?: string) {
  const field = fields.find((f) => f.key === key);
  const opt = field?.options?.find((o) => o.value === value);
  return opt ? t(opt.labelKey) : value || "—";
}

export default function FinancePage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth({ requiredRole: "admin" });
  const { execute } = useRequest();
  const { t, isRTL } = useLang();

  const [activeTab, setActiveTab] = useState<
    "overview" | FinanceType | "cashStatement" | "trialBalance" | "chartOfAccounts" | "journalEntries"
  >("overview");
  const [data, setData] = useState<DataMap>(EMPTY_DATA);
  const [dataLoading, setDataLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);

  const loadAll = useCallback(async () => {
    setDataLoading(true);
    const types: FinanceType[] = ["invoices", "assets", "vendors", "sales", "income", "expenses", "refunds", "cards"];
    const [results, accountsRes, entriesRes] = await Promise.all([
      Promise.all(types.map((tpe) => execute(`/api/finance/${tpe}`))),
      execute("/api/accounting/accounts"),
      execute("/api/accounting/entries"),
    ]);
    setData((prev) => {
      const next = { ...prev };
      types.forEach((tpe, i) => {
        const res = results[i] as { records?: FinanceRecord[] } | null;
        next[tpe] = res?.records ?? [];
      });
      return next;
    });
    setAccounts((accountsRes as { accounts?: Account[] } | null)?.accounts ?? []);
    setJournalEntries((entriesRes as { entries?: JournalEntry[] } | null)?.entries ?? []);
    setDataLoading(false);
  }, [execute]);

  const reloadOne = useCallback(async (tpe: FinanceType) => {
    const res = await execute(`/api/finance/${tpe}`);
    const records = (res as { records?: FinanceRecord[] } | null)?.records ?? [];
    setData((prev) => ({ ...prev, [tpe]: records }));
  }, [execute]);

  const reloadAccounts = useCallback(async () => {
    const res = await execute("/api/accounting/accounts");
    setAccounts((res as { accounts?: Account[] } | null)?.accounts ?? []);
  }, [execute]);

  const reloadEntries = useCallback(async () => {
    const res = await execute("/api/accounting/entries");
    setJournalEntries((res as { entries?: JournalEntry[] } | null)?.entries ?? []);
  }, [execute]);

  useEffect(() => {
    if (authLoading) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading]);

  if (authLoading) return null;

  const TABS: { key: typeof activeTab; icon: string; labelKey: TranslationKeys }[] = [
    { key: "overview", icon: "📊", labelKey: "financeOverview" },
    { key: "chartOfAccounts", icon: "📒", labelKey: "financeChartOfAccounts" },
    { key: "journalEntries", icon: "🧾", labelKey: "financeJournalEntries" },
    ...MODULES.map((m) => ({ key: m.type, icon: m.icon, labelKey: m.titleKey })),
    { key: "cashStatement", icon: "📑", labelKey: "financeCashStatement" },
    { key: "trialBalance", icon: "⚖️", labelKey: "financeTrialBalance" },
  ];

  // Groups tabs by theme so the (now sizeable) tab list reads as connected
  // sections instead of one long flat row. Purely navigational — no data changes.
  const TAB_GROUPS: { labelKey: TranslationKeys; keys: (typeof activeTab)[] }[] = [
    { labelKey: "tabGroupDashboard", keys: ["overview"] },
    { labelKey: "tabGroupSales", keys: ["invoices", "sales", "income", "refunds"] },
    { labelKey: "tabGroupPurchases", keys: ["vendors", "expenses"] },
    { labelKey: "tabGroupAccounts", keys: ["cashStatement", "cards"] },
    { labelKey: "tabGroupAccounting", keys: ["chartOfAccounts", "journalEntries", "trialBalance"] },
    { labelKey: "tabGroupOther", keys: ["assets", "contracts"] },
  ];

  const activeModule = MODULES.find((m) => m.type === activeTab);

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-white p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#030405] rounded-2xl p-4 shadow-sm">
          <button onClick={() => router.push("/admin")} className="px-3 sm:px-4 py-2 text-sm text-white rounded-full bg-gradient-to-r from-[#F33615] to-[#ff6b4a]">
            {t("backToDashboard")}
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-white order-last sm:order-none w-full sm:w-auto text-center">💼 {t("financeTitle")}</h1>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <LangToggle dark />
            <button onClick={logout} className="px-3 sm:px-4 py-2 text-sm rounded-lg bg-white/10 text-white font-semibold border border-white/20 hover:bg-[#F33615] hover:border-[#F33615] transition">🚪 {t("logout")}</button>
          </div>
        </div>

        {/* TABS — grouped by theme so related sections stay visually connected */}
        <div className="bg-gray-50 rounded-2xl border border-gray-200 p-3 space-y-2">
          {TAB_GROUPS.map((group) => {
            const groupTabs = TABS.filter((tb) => (group.keys as string[]).includes(tb.key as string));
            if (groupTabs.length === 0) return null;
            return (
              <div key={group.labelKey} className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide w-full sm:w-auto sm:min-w-[130px]">
                  {t(group.labelKey)}
                </span>
                {groupTabs.map((tb) => (
                  <button
                    key={tb.key}
                    onClick={() => setActiveTab(tb.key)}
                    className={`px-3 py-1.5 rounded-full text-sm font-semibold transition ${
                      activeTab === tb.key ? "bg-[#F33615] text-white" : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    {tb.icon} {t(tb.labelKey)}
                  </button>
                ))}
              </div>
            );
          })}
        </div>

        {dataLoading ? (
          <div className="text-center py-10 text-[#F33615] font-semibold text-lg animate-pulse">{t("loading")}</div>
        ) : (
          <>
            {activeTab === "overview" && <OverviewTab data={data} t={t} />}
            {activeTab === "chartOfAccounts" && (
              <ChartOfAccountsTab accounts={accounts} entries={journalEntries} t={t} execute={execute} onChanged={reloadAccounts} />
            )}
            {activeTab === "journalEntries" && (
              <JournalEntriesTab accounts={accounts} entries={journalEntries} t={t} execute={execute} onChanged={reloadEntries} />
            )}
            {activeTab === "cashStatement" && <CashStatementTab data={data} t={t} />}
            {activeTab === "trialBalance" && <TrialBalanceTab data={data} t={t} />}
            {activeModule && (
              <FinanceModuleTab
                config={activeModule}
                records={data[activeModule.type]}
                t={t}
                execute={execute}
                onChanged={() => reloadOne(activeModule.type)}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ───────────────────────────── Generic CRUD module ─────────────────────────

function FinanceModuleTab({
  config, records, t, execute, onChanged,
}: {
  config: ModuleConfig;
  records: FinanceRecord[];
  t: (k: TranslationKeys) => string;
  execute: (input: RequestInfo, init?: RequestInit) => Promise<unknown>;
  onChanged: () => void;
}) {
  const [form, setForm] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setForm({}); setEditingId(null); setError(""); setImportMsg(""); }, [config.type]);

  const years = useMemo(() => distinctYears(records), [records]);
  const filtered = useMemo(
    () => filterFinanceRecords(records, { q, year: year || undefined, month: month || undefined }),
    [records, q, year, month]
  );
  const total = useMemo(() => sumAmount(filtered), [filtered]);

  const save = async () => {
    setError("");
    if (!form.name || !form.name.trim()) return setError(t("finNoRecords"));
    if (!form.date) return setError(t("date"));
    setSaving(true);
    const body: Record<string, unknown> = { name: form.name.trim(), date: form.date };
    for (const f of config.fields) {
      if (f.key === "date") continue;
      if (f.type === "file") {
        if (form[f.key]) {
          // "file" (general attachment) maps to fileData/fileName; any other
          // file-type field (e.g. "bankGuarantee") maps to <key>Data/<key>Name.
          const dataKey = f.key === "file" ? "fileData" : `${f.key}Data`;
          const nameKey = f.key === "file" ? "fileName" : `${f.key}Name`;
          body[dataKey] = form[f.key];
          body[nameKey] = form[`${f.key}Name`] || "";
        }
        continue;
      }
      if (form[f.key] !== undefined) body[f.key] = f.type === "number" ? Number(form[f.key]) || 0 : form[f.key];
    }
    const url = editingId ? `/api/finance/${config.type}/${editingId}` : `/api/finance/${config.type}`;
    const res = await execute(url, {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (res) {
      setForm({});
      setEditingId(null);
      onChanged();
    } else {
      setError("Error");
    }
  };

  const startEdit = (r: FinanceRecord) => {
    const rec = r as unknown as Record<string, string | number | undefined>;
    const next: Record<string, string> = { name: r.name, date: r.date };
    for (const f of config.fields) {
      if (f.key === "date") continue;
      if (f.type === "file") {
        const dataKey = f.key === "file" ? "fileData" : `${f.key}Data`;
        const nameKey = f.key === "file" ? "fileName" : `${f.key}Name`;
        if (rec[dataKey]) next[f.key] = String(rec[dataKey]);
        if (rec[nameKey]) next[`${f.key}Name`] = String(rec[nameKey]);
        continue;
      }
      const val = rec[f.key];
      next[f.key] = val === undefined || val === null ? "" : String(val);
    }
    setForm(next);
    setEditingId(r.id);
    setError("");
  };

  const cancelEdit = () => {
    setForm({});
    setEditingId(null);
    setError("");
  };

  const remove = async (id: string) => {
    if (!confirm(t("finDeleteConfirm"))) return;
    if (editingId === id) cancelEdit();
    await execute(`/api/finance/${config.type}/${id}`, { method: "DELETE" });
    onChanged();
  };

  const handleExport = () => {
    const rows = filtered.map((r) => {
      const rec = r as unknown as Record<string, unknown>;
      const row: Record<string, unknown> = { name: r.name, date: r.date };
      for (const f of config.fields) {
        if (f.key === "date" || f.type === "file") continue;
        row[f.key] = rec[f.key] ?? "";
      }
      return row;
    });
    exportToExcel(config.type, config.type, rows);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportMsg("");
    try {
      const rows = await parseExcelFile(file);
      const res = await execute(`/api/finance/${config.type}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const r = res as { createdCount?: number; skipped?: { row: number; reason: string }[] } | null;
      if (r) {
        const created = r.createdCount ?? 0;
        const skippedCount = r.skipped?.length ?? 0;
        setImportMsg(`${t("finImportDone")}: ${created} ${t("finImportRecordsCreated")}${skippedCount ? `, ${skippedCount} ${t("finImportRowsSkipped")}` : ""}`);
        onChanged();
      } else {
        setImportMsg(t("finImportFailed"));
      }
    } catch {
      setImportMsg(t("finImportFailed"));
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  const inputClass = "w-full p-2 border rounded-lg text-black text-sm";

  return (
    <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold text-[#F33615] text-lg">{config.icon} {t(config.titleKey)}</h2>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 text-xs font-semibold hover:border-[#F33615] hover:text-[#F33615] transition">
            ⬇️ {t("excelExport")}
          </button>
          <button onClick={() => importInputRef.current?.click()} disabled={importing} className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 text-xs font-semibold hover:border-[#F33615] hover:text-[#F33615] transition disabled:opacity-60">
            ⬆️ {t("excelImport")}
          </button>
          <input ref={importInputRef} type="file" accept=".xlsx,.xls" onChange={handleImportFile} className="hidden" />
        </div>
      </div>
      {importMsg && <p className="text-xs text-gray-600">{importMsg}</p>}

      {/* ADD FORM */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        {error && <p className="text-red-500 text-xs mb-2">{error}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-gray-600 block mb-1">{t(config.nameLabelKey)}</label>
            <input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
          </div>
          {config.fields.map((f) => (
            <div key={f.key}>
              <label className="text-xs text-gray-600 block mb-1">{t(f.labelKey)}</label>
              {f.type === "select" ? (
                <select value={form[f.key] ?? f.options?.[0]?.value ?? ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} className={inputClass}>
                  {f.options?.map((o) => <option key={o.value} value={o.value}>{t(o.labelKey)}</option>)}
                </select>
              ) : f.type === "file" ? (
                <div>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () =>
                        setForm((prev) => ({ ...prev, [f.key]: reader.result as string, [`${f.key}Name`]: file.name }));
                      reader.readAsDataURL(file);
                    }}
                    className="w-full text-xs text-gray-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                  />
                  {form[`${f.key}Name`] && <p className="text-[10px] text-gray-500 mt-1 truncate">📎 {form[`${f.key}Name`]}</p>}
                </div>
              ) : (
                <input
                  type={f.type}
                  step={f.type === "number" ? "0.01" : undefined}
                  value={form[f.key] ?? ""}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  className={inputClass}
                />
              )}
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg text-white text-sm font-semibold bg-[#030405] hover:bg-[#F33615] transition disabled:opacity-60">
            {editingId ? `💾 ${t("saveChanges")}` : `➕ ${t("finAddRecord")}`}
          </button>
          {editingId && (
            <button onClick={cancelEdit} className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-300 text-gray-600 hover:bg-gray-100 transition">
              {t("cancel")}
            </button>
          )}
        </div>
      </div>

      {/* SEARCH / FILTER */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[180px]">
          <label className="text-xs text-gray-600 block mb-1">{t("search")}</label>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("searchPlaceholder")} className={inputClass} />
        </div>
        <div>
          <label className="text-xs text-gray-600 block mb-1">{t("finFilterYear")}</label>
          <select value={year} onChange={(e) => setYear(e.target.value)} className={inputClass}>
            <option value="">{t("finAllYears")}</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-600 block mb-1">{t("finFilterMonth")}</label>
          <select value={month} onChange={(e) => setMonth(e.target.value)} className={inputClass}>
            <option value="">{t("finAllMonths")}</option>
            {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        {config.showTotal && (
          <div className="bg-white rounded-xl px-4 py-2 border border-gray-200 text-center">
            <p className="text-[10px] text-gray-500">{t("finTotal")}</p>
            <p className="text-lg font-bold text-[#F33615]">{total.toFixed(2)}</p>
          </div>
        )}
      </div>

      {/* LIST */}
      <div className="overflow-x-auto bg-white rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-600 border-b border-gray-200">
              <th className="text-start py-2 px-3">{t(config.nameLabelKey)}</th>
              {config.fields.map((f) => <th key={f.key} className="text-start py-2 px-3">{t(f.labelKey)}</th>)}
              <th className="text-start py-2 px-3">{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={config.fields.length + 2} className="text-center text-gray-500 py-6">{t("finNoRecords")}</td></tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="border-b border-gray-100">
                  <td className="py-2 px-3 text-black">{r.name}</td>
                  {config.fields.map((f) => (
                    <td key={f.key} className="py-2 px-3 text-black">
                      {f.type === "file" ? (
                        (() => {
                          const rec = r as unknown as Record<string, string>;
                          const dataKey = f.key === "file" ? "fileData" : `${f.key}Data`;
                          const nameKey = f.key === "file" ? "fileName" : `${f.key}Name`;
                          const fileUrl = rec[dataKey];
                          return fileUrl ? (
                            <a href={fileUrl} download={rec[nameKey] || "attachment"} className="text-[#F33615] underline text-xs">
                              📎 {rec[nameKey] || t("finAttachment")}
                            </a>
                          ) : "—";
                        })()
                      ) : f.type === "select" ? optionLabel(t, config.fields, f.key, (r as unknown as Record<string, string>)[f.key]) : f.key === "amount" ? (Number(r.amount) || 0).toFixed(2) : ((r as unknown as Record<string, string>)[f.key]) || "—"}
                    </td>
                  ))}
                  <td className="py-2 px-3">
                    <div className="flex gap-1">
                      <button onClick={() => startEdit(r)} className="px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-gray-400 text-xs font-semibold hover:border-blue-300 hover:text-blue-600 transition">✏️</button>
                      <button onClick={() => remove(r.id)} className="px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-gray-400 text-xs font-semibold hover:border-red-300 hover:text-red-600 transition">🗑</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ───────────────────────────── Overview (charts) ───────────────────────────

function OverviewTab({ data, t }: { data: DataMap; t: (k: TranslationKeys) => string }) {
  const allIncomeAndOutcome = useMemo(() => [...data.income, ...data.expenses], [data.income, data.expenses]);
  const years = useMemo(() => {
    const ys = distinctYears(allIncomeAndOutcome);
    return ys.length ? ys : [currentYear()];
  }, [allIncomeAndOutcome]);
  const [year, setYear] = useState(years[0] || currentYear());
  useEffect(() => { if (!years.includes(year)) setYear(years[0] || currentYear()); }, [years]); // eslint-disable-line react-hooks/exhaustive-deps

  const incomeByMonth = useMemo(() => monthlyTotalsForYear(data.income, year), [data.income, year]);
  const outcomeByMonth = useMemo(() => monthlyTotalsForYear(data.expenses, year), [data.expenses, year]);
  const maxValue = Math.max(1, ...incomeByMonth, ...outcomeByMonth);

  const totalIncomeAllYears = yearlyTotals(data.income);
  const totalOutcomeAllYears = yearlyTotals(data.expenses);
  const yearIncome = totalIncomeAllYears[year] || 0;
  const yearOutcome = totalOutcomeAllYears[year] || 0;
  const yearNet = Math.round((yearIncome - yearOutcome) * 100) / 100;

  const totalAssets = sumAmount(data.assets);

  const monthLabels = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];

  return (
    <div className="space-y-6">
      {/* YEAR PICKER + STAT ROW */}
      <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="font-bold text-[#F33615] text-lg">📊 {t("financeOverview")}</h2>
          <select value={year} onChange={(e) => setYear(e.target.value)} className="p-2 border rounded-lg text-black text-sm">
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl p-3 text-center border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">{t("finYearlyIncome")}</p>
            <p className="text-xl font-bold" style={{ color: COLOR_INCOME }}>{yearIncome.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">{t("finYearlyOutcome")}</p>
            <p className="text-xl font-bold" style={{ color: COLOR_OUTCOME }}>{yearOutcome.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">{t("finYearlyNet")}</p>
            <p className={`text-xl font-bold ${yearNet >= 0 ? "text-emerald-600" : "text-red-600"}`}>{yearNet.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">{t("financeAssets")}</p>
            <p className="text-xl font-bold text-gray-700">{totalAssets.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* MONTHLY BAR CHART: income vs outcome */}
      <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
        <div className="flex items-center gap-4 mb-3 text-xs font-semibold">
          <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm" style={{ background: COLOR_INCOME }} /> {t("financeIncome")}</span>
          <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm" style={{ background: COLOR_OUTCOME }} /> {t("financeOutcome")}</span>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 overflow-x-auto">
          <svg viewBox="0 0 720 220" className="w-full" style={{ minWidth: 600 }} role="img" aria-label={`${t("financeIncome")} vs ${t("financeOutcome")}`}>
            {/* baseline */}
            <line x1="0" y1="190" x2="720" y2="190" stroke="#e5e7eb" strokeWidth="1" />
            {monthLabels.map((m, i) => {
              const groupWidth = 720 / 12;
              const barWidth = 14;
              const gap = 4;
              const x0 = i * groupWidth + groupWidth / 2 - (barWidth * 2 + gap) / 2;
              const incomeH = (incomeByMonth[i] / maxValue) * 170;
              const outcomeH = (outcomeByMonth[i] / maxValue) * 170;
              return (
                <g key={m}>
                  <rect x={x0} y={190 - incomeH} width={barWidth} height={incomeH} rx="3" fill={COLOR_INCOME}>
                    <title>{`${t("financeIncome")} ${m}/${year}: ${incomeByMonth[i].toFixed(2)}`}</title>
                  </rect>
                  <rect x={x0 + barWidth + gap} y={190 - outcomeH} width={barWidth} height={outcomeH} rx="3" fill={COLOR_OUTCOME}>
                    <title>{`${t("financeOutcome")} ${m}/${year}: ${outcomeByMonth[i].toFixed(2)}`}</title>
                  </rect>
                  <text x={i * groupWidth + groupWidth / 2} y="207" fontSize="11" textAnchor="middle" fill="#6b7280">{m}</text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* PER-TYPE COUNTS (quick glance) */}
      <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
        <h2 className="font-bold text-[#F33615] text-lg mb-3">{t("financeTrialBalance")}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {MODULES.map((m) => (
            <div key={m.type} className="bg-white rounded-xl p-3 text-center border border-gray-200">
              <p className="text-xs text-gray-500 mb-1">{m.icon} {t(m.titleKey)}</p>
              <p className="text-lg font-bold text-gray-700">{data[m.type].length}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────── Cash statement ──────────────────────────────

function CashStatementTab({ data, t }: { data: DataMap; t: (k: TranslationKeys) => string }) {
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");

  const merged = useMemo(() => {
    const rows = [
      ...data.income.map((r) => ({ ...r, kind: "in" as const })),
      ...data.expenses.map((r) => ({ ...r, kind: "out" as const })),
    ];
    return rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  }, [data.income, data.expenses]);

  const years = useMemo(() => distinctYears([...data.income, ...data.expenses]), [data.income, data.expenses]);

  const filtered = useMemo(() => {
    return merged.filter((r) => {
      if (year) { const y = (r.date || "").slice(0, 4); if (y !== year) return false; }
      if (month) { const m = (r.date || "").slice(5, 7); if (m !== month) return false; }
      return true;
    });
  }, [merged, year, month]);

  let running = 0;
  const withBalance = filtered.map((r) => {
    running += r.kind === "in" ? r.amount : -r.amount;
    return { ...r, balance: Math.round(running * 100) / 100 };
  });

  const inputClass = "w-full p-2 border rounded-lg text-black text-sm";

  return (
    <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 space-y-4">
      <h2 className="font-bold text-[#F33615] text-lg">📑 {t("financeCashStatement")}</h2>
      <div className="flex flex-wrap gap-3">
        <div>
          <label className="text-xs text-gray-600 block mb-1">{t("finFilterYear")}</label>
          <select value={year} onChange={(e) => setYear(e.target.value)} className={inputClass}>
            <option value="">{t("finAllYears")}</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-600 block mb-1">{t("finFilterMonth")}</label>
          <select value={month} onChange={(e) => setMonth(e.target.value)} className={inputClass}>
            <option value="">{t("finAllMonths")}</option>
            {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>
      <div className="overflow-x-auto bg-white rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-600 border-b border-gray-200">
              <th className="text-start py-2 px-3">{t("date")}</th>
              <th className="text-start py-2 px-3">{t("finNote")}</th>
              <th className="text-start py-2 px-3">{t("status")}</th>
              <th className="text-start py-2 px-3">{t("finAmount")}</th>
              <th className="text-start py-2 px-3 font-bold">{t("finRunningBalance")}</th>
            </tr>
          </thead>
          <tbody>
            {withBalance.length === 0 ? (
              <tr><td colSpan={5} className="text-center text-gray-500 py-6">{t("finNoRecords")}</td></tr>
            ) : (
              withBalance.map((r) => (
                <tr key={`${r.kind}-${r.id}`} className="border-b border-gray-100">
                  <td className="py-2 px-3 text-black">{r.date}</td>
                  <td className="py-2 px-3 text-black">{r.name}</td>
                  <td className="py-2 px-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${r.kind === "in" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                      {r.kind === "in" ? t("financeIncome") : t("financeOutcome")}
                    </span>
                  </td>
                  <td className="py-2 px-3 font-semibold" style={{ color: r.kind === "in" ? COLOR_INCOME : COLOR_OUTCOME }}>
                    {r.kind === "in" ? "+" : "-"}{r.amount.toFixed(2)}
                  </td>
                  <td className="py-2 px-3 font-bold text-gray-800">{r.balance.toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ───────────────────────────── Trial balance ───────────────────────────────

function TrialBalanceTab({ data, t }: { data: DataMap; t: (k: TranslationKeys) => string }) {
  const totalCredit = sumAmount(data.income);
  const totalDebit = sumAmount(data.expenses) + sumAmount(data.assets);
  const net = Math.round((totalCredit - totalDebit) * 100) / 100;

  return (
    <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 space-y-4">
      <h2 className="font-bold text-[#F33615] text-lg">⚖️ {t("financeTrialBalance")}</h2>
      <p className="text-xs text-gray-500">{t("finTrialBalanceNote")}</p>
      <div className="overflow-x-auto bg-white rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-b border-gray-100">
              <td className="py-3 px-4 text-black">{t("finTotalCredit")}</td>
              <td className="py-3 px-4 font-bold text-right" style={{ color: COLOR_INCOME }}>{totalCredit.toFixed(2)}</td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="py-3 px-4 text-black">{t("finTotalDebit")}</td>
              <td className="py-3 px-4 font-bold text-right" style={{ color: COLOR_OUTCOME }}>{totalDebit.toFixed(2)}</td>
            </tr>
            <tr>
              <td className="py-3 px-4 font-bold text-black">{t("finNetBalance")}</td>
              <td className={`py-3 px-4 font-bold text-right ${net >= 0 ? "text-emerald-600" : "text-red-600"}`}>{net.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ───────────────────────────── Chart of Accounts ───────────────────────────

function ChartOfAccountsTab({
  accounts, entries, t, execute, onChanged,
}: {
  accounts: Account[];
  entries: JournalEntry[];
  t: (k: TranslationKeys) => string;
  execute: (input: RequestInfo, init?: RequestInit) => Promise<unknown>;
  onChanged: () => void;
}) {
  const emptyForm = { code: "", name: "", type: "asset" as AccountType, parentId: "" };
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");
  const importInputRef = useRef<HTMLInputElement>(null);

  const typeLabelMap: Record<AccountType, TranslationKeys> = {
    asset: "accTypeAsset",
    liability: "accTypeLiability",
    equity: "accTypeEquity",
    revenue: "accTypeRevenue",
    expense: "accTypeExpense",
  };
  const typeLabel = (type: AccountType) => t(typeLabelMap[type]);

  const save = async () => {
    setError("");
    if (!form.code.trim() || !form.name.trim()) return setError(t("accCodeRequired"));
    setSaving(true);
    const body = { code: form.code.trim(), name: form.name.trim(), type: form.type, parentId: form.parentId || "" };
    const url = editingId ? `/api/accounting/accounts/${editingId}` : "/api/accounting/accounts";
    const res = await execute(url, {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (res) {
      setForm(emptyForm);
      setEditingId(null);
      onChanged();
    } else {
      setError("Error");
    }
  };

  const startEdit = (a: Account) => {
    setForm({ code: a.code, name: a.name, type: a.type, parentId: a.parentId || "" });
    setEditingId(a.id);
    setError("");
  };

  const cancelEdit = () => {
    setForm(emptyForm);
    setEditingId(null);
    setError("");
  };

  const remove = async (id: string) => {
    if (!confirm(t("accDeleteConfirm"))) return;
    if (editingId === id) cancelEdit();
    await execute(`/api/accounting/accounts/${id}`, { method: "DELETE" });
    onChanged();
  };

  const handleExport = () => {
    exportToExcel("chart-of-accounts", "Accounts", accounts.map((a) => {
      const parent = accounts.find((p) => p.id === a.parentId);
      return { code: a.code, name: a.name, type: a.type, parentCode: parent?.code || "" };
    }));
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportMsg("");
    try {
      const rows = await parseExcelFile(file);
      const res = await execute("/api/accounting/accounts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const r = res as { createdCount?: number; skipped?: { row: number; reason: string }[] } | null;
      if (r) {
        const created = r.createdCount ?? 0;
        const skippedCount = r.skipped?.length ?? 0;
        setImportMsg(`${t("finImportDone")}: ${created} ${t("finImportRecordsCreated")}${skippedCount ? `, ${skippedCount} ${t("finImportRowsSkipped")}` : ""}`);
        onChanged();
      } else {
        setImportMsg(t("finImportFailed"));
      }
    } catch {
      setImportMsg(t("finImportFailed"));
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  const inputClass = "w-full p-2 border rounded-lg text-black text-sm";
  const grouped = ACCOUNT_TYPES.map((type) => ({
    type,
    list: accounts.filter((a) => a.type === type).sort((a, b) => a.code.localeCompare(b.code)),
  }));

  return (
    <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold text-[#F33615] text-lg">📒 {t("financeChartOfAccounts")}</h2>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 text-xs font-semibold hover:border-[#F33615] hover:text-[#F33615] transition">
            ⬇️ {t("excelExport")}
          </button>
          <button onClick={() => importInputRef.current?.click()} disabled={importing} className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 text-xs font-semibold hover:border-[#F33615] hover:text-[#F33615] transition disabled:opacity-60">
            ⬆️ {t("excelImport")}
          </button>
          <input ref={importInputRef} type="file" accept=".xlsx,.xls" onChange={handleImportFile} className="hidden" />
        </div>
      </div>
      {importMsg && <p className="text-xs text-gray-600">{importMsg}</p>}

      {/* ADD/EDIT FORM */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        {error && <p className="text-red-500 text-xs mb-2">{error}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-gray-600 block mb-1">{t("accCode")}</label>
            <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className="text-xs text-gray-600 block mb-1">{t("accName")}</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className="text-xs text-gray-600 block mb-1">{t("accType")}</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as AccountType })} className={inputClass}>
              {ACCOUNT_TYPES.map((ty) => <option key={ty} value={ty}>{typeLabel(ty)}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-600 block mb-1">{t("accParent")}</label>
            <select value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })} className={inputClass}>
              <option value="">{t("accNoParent")}</option>
              {accounts.filter((a) => a.id !== editingId).map((a) => (
                <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg text-white text-sm font-semibold bg-[#030405] hover:bg-[#F33615] transition disabled:opacity-60">
            {editingId ? `💾 ${t("saveChanges")}` : `➕ ${t("accAddAccount")}`}
          </button>
          {editingId && (
            <button onClick={cancelEdit} className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-300 text-gray-600 hover:bg-gray-100 transition">
              {t("cancel")}
            </button>
          )}
        </div>
      </div>

      {/* ACCOUNTS GROUPED BY TYPE */}
      <div className="space-y-4">
        {grouped.map(({ type, list }) => (
          <div key={type} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-2 bg-gray-100 font-semibold text-sm text-gray-700">{typeLabel(type)}</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-600 border-b border-gray-200">
                    <th className="text-start py-2 px-3">{t("accCode")}</th>
                    <th className="text-start py-2 px-3">{t("accName")}</th>
                    <th className="text-start py-2 px-3">{t("accParent")}</th>
                    <th className="text-start py-2 px-3">{t("accBalance")}</th>
                    <th className="text-start py-2 px-3">{t("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {list.length === 0 ? (
                    <tr><td colSpan={5} className="text-center text-gray-500 py-4">{t("accNoAccounts")}</td></tr>
                  ) : (
                    list.map((a) => {
                      const parent = accounts.find((p) => p.id === a.parentId);
                      return (
                        <tr key={a.id} className="border-b border-gray-100">
                          <td className="py-2 px-3 text-black">{a.code}</td>
                          <td className="py-2 px-3 text-black">{a.name}</td>
                          <td className="py-2 px-3 text-gray-500">{parent ? `${parent.code} — ${parent.name}` : "—"}</td>
                          <td className="py-2 px-3 font-semibold text-black">{accountBalance(entries, a).toFixed(2)}</td>
                          <td className="py-2 px-3">
                            <div className="flex gap-1">
                              <button onClick={() => startEdit(a)} className="px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-gray-400 text-xs font-semibold hover:border-blue-300 hover:text-blue-600 transition">✏️</button>
                              <button onClick={() => remove(a.id)} className="px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-gray-400 text-xs font-semibold hover:border-red-300 hover:text-red-600 transition">🗑</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ───────────────────────────── Journal Entries (double-entry) ──────────────

function JournalEntriesTab({
  accounts, entries, t, execute, onChanged,
}: {
  accounts: Account[];
  entries: JournalEntry[];
  t: (k: TranslationKeys) => string;
  execute: (input: RequestInfo, init?: RequestInit) => Promise<unknown>;
  onChanged: () => void;
}) {
  const emptyLine = (): JournalLine => ({ accountId: "", debit: 0, credit: 0, note: "" });
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState<JournalLine[]>([emptyLine(), emptyLine()]);
  const [fileData, setFileData] = useState("");
  const [fileName, setFileName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");
  const importInputRef = useRef<HTMLInputElement>(null);

  const totalDebit = sumDebits(lines);
  const totalCredit = sumCredits(lines);
  const balanced = isBalanced(lines);

  const accountLabel = (id: string) => {
    const a = accounts.find((x) => x.id === id);
    return a ? `${a.code} — ${a.name}` : "—";
  };

  const updateLine = (idx: number, patch: Partial<JournalLine>) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };
  const addLine = () => setLines((prev) => [...prev, emptyLine()]);
  const removeLine = (idx: number) => setLines((prev) => prev.filter((_, i) => i !== idx));

  const resetForm = () => {
    setDate("");
    setDescription("");
    setLines([emptyLine(), emptyLine()]);
    setFileData("");
    setFileName("");
    setEditingId(null);
    setError("");
  };

  const save = async () => {
    setError("");
    if (!date) return setError(t("date"));
    if (!description.trim()) return setError(t("jeEntryDescRequired"));
    const activeLines = lines.filter((l) => l.accountId && ((Number(l.debit) || 0) > 0 || (Number(l.credit) || 0) > 0));
    if (activeLines.length < 2) return setError(t("jeNeedTwoLines"));
    if (!isBalanced(activeLines)) return setError(t("jeUnbalanced"));
    setSaving(true);
    const body = { date, description: description.trim(), lines: activeLines, fileData, fileName };
    const url = editingId ? `/api/accounting/entries/${editingId}` : "/api/accounting/entries";
    const res = await execute(url, {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (res) {
      resetForm();
      onChanged();
    } else {
      setError("Error");
    }
  };

  const startEdit = (e: JournalEntry) => {
    setDate(e.date);
    setDescription(e.description);
    setLines(e.lines.length ? e.lines.map((l) => ({ ...l })) : [emptyLine(), emptyLine()]);
    setFileData(e.fileData || "");
    setFileName(e.fileName || "");
    setEditingId(e.id);
    setError("");
  };

  const remove = async (id: string) => {
    if (!confirm(t("jeDeleteConfirm"))) return;
    if (editingId === id) resetForm();
    await execute(`/api/accounting/entries/${id}`, { method: "DELETE" });
    onChanged();
  };

  const handleExport = () => {
    const rows: Record<string, unknown>[] = [];
    for (const e of sorted) {
      for (const l of e.lines) {
        const a = accounts.find((x) => x.id === l.accountId);
        rows.push({
          date: e.date,
          description: e.description,
          accountCode: a?.code || "",
          debit: l.debit || 0,
          credit: l.credit || 0,
        });
      }
    }
    exportToExcel("journal-entries", "Journal", rows);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportMsg("");
    try {
      const rows = await parseExcelFile(file);
      const res = await execute("/api/accounting/entries/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const r = res as { createdCount?: number; skipped?: { row: number; reason: string }[] } | null;
      if (r) {
        const created = r.createdCount ?? 0;
        const skippedCount = r.skipped?.length ?? 0;
        setImportMsg(`${t("finImportDone")}: ${created} ${t("finImportRecordsCreated")}${skippedCount ? `, ${skippedCount} ${t("finImportRowsSkipped")}` : ""}`);
        onChanged();
      } else {
        setImportMsg(t("finImportFailed"));
      }
    } catch {
      setImportMsg(t("finImportFailed"));
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  const inputClass = "w-full p-2 border rounded-lg text-black text-sm";
  const sorted = useMemo(() => [...entries].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)), [entries]);

  return (
    <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold text-[#F33615] text-lg">🧾 {t("financeJournalEntries")}</h2>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 text-xs font-semibold hover:border-[#F33615] hover:text-[#F33615] transition">
            ⬇️ {t("excelExport")}
          </button>
          <button onClick={() => importInputRef.current?.click()} disabled={importing} className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 text-xs font-semibold hover:border-[#F33615] hover:text-[#F33615] transition disabled:opacity-60">
            ⬆️ {t("excelImport")}
          </button>
          <input ref={importInputRef} type="file" accept=".xlsx,.xls" onChange={handleImportFile} className="hidden" />
        </div>
      </div>
      {importMsg && <p className="text-xs text-gray-600">{importMsg}</p>}

      {/* ADD/EDIT FORM */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        {error && <p className="text-red-500 text-xs">{error}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-gray-600 block mb-1">{t("date")}</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
          </div>
          <div className="lg:col-span-2">
            <label className="text-xs text-gray-600 block mb-1">{t("jeDescription")}</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="text-xs text-gray-600 block mb-1">{t("jeAttachment")}</label>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  setFileData(reader.result as string);
                  setFileName(file.name);
                };
                reader.readAsDataURL(file);
              }}
              className="w-full text-xs text-gray-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
            />
            {fileName && <p className="text-[10px] text-gray-500 mt-1 truncate">📎 {fileName}</p>}
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-600 bg-gray-50 border-b border-gray-200">
                <th className="text-start py-2 px-3">{t("jeAccount")}</th>
                <th className="text-start py-2 px-3">{t("jeDebit")}</th>
                <th className="text-start py-2 px-3">{t("jeCredit")}</th>
                <th className="text-start py-2 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, idx) => (
                <tr key={idx} className="border-b border-gray-100">
                  <td className="py-2 px-3">
                    <select value={l.accountId} onChange={(e) => updateLine(idx, { accountId: e.target.value })} className={inputClass}>
                      <option value="">{t("jeSelectAccount")}</option>
                      {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                    </select>
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number" step="0.01" value={l.debit || ""}
                      onChange={(e) => updateLine(idx, { debit: Number(e.target.value) || 0, credit: 0 })}
                      className={inputClass}
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number" step="0.01" value={l.credit || ""}
                      onChange={(e) => updateLine(idx, { credit: Number(e.target.value) || 0, debit: 0 })}
                      className={inputClass}
                    />
                  </td>
                  <td className="py-2 px-3">
                    {lines.length > 2 && (
                      <button onClick={() => removeLine(idx)} className="px-2 py-1 rounded-lg bg-white border border-gray-200 text-gray-400 text-xs hover:border-red-300 hover:text-red-600 transition">🗑</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button onClick={addLine} className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-300 text-gray-600 hover:bg-gray-100 transition">
            ➕ {t("jeAddLine")}
          </button>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="text-gray-600">{t("jeTotalDebit")}: <strong className="text-black">{totalDebit.toFixed(2)}</strong></span>
            <span className="text-gray-600">{t("jeTotalCredit")}: <strong className="text-black">{totalCredit.toFixed(2)}</strong></span>
            <span className={`font-semibold ${balanced ? "text-emerald-600" : "text-red-600"}`}>
              {balanced ? `✓ ${t("jeBalanced")}` : `⚠ ${t("jeUnbalanced")}`}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg text-white text-sm font-semibold bg-[#030405] hover:bg-[#F33615] transition disabled:opacity-60">
            {editingId ? `💾 ${t("saveChanges")}` : `➕ ${t("jePostEntry")}`}
          </button>
          {editingId && (
            <button onClick={resetForm} className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-300 text-gray-600 hover:bg-gray-100 transition">
              {t("cancel")}
            </button>
          )}
        </div>
      </div>

      {/* LIST */}
      <div className="overflow-x-auto bg-white rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-600 border-b border-gray-200">
              <th className="text-start py-2 px-3">{t("date")}</th>
              <th className="text-start py-2 px-3">{t("jeDescription")}</th>
              <th className="text-start py-2 px-3">{t("jeLines")}</th>
              <th className="text-start py-2 px-3">{t("jeTotalDebit")}</th>
              <th className="text-start py-2 px-3">{t("jeAttachment")}</th>
              <th className="text-start py-2 px-3">{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr><td colSpan={6} className="text-center text-gray-500 py-6">{t("jeNoEntries")}</td></tr>
            ) : (
              sorted.map((e) => (
                <tr key={e.id} className="border-b border-gray-100 align-top">
                  <td className="py-2 px-3 text-black">{e.date}</td>
                  <td className="py-2 px-3 text-black">{e.description}</td>
                  <td className="py-2 px-3 text-gray-600 text-xs">
                    {e.lines.map((l, i) => (
                      <div key={i}>
                        {accountLabel(l.accountId)}: {(Number(l.debit) || 0) > 0 ? `+${Number(l.debit).toFixed(2)}` : `-${Number(l.credit).toFixed(2)}`}
                      </div>
                    ))}
                  </td>
                  <td className="py-2 px-3 font-semibold text-black">{sumDebits(e.lines).toFixed(2)}</td>
                  <td className="py-2 px-3">
                    {e.fileData ? (
                      <a href={e.fileData} download={e.fileName || "attachment"} className="text-[#F33615] underline text-xs">
                        📎 {e.fileName || t("jeAttachment")}
                      </a>
                    ) : "—"}
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex gap-1">
                      <button onClick={() => startEdit(e)} className="px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-gray-400 text-xs font-semibold hover:border-blue-300 hover:text-blue-600 transition">✏️</button>
                      <button onClick={() => remove(e.id)} className="px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-gray-400 text-xs font-semibold hover:border-red-300 hover:text-red-600 transition">🗑</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
