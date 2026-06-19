"use client";

import { useState } from "react";
import type { UniversalContract } from "@/lib/types";
import { Download, FileText, ImageIcon, Loader2, Table2 } from "lucide-react";

interface Props {
  contract: UniversalContract;
}

export default function ExportButtons({ contract }: Props) {
  const [exporting, setExporting] = useState<"pdf" | "csv" | null>(null);
  const [open, setOpen] = useState(false);

  const handleCSV = () => {
    setExporting("csv");
    const headers = Object.keys(contract.schema);
    const labels = headers.map((k) => contract.schema[k]?.label ?? k);
    const rows = contract.data.map((row) => headers.map((k) => row[k] ?? "").join(","));
    const csv = [labels.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${contract.meta.reportId}-data.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(null);
    setOpen(false);
  };

  const handlePDF = async () => {
    setExporting("pdf");
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import("jspdf"),
        import("html2canvas"),
      ]);
      const el = document.getElementById("dashboard-capture");
      if (!el) throw new Error("Dashboard element not found");
      const canvas = await html2canvas(el, { scale: 1.5, useCORS: true });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [canvas.width / 1.5, canvas.height / 1.5] });
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width / 1.5, canvas.height / 1.5);
      pdf.save(`${contract.meta.reportId}-report.pdf`);
    } catch (e) {
      console.error("PDF export failed:", e);
    } finally {
      setExporting(null);
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
      >
        <Download className="w-4 h-4" />
        Export
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[160px]">
            <button
              onClick={handleCSV}
              disabled={!!exporting}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {exporting === "csv" ? (
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              ) : (
                <Table2 className="w-4 h-4 text-gray-400" />
              )}
              Download CSV
            </button>
            <button
              onClick={handlePDF}
              disabled={!!exporting}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {exporting === "pdf" ? (
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              ) : (
                <FileText className="w-4 h-4 text-gray-400" />
              )}
              Download PDF
            </button>
          </div>
        </>
      )}
    </div>
  );
}
