"use client";

import { useLang } from "@/app/context/LangContext";

export default function LangToggle({ className = "" }: { className?: string }) {
  const { lang, toggleLang } = useLang();

  return (
    <button
      onClick={toggleLang}
      title="Toggle language"
      className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-semibold
                  bg-white/70 border border-[#ec510e]/30 text-[#ec510e]
                  hover:bg-[#ec510e] hover:text-white transition-all duration-200 ${className}`}
    >
      <span className="text-base"></span>
      <span>{lang === "en" ? "العربية" : "English"}</span>
    </button>
  );
}
