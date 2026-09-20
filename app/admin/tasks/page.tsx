"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/hooks/useAuth";
import { useRequest } from "@/app/hooks/useRequest";
import { useLang } from "@/app/context/LangContext";
import LangToggle from "@/app/components/LangToggle";

interface User {
  id: number;
  firstName?: string;
  lastName?: string;
  email: string;
}

type TaskStatus = "task" | "in_progress" | "done";
interface TaskItem {
  id: string;
  title: string;
  description?: string;
  assignedToId: string;
  assignedToName?: string;
  assignedToEmail?: string;
  status: TaskStatus;
  createdAt?: string;
}

type ApiUsersResponse = User[];
type ApiTasksResponse = { tasks: TaskItem[] };

const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  task: "bg-gray-100 text-gray-700",
  in_progress: "bg-blue-100 text-blue-700",
  done: "bg-green-100 text-green-700",
};

export default function AdminTasksPage() {
  const router = useRouter();
  const { loading: authLoading, logout } = useAuth({ requiredRole: "admin" });
  const { execute } = useRequest();
  const { t, isRTL } = useLang();

  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [filterTaskStatus, setFilterTaskStatus] = useState<TaskStatus | "all">("all");
  const [reloadKey, setReloadKey] = useState(0);
  const loadData = useCallback(() => setReloadKey((k) => k + 1), []);
  const [newTask, setNewTask] = useState({ title: "", description: "", assignedToId: "" });

  const executeRef = useRef(execute);
  useEffect(() => { executeRef.current = execute; });

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    async function fetchData() {
      setDataLoading(true); setApiError("");
      try {
        const [usersData, taskData] = await Promise.all([
          executeRef.current("/api/users"),
          executeRef.current("/api/tasks"),
        ]);
        if (cancelled) return;
        setUsers(Array.isArray(usersData) ? (usersData as ApiUsersResponse) : []);
        setTasks(Array.isArray((taskData as ApiTasksResponse)?.tasks) ? (taskData as ApiTasksResponse).tasks : []);
      } catch (err) {
        if (!cancelled) setApiError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, [authLoading, reloadKey]);

  const addTask = async () => {
    if (!newTask.title.trim() || !newTask.assignedToId) return alert(t("taskFormError"));
    const assignee = users.find((u) => String(u.id) === newTask.assignedToId);
    await execute("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newTask.title,
        description: newTask.description,
        assignedToId: newTask.assignedToId,
        assignedToName: `${assignee?.firstName ?? ""} ${assignee?.lastName ?? ""}`.trim(),
        assignedToEmail: assignee?.email ?? "",
      }),
    });
    setNewTask({ title: "", description: "", assignedToId: "" });
    loadData();
  };

  const deleteTask = async (id: string) => {
    if (!confirm(t("deleteTask"))) return;
    await execute(`/api/tasks/${id}`, { method: "DELETE" });
    setTasks((prev) => prev.filter((tk) => tk.id !== id));
  };

  const updateTaskStatus = async (id: string, status: TaskStatus) => {
    setTasks((prev) => prev.map((tk) => (tk.id === id ? { ...tk, status } : tk)));
    await execute(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  };

  const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
    task: t("colTask"),
    in_progress: t("colInProgress"),
    done: t("colDone"),
  };

  const taskStatusCounts: Record<TaskStatus, number> = {
    task: tasks.filter((tk) => tk.status === "task").length,
    in_progress: tasks.filter((tk) => tk.status === "in_progress").length,
    done: tasks.filter((tk) => tk.status === "done").length,
  };
  const filteredTasks = tasks.filter((tk) => filterTaskStatus === "all" || tk.status === filterTaskStatus);

  if (authLoading) return null;

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-white p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* HEADER */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#030405] rounded-2xl p-4 shadow-sm">
          <button onClick={() => router.push("/admin")} className="px-3 sm:px-4 py-2 text-sm text-white rounded-full bg-gradient-to-r from-[#F33615] to-[#ff6b4a]">
            {t("backToDashboard")}
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-white order-last sm:order-none w-full sm:w-auto text-center">{t("tasksPageTitle")}</h1>
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
          <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
            <h2 className="font-bold mb-4 text-[#F33615] text-lg">🗂️ {t("manageTasks")} ({tasks.length})</h2>

            {/* STATUS OVERVIEW */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              {(["task", "in_progress", "done"] as const).map((s) => (
                <div key={s} className="bg-white rounded-xl p-3 text-center border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">{TASK_STATUS_LABELS[s]}</p>
                  <p className={`text-2xl font-bold ${s === "task" ? "text-gray-700" : s === "in_progress" ? "text-blue-600" : "text-green-600"}`}>{taskStatusCounts[s]}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4">
              <input placeholder={t("taskTitle")} value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                className="p-2.5 border rounded-lg text-black bg-white/80 md:col-span-1" />
              <input placeholder={t("taskDescription")} value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                className="p-2.5 border rounded-lg text-black bg-white/80 md:col-span-2" />
              <select value={newTask.assignedToId} onChange={(e) => setNewTask({ ...newTask, assignedToId: e.target.value })}
                className="p-2.5 border rounded-lg text-black bg-white/80">
                <option value="">{t("assignTo")}</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                ))}
              </select>
              <button onClick={addTask} className="md:col-span-4 py-2.5 rounded-lg text-white font-semibold bg-gradient-to-r from-[#F33615] to-[#ff6b4a]">
                ➕ {t("addTask")}
              </button>
            </div>

            {/* STATUS FILTER */}
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="text-sm text-gray-600 self-center font-medium">{t("filterStatus")}:</span>
              {(["all", "task", "in_progress", "done"] as const).map((s) => (
                <button key={s} onClick={() => setFilterTaskStatus(s)} className={`px-3 py-1 rounded-full text-sm font-medium transition ${filterTaskStatus === s ? "bg-[#F33615] text-white" : "bg-white text-gray-700 hover:bg-gray-100"}`}>
                  {s === "all" ? t("all") : TASK_STATUS_LABELS[s]}
                </button>
              ))}
            </div>

            {filteredTasks.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-6">{t("noTasks")}</p>
            ) : (
              <div className="space-y-2">
                {filteredTasks.map((tk) => (
                  <div key={tk.id} className="flex flex-wrap gap-3 justify-between items-center p-3 bg-white rounded-lg border border-gray-200">
                    <div className="min-w-0">
                      <p className="font-medium text-black break-words">{tk.title}</p>
                      {tk.description && <p className="text-xs text-gray-500 break-words">{tk.description}</p>}
                      <p className="text-xs text-gray-400">{tk.assignedToName || tk.assignedToEmail}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${TASK_STATUS_COLORS[tk.status]}`}>{TASK_STATUS_LABELS[tk.status]}</span>
                      <select
                        value={tk.status}
                        onChange={(e) => updateTaskStatus(tk.id, e.target.value as TaskStatus)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-black bg-white"
                      >
                        <option value="task">{t("colTask")}</option>
                        <option value="in_progress">{t("colInProgress")}</option>
                        <option value="done">{t("colDone")}</option>
                      </select>
                      <button onClick={() => deleteTask(tk.id)} className="px-3 py-1 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition">{t("delete")}</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
