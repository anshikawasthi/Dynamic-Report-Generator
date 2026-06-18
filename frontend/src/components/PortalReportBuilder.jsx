import { useState } from "react";

const INITIAL_FORM = {
  customerName: "",
  contractId: "",
  customerEmail: "",
  reportType: "service_performance",
};

function toEditUrl(reportUrl) {
  const separator = reportUrl.includes("?") ? "&" : "?";
  return `${reportUrl}${separator}edit=true`;
}

function PortalReportBuilder({ onCreateReport }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await onCreateReport(form);
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.reportUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="portal-page">
      <header className="portal-header">
        <div className="portal-header-inner">
          <img src="/honeywell-logo.svg" alt="Honeywell" className="portal-logo" />
          <div className="portal-divider" />
          <div>
            <h1 className="portal-title">Customer Field Service Portal</h1>
            <p className="portal-subtitle">Generate a report link to send to your customer</p>
          </div>
        </div>
      </header>

      <main className="portal-main">
        <div className="portal-shell">
          <div className="portal-card">
            <h2 className="portal-card-title">Create Report Request</h2>
            <p className="portal-card-subtitle">
              Fill in the customer details. A unique report link will be generated for you to share.
            </p>

            <form onSubmit={handleSubmit} className="portal-form">
              <div className="portal-grid-2">
                <div>
                  <label className="portal-label">
                    Customer Name <span className="portal-required">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.customerName}
                    onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                    placeholder="Smechua Corp"
                    className="portal-input"
                  />
                </div>
                <div>
                  <label className="portal-label">
                    Contract ID <span className="portal-required">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.contractId}
                    onChange={(e) => setForm({ ...form, contractId: e.target.value })}
                    placeholder="CON-2025-0042"
                    className="portal-input"
                  />
                </div>
              </div>

              <div>
                <label className="portal-label">
                  Customer Email <span className="portal-required">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={form.customerEmail}
                  onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
                  placeholder="contact@smechua.com"
                  className="portal-input"
                />
              </div>

              <div>
                <label className="portal-label">Report Type</label>
                <select
                  value={form.reportType}
                  onChange={(e) => setForm({ ...form, reportType: e.target.value })}
                  className="portal-input"
                >
                  <option value="service_performance">Service Performance Summary</option>
                  <option value="compliance">Compliance Report</option>
                  <option value="assets">Asset Health Report</option>
                </select>
              </div>

              {error && <div className="portal-error">{error}</div>}

              <button type="submit" disabled={loading} className="portal-submit">
                {loading ? "Generating..." : "Generate Report Link"}
              </button>
            </form>
          </div>

          {result && (
            <div className="portal-result">
              <div className="portal-result-title">Report link generated!</div>
              <p className="portal-result-text">
                Share this link with <strong>{result.customerName}</strong> (Contract:
                <code className="portal-contract-code">{result.contractId}</code>).
              </p>

              <div className="portal-result-row">
                <input readOnly value={result.reportUrl} className="portal-url" />
                <button type="button" onClick={handleCopy} className="portal-btn-ghost">
                  {copied ? "Copied" : "Copy"}
                </button>
                <a href={toEditUrl(result.reportUrl)} target="_blank" rel="noreferrer" className="portal-btn-edit">
                  Edit
                </a>
                <a href={result.reportUrl} target="_blank" rel="noreferrer" className="portal-btn-preview">
                  Preview
                </a>
              </div>

              <button
                type="button"
                onClick={() => {
                  setResult(null);
                  setForm(INITIAL_FORM);
                }}
                className="portal-reset"
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

export default PortalReportBuilder;
