"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/app/hooks/useAuth";
import { useLang } from "@/app/context/LangContext";
import LangToggle from "@/app/components/LangToggle";
import WebGLBackground from "@/app/components/WebGLBackground";

export default function HomePage() {
  const router = useRouter();
  const { loading, logout } = useAuth();
  const { t, isRTL } = useLang();

  if (loading) return null;

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-white p-5">
      {/* NAVBAR */}
      <div className="max-w-[1100px] mx-auto flex flex-wrap gap-3 justify-between items-center px-4 sm:px-5 py-3 rounded-[15px] bg-[#030405] border border-[#030405] shadow-sm">
        <div className="flex items-center gap-2 font-bold text-white">
          <img src="/ibana.png" className="w-10 h-10 rounded-full" alt="logo" />
          {t("appName")}
        </div>
        <div className="hidden md:flex gap-5 text-[14px] text-gray-300">
          <button onClick={() => router.push("/")} className="hover:text-[#F33615]">{t("home")}</button>
          <button onClick={() => router.push("/login")} className="hover:text-[#F33615]">{t("login")}</button>
          <button onClick={() => router.push("/signup")} className="hover:text-[#F33615]">{t("signup")}</button>
        </div>
        <div className="flex flex-wrap gap-2 items-center justify-end">
          <LangToggle dark />
          <button onClick={() => router.push("/signup")} className="px-3 sm:px-4 py-2 text-sm rounded-full text-white bg-gradient-to-r from-[#F33615] to-[#ff6b4a]">{t("getStarted")}</button>
          <button onClick={logout} className="px-3 sm:px-4 py-2 text-sm rounded-full text-white bg-gradient-to-r from-red-500 to-red-400">{t("logout")}</button>
        </div>
      </div>

      {/* HERO */}
      <div className="relative max-w-[1100px] mx-auto text-center mt-10 px-5 py-14 sm:py-20 rounded-[20px] overflow-hidden">
        <WebGLBackground className="rounded-[20px]" />
        <div className="relative z-10">
          <h1 className="text-2xl sm:text-[32px] text-white mb-2">{t("welcomeToIbana")} <span className="text-[#F33615]">.</span></h1>
          <p className="text-[14px] text-gray-400">{t("homeSubtitle")}</p>
        </div>
      </div>

      {/* CARDS */}
      <div className="max-w-[1100px] mx-auto mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
        {[
          { label: t("employeeCard"), path: "/employee", desc: t("employeeDesc") },
          { label: t("traineeCard"),  path: "/trainee",  desc: t("traineeDesc") },
          { label: t("productsCard"), path: "/product",  desc: t("productsDesc") },
        ].map(({ label, path, desc }) => (
          <button key={path} onClick={() => router.push(path)}
            className="w-full bg-white p-5 rounded-[15px] border border-gray-200 text-center transition hover:-translate-y-1 hover:shadow-lg">
            <h3 className="text-[#F33615] mb-2 font-semibold">{label}</h3>
            <p className="text-[13px] text-gray-600">{desc}</p>
          </button>
        ))}
      </div>

      <div className="text-center mt-10 text-[12px] text-gray-500">{t("copyright")}</div>
    </div>
  );
}
