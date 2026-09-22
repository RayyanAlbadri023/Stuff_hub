"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/hooks/useAuth";
import { useRequest } from "@/app/hooks/useRequest";
import { useLang } from "@/app/context/LangContext";
import LangToggle from "@/app/components/LangToggle";

interface ContractData {
  contractType?: string;
  contractStart?: string;
  contractEnd?: string;
  contractFile?: string;
  contractFileName?: string;
  joinDate?: string;
}

export default function ContractPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { execute } = useRequest();
  const { t, isRTL } = useLang();

  const [contract, setContract] = useState<ContractData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !user?.id) return;
    let cancelled = false;

    async function load() {
      setDataLoading(true);
      const res = await execute(`/api/users/${user!.id}`);
      if (cancelled) return;
      if (res && typeof res === "object") {
        setContract(res as ContractData);
      }
      setDataLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [authLoading, user?.id, execute]);

  if (authLoading) return null;

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-white flex justify-center p-4">
      <div className="w-full max-w-2xl flex flex-col gap-6">
        {/* HEADER */}
        <div className="bg-[#030405] border border-[#030405] shadow-sm rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
          <button onClick={() => router.push("/employee")} className="px-3 sm:px-4 py-2 text-sm text-white rounded-full bg-gradient-to-r from-[#F33615] to-[#ff6b4a]">
            {t("homeBtn")}
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-white order-last sm:order-none w-full sm:w-auto text-center">📄 {t("myContractTitle")}</h1>
          <LangToggle dark />
        </div>

        {dataLoading && <div className="text-center py-10 text-[#F33615] font-semibold text-lg animate-pulse">{t("loading")}</div>}

        {!dataLoading && (
          <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
              <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">{t("contractType")}</p>
                <p className="text-sm font-bold text-[#F33615]">
                  {contract?.contractType === "fixed" ? t("contractTypeFixed") : t("contractTypePermanent")}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">{t("contractStart")}</p>
                <p className="text-sm font-bold text-[#F33615]">{contract?.contractStart || contract?.joinDate || "—"}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">{t("contractEnd")}</p>
                <p className="text-sm font-bold text-[#F33615]">{contract?.contractEnd || "—"}</p>
              </div>
            </div>

            {contract?.contractFile ? (
              <a
                href={contract.contractFile}
                download={contract.contractFileName || "contract"}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-full text-white font-semibold bg-gradient-to-r from-[#F33615] to-[#ff6b4a]"
              >
                ⬇️ {t("downloadContract")} {contract.contractFileName ? `(${contract.contractFileName})` : ""}
              </a>
            ) : (
              <p className="text-center text-gray-500 py-4">{t("noContract")}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
