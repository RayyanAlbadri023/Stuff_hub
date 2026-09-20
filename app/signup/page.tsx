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
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen flex justify-center items-center p-5 bg-white">
      <div className={`absolute top-4 ${isRTL ? "left-4" : "right-4"}`}><LangToggle /></div>
      {loading && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white px-6 py-4 rounded-xl shadow-lg text-sm">{t("signingUp")}</div>
        </div>
      )}
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#030405] mb-4 overflow-hidden">
            <img src="/ibana.png" className="h-full w-full object-cover" alt="logo" />
          </div>
          <h1 className="text-xl font-semibold text-black tracking-tight">{t("createAccount")}</h1>
          <p className="text-black/40 text-sm mt-1">{t("signupSubtitle")}</p>
        </div>

        <div className="border border-black/10 rounded-2xl p-6">
          {serverError && (
            <div className="bg-black/[0.03] border border-black/10 rounded-lg px-4 py-3 text-sm text-black/60 mb-4">{serverError}</div>
          )}
          <div className="flex flex-col gap-3">
            <input placeholder={t("firstName")} value={fname} onChange={(e) => setFname(e.target.value)} className="p-3 rounded-lg border border-black/10 text-black outline-none focus:border-[#F33615]/50 focus:ring-2 focus:ring-[#F33615]/10 transition" />
            {errors.fname && <p className="text-red-500 text-xs">{t("fnameError")}</p>}
            <input placeholder={t("lastName")} value={lname} onChange={(e) => setLname(e.target.value)} className="p-3 rounded-lg border border-black/10 text-black outline-none focus:border-[#F33615]/50 focus:ring-2 focus:ring-[#F33615]/10 transition" />
            {errors.lname && <p className="text-red-500 text-xs">{t("lnameError")}</p>}
            <div className="flex gap-2">
              <select value={code} onChange={(e) => setCode(e.target.value)} className="w-[40%] p-3 rounded-lg border border-black/10 text-black outline-none focus:border-[#F33615]/50">
                <option>+968 (OM)</option><option>+966 (SA)</option><option>+971 (UAE)</option><option>+965 (KW)</option><option>+974 (QA)</option>
              </select>
              <input placeholder={t("phone")} value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full p-3 rounded-lg border border-black/10 text-black outline-none focus:border-[#F33615]/50 focus:ring-2 focus:ring-[#F33615]/10 transition" />
            </div>
            {errors.phone && <p className="text-red-500 text-xs">{t("phoneError")}</p>}
            <input placeholder={t("emailLabel")} value={email} onChange={(e) => setEmail(e.target.value)} className="p-3 rounded-lg border border-black/10 text-black outline-none focus:border-[#F33615]/50 focus:ring-2 focus:ring-[#F33615]/10 transition" />
            {errors.email && <p className="text-red-500 text-xs">{t("emailError")}</p>}
            <input type="password" placeholder={t("passwordLabel")} value={pass} onChange={(e) => setPass(e.target.value)} className="p-3 rounded-lg border border-black/10 text-black outline-none focus:border-[#F33615]/50 focus:ring-2 focus:ring-[#F33615]/10 transition" />
            {errors.pass && <p className="text-red-500 text-xs">{t("passError")}</p>}
            <input type="password" placeholder={t("confirmPassword")} value={confirm} onChange={(e) => setConfirm(e.target.value)} className="p-3 rounded-lg border border-black/10 text-black outline-none focus:border-[#F33615]/50 focus:ring-2 focus:ring-[#F33615]/10 transition" />
            {errors.confirm && <p className="text-red-500 text-xs">{t("confirmError")}</p>}
          </div>
          <button onClick={validateSignup} disabled={loading} className="w-full mt-4 py-3 rounded-full text-white font-semibold bg-[#030405] hover:bg-[#F33615] transition-colors disabled:opacity-50">
            {loading ? t("signingUp") : t("signupBtn")}
          </button>
        </div>

        <div className="mt-5 text-center text-[11px] text-black/50">
          {t("alreadyAccount")}{" "}<a href="/login" className="text-[#F33615] font-semibold">{t("loginLink")}</a>
        </div>
      </div>
    </div>
  );
}
