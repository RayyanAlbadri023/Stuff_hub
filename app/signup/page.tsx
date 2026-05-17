"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/app/context/LangContext";
import LangToggle from "@/app/components/LangToggle";

export default function SignupPage() {
  const router = useRouter();
  const { t, isRTL } = useLang();

  const [fname, setFname] = useState("");
  const [lname, setLname] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("+968 (OM)");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ fname?: boolean; lname?: boolean; phone?: boolean; email?: boolean; pass?: boolean; confirm?: boolean; }>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  const validateSignup = async () => {
    const newErrors: typeof errors = {};
    const namePattern = /^[A-Za-z]+$/;
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const omanPattern = /^[79]\d{7}$/;
    if (!fname || !namePattern.test(fname)) newErrors.fname = true;
    if (!lname || !namePattern.test(lname)) newErrors.lname = true;
    const phoneValid = code.includes("+968") ? omanPattern.test(phone) : /^[0-9]{6,15}$/.test(phone);
    if (!phone || !phoneValid) newErrors.phone = true;
    if (!email || !emailPattern.test(email)) newErrors.email = true;
    if (!pass) newErrors.pass = true;
    if (!confirm || pass !== confirm) newErrors.confirm = true;
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    try {
      setLoading(true); setServerError("");
      const res = await fetch("/api/login/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ firstName: fname, lastName: lname, phone: code + " " + phone, email, password: pass }) });
      const text = await res.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch { throw new Error("Server response is not JSON"); }
      if (!res.ok) { const msg = (data as { message?: string })?.message; throw new Error(msg || "Signup failed"); }
      router.push("/login");
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : "Server error");
    } finally { setLoading(false); }
  };

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen flex justify-center items-center p-5 bg-gradient-to-br from-[#F5F7FF] to-[#ce908b]">
      <div className={`absolute top-4 ${isRTL ? "left-4" : "right-4"}`}><LangToggle /></div>
      {loading && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white px-6 py-4 rounded-xl shadow-lg text-sm">{t("signingUp")}</div>
        </div>
      )}
      <div className="relative w-full max-w-[420px] flex flex-col items-center text-center pt-[70px] px-[25px] pb-[30px] rounded-[22px] bg-white/60 backdrop-blur-xl border border-[rgba(236,81,14,0.15)] shadow-[0_20px_45px_rgba(236,81,14,0.12)]">
        <img src="/ibana.png" className="absolute -top-[35px] left-1/2 -translate-x-1/2 w-[90px] h-[90px] rounded-full object-cover bg-white p-[6px] shadow-[0_10px_25px_rgba(236,81,14,0.25)]" />
        <h1 className="text-[24px] mt-5 mb-1 text-[#ec510e]">{t("createAccount")}</h1>
        <p className="text-[13px] text-gray-600 mb-5">{t("signupSubtitle")}</p>
        {serverError && <p className="text-red-500 text-xs mb-2">{serverError}</p>}
        <div className="w-full bg-white rounded-[12px] p-[15px] border border-[rgba(236,81,14,0.15)] flex flex-col gap-[10px]">
          <input placeholder={t("firstName")} value={fname} onChange={(e) => setFname(e.target.value)} className="bg-[#F9FAFF] p-2 rounded border border-gray-200 text-gray-800 outline-none" />
          {errors.fname && <p className="text-red-500 text-xs">{t("fnameError")}</p>}
          <input placeholder={t("lastName")} value={lname} onChange={(e) => setLname(e.target.value)} className="bg-[#F9FAFF] p-2 rounded border border-gray-200 text-gray-800 outline-none" />
          {errors.lname && <p className="text-red-500 text-xs">{t("lnameError")}</p>}
          <div className="flex gap-2">
            <select value={code} onChange={(e) => setCode(e.target.value)} className="w-[40%] bg-[#F9FAFF] p-2 rounded border border-gray-200 text-gray-800 outline-none">
              <option>+968 (OM)</option><option>+966 (SA)</option><option>+971 (UAE)</option><option>+965 (KW)</option><option>+974 (QA)</option>
            </select>
            <input placeholder={t("phone")} value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-[#F9FAFF] p-2 rounded border border-gray-200 text-gray-800 outline-none" />
          </div>
          {errors.phone && <p className="text-red-500 text-xs">{t("phoneError")}</p>}
          <input placeholder={t("emailLabel")} value={email} onChange={(e) => setEmail(e.target.value)} className="bg-[#F9FAFF] p-2 rounded border border-gray-200 text-gray-800 outline-none" />
          {errors.email && <p className="text-red-500 text-xs">{t("emailError")}</p>}
          <input type="password" placeholder={t("passwordLabel")} value={pass} onChange={(e) => setPass(e.target.value)} className="bg-[#F9FAFF] p-2 rounded border border-gray-200 text-gray-800 outline-none" />
          {errors.pass && <p className="text-red-500 text-xs">{t("passError")}</p>}
          <input type="password" placeholder={t("confirmPassword")} value={confirm} onChange={(e) => setConfirm(e.target.value)} className="bg-[#F9FAFF] p-2 rounded border border-gray-200 text-gray-800 outline-none" />
          {errors.confirm && <p className="text-red-500 text-xs">{t("confirmError")}</p>}
        </div>
        <button onClick={validateSignup} disabled={loading} className="w-full mt-3 py-3 rounded-full text-white font-semibold bg-gradient-to-r from-[#ec510e] to-[#ecbcaf]">
          {loading ? t("signingUp") : t("signupBtn")}
        </button>
        <div className="mt-3 text-[11px] text-gray-600">
          {t("alreadyAccount")}{" "}<a href="/login" className="text-[#ec510e] font-semibold">{t("loginLink")}</a>
        </div>
      </div>
    </div>
  );
}
