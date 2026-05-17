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

  const ADMIN_EMAIL = "admin@ibana.com";

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
      if (role === "admin") { window.location.href = "/admin"; } else { window.location.href = "/home"; }
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Something went wrong");
    } finally { setLoading(false); }
  };

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="h-screen flex items-center justify-center bg-gradient-to-br from-[#F5F7FF] to-[#ce908b]">
      <div className={`absolute top-4 ${isRTL ? "left-4" : "right-4"}`}><LangToggle /></div>
      <div className="relative w-[400px] p-8 pt-20 rounded-2xl text-center bg-white/60 backdrop-blur-xl border border-purple-200 shadow-xl">
        <img src="/ibana.png" className="absolute -top-14 left-1/2 -translate-x-1/2 w-28 h-28 rounded-full" />
        <h1 className="text-2xl font-semibold text-[#ec510e]">{t("welcomeBack")}</h1>
        <p className="text-sm text-gray-500 mb-5">{t("loginSubtitle")}</p>
        {serverError && <p className="text-red-500 text-xs mb-2">{serverError}</p>}
        <input placeholder={t("emailPlaceholder")} className="w-full p-3 mb-2 rounded bg-white text-black" value={email} onChange={(e) => setEmail(e.target.value)} />
        {emailError && <p className="text-red-500 text-xs">{t("invalidEmail")}</p>}
        <input type="password" placeholder={t("passwordPlaceholder")} className="w-full p-3 mt-2 mb-2 rounded bg-white text-black" value={password} onChange={(e) => setPassword(e.target.value)} />
        {passError && <p className="text-red-500 text-xs">{t("passwordRequired")}</p>}
        <button onClick={validateLogin} disabled={loading} className="w-full mt-5 py-3 rounded-full text-white font-semibold bg-gradient-to-r from-[#ec510e] to-[#ecbcaf]">
          {loading ? t("loggingIn") : t("loginBtn")}
        </button>
        <p onClick={() => { setEmail(ADMIN_EMAIL); setPassword("admin123"); }} className="text-[11px] text-black mt-3 cursor-pointer underline">{t("loginAsAdmin")}</p>
        <p onClick={() => router.push("/forget")} className="text-[11px] text-[#ec510e] mt-3 cursor-pointer">{t("forgotPassword")}</p>
        <div className="mt-4 text-[11px] text-gray-600">
          {t("noAccount")}{" "}<span onClick={() => router.push("/signup")} className="text-[#ec510e] font-semibold cursor-pointer">{t("signupLink")}</span>
        </div>
      </div>
    </div>
  );
}
