"use client";

export default function ProductPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F7FF] via-[#f3e8ff] to-[#ce908b] flex items-center justify-center p-6">

      <div className="text-center bg-white/70 backdrop-blur-xl border shadow-lg rounded-2xl p-10 w-full max-w-md">

        <h1 className="text-2xl font-bold text-[#ec510e] mb-2">
          🛍️ Products Page
        </h1>

        <p className="text-gray-600 text-sm">
          No products available yet
        </p>

      </div>

    </div>
  );
}