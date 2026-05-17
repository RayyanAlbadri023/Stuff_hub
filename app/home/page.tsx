"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/app/hooks/useAuth";
import { useLang } from "@/app/context/LangContext";
import LangToggle from "@/app/components/LangToggle";

export default function HomePage() {
  const router = useRouter();
  const { loading, logout } = useAuth();
  const { t, isRTL } = useLang();

  if (loading) return null;

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-gradient-to-br from-[#F5F7FF] to-[#ce908b] p-5">
      {/* NAVBAR */}
      <div className="max-w-[1100px] mx-auto flex justify-between items-center px-5 py-3 rounded-[15px] bg-white/60 backdrop-blur-xl border border-[rgba(236,81,14,0.15)]">
        <div className="flex items-center gap-2 font-bold text-[#ec510e]">
          <img src="/ibana.png" className="w-10 h-10 rounded-full" alt="logo" />
          {t("appName")}
        </div>
        <div className="hidden md:flex gap-5 text-[14px] text-gray-900">
          <button onClick={() => router.push("/")} className="hover:text-[#ec510e]">{t("home")}</button>
          <button onClick={() => router.push("/login")} className="hover:text-[#ec510e]">{t("login")}</button>
          <button onClick={() => router.push("/signup")} className="hover:text-[#ec510e]">{t("signup")}</button>
        </div>
        <div className="flex gap-2 items-center">
          <LangToggle />
          <button onClick={() => router.push("/signup")} className="px-4 py-2 rounded-full text-white bg-gradient-to-r from-[#ec510e] to-[#ecbcaf]">{t("getStarted")}</button>
          <button onClick={logout} className="px-4 py-2 rounded-full text-white bg-gradient-to-r from-red-500 to-red-400">{t("logout")}</button>
        </div>
      </div>

      {/* HERO */}
      <div className="max-w-[1100px] mx-auto text-center mt-10 px-5 py-12 rounded-[20px] bg-white/50 backdrop-blur-xl border border-[rgba(236,81,14,0.15)]">
        <h1 className="text-[32px] text-[#ec510e] mb-2">{t("welcomeToIbana")}</h1>
        <p className="text-[14px] text-gray-600">{t("homeSubtitle")}</p>
      </div>

      {/* CARDS */}
      <div className="max-w-[1100px] mx-auto mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
        {[
          { label: t("employeeCard"), path: "/employee", desc: t("employeeDesc") },
          { label: t("traineeCard"),  path: "/trainee",  desc: t("traineeDesc") },
          { label: t("productsCard"), path: "/product",  desc: t("productsDesc") },
        ].map(({ label, path, desc }) => (
          <button key={path} onClick={() => router.push(path)}
            className="w-full bg-white/60 backdrop-blur-xl p-5 rounded-[15px] border border-[rgba(236,81,14,0.15)] text-center transition hover:-translate-y-1 hover:shadow-lg">
            <h3 className="text-[#ec510e] mb-2 font-semibold">{label}</h3>
            <p className="text-[13px] text-gray-600">{desc}</p>
          </button>
        ))}
      </div>

      <div className="text-center mt-10 text-[12px] text-gray-500">{t("copyright")}</div>
    </div>
  );
}
