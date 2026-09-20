"use client";

import { useLang } from "@/app/context/LangContext";

export default function LangToggle({ className = "", dark = false }: { className?: string; dark?: boolean }) {
  const { lang, toggleLang } = useLang();

  return (
    <button
      onClick={toggleLang}
      title="Toggle language"
      className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-semibold
                  transition-all duration-200 ${dark
                    ? "bg-white/10 border border-white/20 text-white hover:bg-[#F33615] hover:border-[#F33615]"
                    : "bg-white/70 border border-[#F33615]/30 text-[#F33615] hover:bg-[#F33615] hover:text-white"} ${className}`}
    >
      <span className="text-base"></span>
      <span>{lang === "en" ? "العربية" : "English"}</span>
    </button>
  );
}
