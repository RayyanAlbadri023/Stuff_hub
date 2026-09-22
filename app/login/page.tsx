"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/app/context/LangContext";
import LangToggle from "@/app/components/LangToggle";

type User = {
  id: string;
  email: string;
  role: string;
  firstName?: string;
};

export default function LoginPage() {
  const router = useRouter();
  const { t, isRTL } = useLang();

  const ADMIN_EMAIL = "admin@ebanah.com";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState(false);
  const [passError, setPassError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  const validateLogin = async () => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    let valid = true;
    if (!emailPattern.test(email)) { setEmailError(true); valid = false; } else setEmailError(false);
    if (password.trim() === "") { setPassError(true); valid = false; } else setPassError(false);
    if (!valid) return;
    try {
      setLoading(true); setServerError("");
      const res = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const text = await res.text();
      let data: { message?: string; user?: User } = {};
      try { data = text ? JSON.parse(text) : {}; } catch { throw new Error("Server returned invalid JSON"); }
      if (!res.ok) throw new Error(data.message || "Login failed");
      if (!data.user) throw new Error("Invalid server response");
      localStorage.setItem("user", JSON.stringify(data.user));
      const role = data.user.role;
      localStorage.setItem("role", role);
      localStorage.setItem("token", "temp-token");
      if (role === "admin") { window.location.href = "/admin"; }
      else if (role === "manager") { window.location.href = "/manager"; }
      else { window.location.href = "/home"; }
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Something went wrong");
    } finally { setLoading(false); }
  };

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className={`absolute top-4 ${isRTL ? "left-4" : "right-4"}`}><LangToggle /></div>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#030405] mb-4 overflow-hidden">
            <img src="/ibana.png" className="h-full w-full object-cover" alt="logo" />
          </div>
          <h1 className="text-xl font-semibold text-black tracking-tight">{t("welcomeBack")}</h1>
          <p className="text-black/40 text-sm mt-1">{t("loginSubtitle")}</p>
        </div>

        <div className="border border-black/10 rounded-2xl p-6">
          {serverError && (
            <div className="bg-black/[0.03] border border-black/10 rounded-lg px-4 py-3 text-sm text-black/60 mb-4">
              {serverError}
            </div>
          )}

          <div className="space-y-1.5 mb-4">
            <label className="text-[11px] font-semibold text-black/50 uppercase tracking-wide">{t("emailPlaceholder")}</label>
            <input
              placeholder={t("emailPlaceholder")}
              className="w-full p-3 rounded-lg border border-black/10 text-black outline-none focus:border-[#F33615]/50 focus:ring-2 focus:ring-[#F33615]/10 transition"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {emailError && <p className="text-red-500 text-xs">{t("invalidEmail")}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-black/50 uppercase tracking-wide">{t("passwordPlaceholder")}</label>
            <input
              type="password"
              placeholder={t("passwordPlaceholder")}
              className="w-full p-3 rounded-lg border border-black/10 text-black outline-none focus:border-[#F33615]/50 focus:ring-2 focus:ring-[#F33615]/10 transition"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {passError && <p className="text-red-500 text-xs">{t("passwordRequired")}</p>}
          </div>

          <button
            onClick={validateLogin}
            disabled={loading}
            className="w-full mt-5 py-3 rounded-full text-white font-semibold bg-[#030405] hover:bg-[#F33615] transition-colors disabled:opacity-50"
          >
            {loading ? t("loggingIn") : t("loginBtn")}
          </button>

          <p onClick={() => { setEmail(ADMIN_EMAIL); setPassword("admin123"); }} className="text-[11px] text-black/40 mt-4 text-center cursor-pointer underline hover:text-black transition">{t("loginAsAdmin")}</p>
          <p onClick={() => router.push("/forget")} className="text-[11px] text-[#F33615] mt-2 text-center cursor-pointer font-semibold">{t("forgotPassword")}</p>
        </div>

        <div className="mt-5 text-center text-[11px] text-black/50">
          {t("noAccount")}{" "}<span onClick={() => router.push("/signup")} className="text-[#F33615] font-semibold cursor-pointer">{t("signupLink")}</span>
        </div>
      </div>
    </div>
  );
}
