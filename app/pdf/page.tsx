"use client";

import { jsPDF } from "jspdf";

export default function Page() {
  const downloadPDF = () => {
    const doc = new jsPDF();

    doc.text("Hello from Next.js", 10, 10);

    doc.save("file.pdf");
  };

  return (
    <div className="h-screen flex items-center justify-center">
      <button
        onClick={downloadPDF}
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        Download PDF
      </button>
    </div>
  );
}