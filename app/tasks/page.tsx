"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/hooks/useAuth";
import { useRequest } from "@/app/hooks/useRequest";
import { useLang } from "@/app/context/LangContext";
import LangToggle from "@/app/components/LangToggle";

type TaskStatus = "task" | "in_progress" | "done";

interface TaskItem {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  startDate?: string;
  endDate?: string;
  createdAt?: string;
}

const COLUMNS: { key: TaskStatus; icon: string }[] = [
  { key: "task", icon: "📋" },
  { key: "in_progress", icon: "⏳" },
  { key: "done", icon: "✅" },
];

export default function TasksPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { execute } = useRequest();
  const { t, isRTL } = useLang();

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    if (authLoading || !user?.email) return;
    let cancelled = false;
    async function fetchTasks() {
      setDataLoading(true);
      const res = await execute(`/api/tasks?email=${encodeURIComponent(user!.email!)}`);
      if (cancelled) return;
      setTasks((res as { tasks?: TaskItem[] })?.tasks ?? []);
      setDataLoading(false);
    }
    fetchTasks();
    return () => { cancelled = true; };
  }, [authLoading, user?.email, execute, reloadKey]);

  const moveTask = async (id: string, status: TaskStatus) => {
    setTasks((prev) => prev.map((tk) => (tk.id === id ? { ...tk, status } : tk)));
    await execute(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  };

  if (authLoading) return null;

  const COLUMN_LABELS: Record<TaskStatus, string> = {
    task: t("colTask"),
    in_progress: t("colInProgress"),
    done: t("colDone"),
  };

  const NEXT: Record<TaskStatus, TaskStatus | null> = { task: "in_progress", in_progress: "done", done: null };
  const PREV: Record<TaskStatus, TaskStatus | null> = { task: null, in_progress: "task", done: "in_progress" };

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-white p-4">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        {/* HEADER */}
        <div className="bg-[#030405] border border-[#030405] shadow-sm rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
          <button onClick={() => router.push("/employee")} className="px-3 sm:px-4 py-2 text-sm text-white rounded-full bg-gradient-to-r from-[#F33615] to-[#ff6b4a]">
            {t("homeBtn")}
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-white order-last sm:order-none w-full sm:w-auto text-center">{t("myTasksTitle")}</h1>
          <LangToggle dark />
        </div>

        {dataLoading && <div className="text-center py-10 text-[#F33615] font-semibold text-lg animate-pulse">{t("loading")}</div>}

        {!dataLoading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {COLUMNS.map(({ key, icon }) => {
              const items = tasks.filter((tk) => tk.status === key);
              return (
                <div key={key} className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex flex-col gap-3 min-h-[200px]">
                  <h2 className="font-bold text-[#F33615] flex items-center gap-2">
                    {icon} {COLUMN_LABELS[key]} <span className="text-sm text-gray-500 font-normal">({items.length})</span>
                  </h2>
                  {items.length === 0 && <p className="text-gray-500 text-sm text-center py-6">{t("noTasks")}</p>}
                  {items.map((tk) => (
                    <div key={tk.id} className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
                      <p className="font-semibold text-black text-sm">{tk.title}</p>
                      {tk.description && <p className="text-xs text-gray-600 mt-1">{tk.description}</p>}
                      {(tk.startDate || tk.endDate) && (
                        <p className="text-xs text-gray-400 mt-1">📅 {tk.startDate || "…"} → {tk.endDate || "…"}</p>
                      )}
                      <div className="flex gap-2 mt-3">
                        {PREV[tk.status] && (
                          <button onClick={() => moveTask(tk.id, PREV[tk.status]!)} className="flex-1 px-2 py-1.5 rounded-lg bg-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-300 transition">
                            ← {t("moveBack")}
                          </button>
                        )}
                        {NEXT[tk.status] && (
                          <button onClick={() => moveTask(tk.id, NEXT[tk.status]!)} className="flex-1 px-2 py-1.5 rounded-lg bg-[#F33615] text-white text-xs font-semibold hover:bg-[#d4480c] transition">
                            {t("moveForward")} →
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
