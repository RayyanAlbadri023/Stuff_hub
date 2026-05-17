"use client";

import { useAuth } from "@/app/hooks/useAuth";

export default function TrainingDashboard() {
  // ✅ Auth guard via hook — no useEffect required
  const { loading } = useAuth();

  if (loading) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F7FF] via-[#f3e8ff] to-[#ce908b] flex items-center justify-center p-6">
      <div className="text-center bg-white/70 backdrop-blur-xl border shadow-lg rounded-2xl p-10 w-full max-w-md">
        <h1 className="text-2xl font-bold text-[#ec510e] mb-4">📄 Drop Your CV</h1>
        <p className="text-gray-600 text-sm mb-6">Drag & Drop your file here</p>
        <div className="border-2 border-dashed border-[#ec510e] rounded-2xl p-12 bg-white/50 hover:bg-white transition cursor-pointer">
          <p className="text-gray-500">Drop your CV file here</p>
        </div>
      </div>
    </div>
  );
}
