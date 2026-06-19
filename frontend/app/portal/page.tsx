"use client";

import { useState } from "react";
import { createReport } from "@/lib/api";
import type { CreateReportResponse } from "@/lib/types";
import { CheckCircle, Copy, ExternalLink, Loader2, Pencil } from "lucide-react";

export default function PortalPage() {
  const [form, setForm] = useState({
    customerName: "",
    contractId: "",
    customerEmail: "",
    reportType: "service_performance" as const,
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CreateReportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await createReport(form);
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.reportUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <img
            src="/honeywell-logo.svg"
            alt="Honeywell"
            className="h-14 w-auto"
          />
          <div className="w-px h-7 bg-gray-200" />
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Customer Field Service Portal</h1>
            <p className="text-xs text-gray-500">Generate a report link to send to your customer</p>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-12">
        <div className="w-full max-w-2xl space-y-6">
          {/* Form Card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-1">Create Report Request</h2>
            <p className="text-sm text-gray-500 mb-6">
              Fill in the customer details. A unique report link will be generated for you to share.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Customer Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.customerName}
                    onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                    placeholder="Smechua Corp"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Contract ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.contractId}
                    onChange={(e) => setForm({ ...form, contractId: e.target.value })}
                    placeholder="CON-2025-0042"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Customer Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={form.customerEmail}
                  onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
                  placeholder="contact@smechua.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Report Type
                </label>
                <select
                  value={form.reportType}
                  onChange={(e) =>
                    setForm({ ...form, reportType: e.target.value as typeof form.reportType })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition bg-white"
                >
                  <option value="service_performance">Service Performance Summary</option>
                  <option value="compliance">Compliance Report</option>
                  <option value="assets">Asset Health Report</option>
                </select>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-[#d22630] hover:bg-[#b81e29] disabled:opacity-60 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating…
                  </>
                ) : (
                  "Generate Report Link"
                )}
              </button>
            </form>
          </div>

          {/* Result Card */}
          {result && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="w-5 h-5" />
                <span className="font-semibold">Report link generated!</span>
              </div>
              <p className="text-sm text-gray-600">
                Share this link with <strong>{result.customerName}</strong> (Contract:{" "}
                <code className="bg-white px-1.5 py-0.5 rounded text-xs border border-gray-200">
                  {result.contractId}
                </code>
                ).
              </p>

              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={result.reportUrl}
                  className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono text-gray-700 focus:outline-none"
                />
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-gray-500" />
                      Copy
                    </>
                  )}
                </button>
                <a
                  href={`${result.reportUrl}?edit=true`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                  Edit
                </a>
                <a
                  href={result.reportUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 bg-[#d22630] text-white rounded-lg text-sm font-medium hover:bg-[#b81e29] transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Preview
                </a>
              </div>

              <button
                onClick={() => {
                  setResult(null);
                  setForm({ customerName: "", contractId: "", customerEmail: "", reportType: "service_performance" });
                }}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Create another report
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
