import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

const TABS = ["Overview", "Insights", "Preventive", "Reactive", "Remote", "CSAT", "Invoicing"];

const KPI_META = {
  MTTR:                 { label: "Mean Time To Repair", unit: "hrs",  icon: "🔧", color: "#DC2626" },
  UPTIME:               { label: "System Uptime",       unit: "%",    icon: "⚡", color: "#16A34A" },
  PM_COMPLETION:        { label: "PM Completion",       unit: "%",    icon: "✅", color: "#1D6FA4" },
  REACTIVE_MAINTENANCE: { label: "Reactive Compliance", unit: "%",    icon: "⚙️", color: "#F97316" },
  CSAT:                 { label: "CSAT",                unit: "",     icon: "⭐", color: "#D97706" },
  SYSTEM_AVAILABILITY:  { label: "Remote Compliance",   unit: "%",    icon: "🛰️", color: "#0891B2" },
  COMPLIANCE:           { label: "SLA Compliance",      unit: "%",    icon: "📋", color: "#059669" },
  INVOICE_CYCLE:        { label: "Invoice Cycle",       unit: "days", icon: "💰", color: "#7C3AED" },
};

function decodeSnapshot(d) {
  try {
    const padded = d + "=".repeat((-d.length) % 4);
    const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function KpiCard({ code, value, meta }) {
  const { label, unit, icon, color } = meta;
  // Simulated MOM/YoY/Target deltas for display
  const momChange = (((value || 0) * 0.012) * (code === "MTTR" || code === "INVOICE_CYCLE" ? -1 : 1)).toFixed(1);
  const yoyChange = (((value || 0) * 0.038) * (code === "MTTR" || code === "INVOICE_CYCLE" ? -1 : 1)).toFixed(1);
  const isPositiveMom = parseFloat(momChange) >= 0;
  const isPositiveYoy = parseFloat(yoyChange) >= 0;
  const isGoodPositive = code !== "MTTR" && code !== "INVOICE_CYCLE";

  return (
    <div className="rv-kpi-card">
      <div className="rv-kpi-icon" style={{ color }}>{icon}</div>
      <div className="rv-kpi-label">{label}</div>
      <div className="rv-kpi-value" style={{ color }}>
        {value ?? "--"}
        {unit && <span className="rv-kpi-unit"> {unit}</span>}
      </div>
      <div className="rv-kpi-meta-row">
        <span className="rv-kpi-meta-key">MOM</span>
        <span className={`rv-kpi-change ${isGoodPositive ? (isPositiveMom ? "up" : "down") : (isPositiveMom ? "down" : "up")}`}>
          {isPositiveMom ? "↗" : "↘"}{Math.abs(momChange)}
        </span>
      </div>
      <div className="rv-kpi-meta-row">
        <span className="rv-kpi-meta-key">YoY</span>
        <span className={`rv-kpi-change ${isGoodPositive ? (isPositiveYoy ? "up" : "down") : (isPositiveYoy ? "down" : "up")}`}>
          {isPositiveYoy ? "↗" : "↘"}{Math.abs(yoyChange)}
        </span>
      </div>
      <div className="rv-kpi-meta-row">
        <span className="rv-kpi-meta-key">Target</span>
        <span className="rv-kpi-target">On track</span>
      </div>
      <button className="rv-view-details">View Details →</button>
    </div>
  );
}

function SimpleBarChart({ rows, keys, colors }) {
  if (!rows || rows.length === 0) return <div className="rv-no-data">No data available</div>;
  const sites = rows.map(r => r.site || "").filter(Boolean);
  const allVals = rows.flatMap(r => keys.map(k => Number(r[k] || 0)));
  const maxVal = Math.max(...allVals, 1);
  const barW = Math.max(6, Math.floor(560 / (sites.length * (keys.length + 0.5))));

  return (
    <svg viewBox={`0 0 600 220`} style={{ width: "100%", height: "auto" }}>
      {rows.map((row, i) => {
        const gx = 40 + i * (keys.length * barW + 10);
        return (
          <g key={row.site}>
            {keys.map((k, j) => {
              const val = Number(row[k] || 0);
              const bh = (val / maxVal) * 160;
              const bx = gx + j * barW;
              const by = 180 - bh;
              return (
                <rect key={k} x={bx} y={by} width={Math.max(1, barW - 1)} height={bh}
                  fill={colors[j] || "#1D6FA4"} rx="2" opacity="0.85">
                  <title>{row.site} {k}: {val}</title>
                </rect>
              );
            })}
            <text x={gx + (keys.length * barW) / 2} y={198} textAnchor="middle"
              fontSize="9" fill="#9CA3AF">{String(row.site || "").slice(0, 8)}</text>
          </g>
        );
      })}
      {[0, 25, 50, 75, 100].map(v => {
        const y = 180 - (v / maxVal) * 160;
        return <g key={v}><line x1="35" y1={y} x2="595" y2={y} stroke="#F3F4F6" /><text x="30" y={y + 3} textAnchor="end" fontSize="8" fill="#D1D5DB">{v}</text></g>;
      })}
    </svg>
  );
}

function SimpleLineChart({ rows, keys, colors }) {
  if (!rows || rows.length === 0) return <div className="rv-no-data">No data available</div>;
  const allVals = rows.flatMap(r => keys.map(k => Number(r[k] || 0)));
  const maxVal = Math.max(...allVals, 1);
  const stepX = rows.length > 1 ? 520 / (rows.length - 1) : 0;

  return (
    <svg viewBox="0 0 600 220" style={{ width: "100%", height: "auto" }}>
      {keys.map((k, ki) => {
        const pts = rows.map((r, i) => {
          const x = 40 + i * stepX;
          const y = 20 + (1 - Number(r[k] || 0) / maxVal) * 160;
          return [x, y, r];
        });
        const polyline = pts.map(([x, y]) => `${x},${y}`).join(" ");
        return (
          <g key={k}>
            <polyline points={polyline} fill="none" stroke={colors[ki] || "#1D6FA4"} strokeWidth="2" opacity="0.9" />
            {pts.map(([x, y, r], i) => (
              <circle key={i} cx={x} cy={y} r="3.5" fill={colors[ki] || "#1D6FA4"}>
                <title>{r.site} {k}: {r[k]}</title>
              </circle>
            ))}
          </g>
        );
      })}
      {rows.map((r, i) => (
        <text key={i} x={40 + i * stepX} y={198} textAnchor="middle" fontSize="9" fill="#9CA3AF">
          {String(r.site || "").slice(0, 8)}
        </text>
      ))}
    </svg>
  );
}

export default function ReportView() {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("Overview");
  const [chartMode, setChartMode] = useState("Line");
  const [isEditMode, setIsEditMode] = useState(false);
  const [editModeBannerVisible, setEditModeBannerVisible] = useState(true);

  const d = searchParams.get("d") || "";
  const editParam = searchParams.get("edit") === "true";

  useEffect(() => { setIsEditMode(editParam); }, [editParam]);

  const snapshot = useMemo(() => decodeSnapshot(d), [d]);

  if (!d || !snapshot) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#F0F2F5" }}>
        <div style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
          <h2 style={{ fontFamily: "sans-serif", color: "#CC0000", marginBottom: 8 }}>Report not found</h2>
          <p style={{ color: "#6B7280", fontFamily: "sans-serif" }}>This report link is invalid or has expired. Please generate a new one.</p>
        </div>
      </div>
    );
  }

  const { customerName, contractId, reportType, kpiSummary = {}, chartRows = [], complianceMixRows = [], generatedAt = "" } = snapshot;
  const reportTitle = reportType ? reportType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "Service Performance Summary";
  const kpiKeys = ["PM_COMPLETION", "REACTIVE_MAINTENANCE", "SYSTEM_AVAILABILITY", "CSAT"];
  const chartColors = ["#1D6FA4", "#CC0000", "#0891B2", "#D97706"];

  const handlePreviewAsCustomer = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("edit");
    window.location.href = url.toString();
  };

  const handleSaveChanges = () => {
    alert("Changes saved successfully!");
  };

  return (
    <div className="rv-root" style={{ borderWidth: isEditMode ? 4 : 0 }}>

      {/* ── EDITING MODE BANNER ─────────────────────────────────── */}
      {isEditMode && editModeBannerVisible && (
        <div className="rv-edit-banner">
          <span>✏️ EDITING MODE — Customers see the saved version. Hidden elements and label changes take effect after clicking Save Changes.</span>
          <div className="rv-edit-banner-actions">
            <button className="rv-edit-btn-outline" onClick={handlePreviewAsCustomer}>
              👁 Preview as Customer
            </button>
            <button className="rv-edit-btn-save" onClick={handleSaveChanges}>
              Save Changes
            </button>
            <button className="rv-edit-btn-done" onClick={() => window.history.back()}>
              Done
            </button>
          </div>
        </div>
      )}

      {/* ── HEADER ──────────────────────────────────────────────── */}
      <header className="rv-header">
        <div className="rv-header-inner">
          <div>
            <div className="rv-title-row">
              <h1 className="rv-title">{reportTitle}</h1>
              <button className="rv-icon-btn" title="Share" onClick={() => { navigator.clipboard.writeText(window.location.href); alert("Link copied!"); }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              </button>
            </div>
            <div className="rv-subtitle-row">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>
              <span>Service Contract</span>
              <strong>{contractId || "Premier Service"}</strong>
              <span className="rv-sla-badge">Gold</span>
              <span className="rv-dot">·</span>
              <span>{customerName || "Customer"}</span>
            </div>
          </div>
          <div className="rv-header-actions">
            <button className="rv-btn-ask-ai">💬 Ask AI</button>
            <button className="rv-btn-export">↓ Export</button>
          </div>
        </div>
      </header>

      {/* ── TABS ────────────────────────────────────────────────── */}
      <div className="rv-tabs">
        <div className="rv-tabs-inner">
          {TABS.map(tab => (
            <button
              key={tab}
              className={`rv-tab ${activeTab === tab ? "rv-tab-active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ── DATE RANGE BAR ──────────────────────────────────────── */}
      <div className="rv-date-bar">
        <div className="rv-date-bar-inner">
          <span className="rv-date-pill">📅 Rolling 13 months</span>
          <select className="rv-select"><option>Monthly</option><option>Weekly</option><option>Quarterly</option></select>
          <select className="rv-select"><option>YoY</option><option>MoM</option></select>
        </div>
      </div>

      {/* ── MAIN CONTENT ────────────────────────────────────────── */}
      <div className="rv-content">

        {activeTab === "Overview" && (
          <>
            {/* Edit mode toolbar */}
            {isEditMode && (
              <div className="rv-edit-toolbar">
                <span className="rv-edit-toolbar-label">✏️ Edit Mode</span>
                <span className="rv-edit-toolbar-hint">— changes are visible to the customer after saving</span>
                <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                  <button className="rv-edit-btn-outline" onClick={handlePreviewAsCustomer}>👁 Preview as Customer</button>
                  <button className="rv-edit-btn-save" onClick={handleSaveChanges}>Save Changes</button>
                  <button className="rv-edit-btn-done" onClick={() => window.history.back()}>Done</button>
                </div>
              </div>
            )}

            {/* KPI Cards */}
            <div className="rv-kpi-grid">
              {Object.entries(kpiSummary)
                .filter(([code]) => KPI_META[code] && kpiSummary[code] !== null && kpiSummary[code] !== undefined)
                .map(([code, value]) => (
                  <KpiCard key={code} code={code} value={value} meta={KPI_META[code]} />
                ))
              }
            </div>

            {/* Service Health Trend Chart */}
            <div className="rv-chart-section">
              <div className="rv-chart-header">
                <div>
                  <div className="rv-chart-title">Service Health Trend</div>
                  <div className="rv-chart-sub">Rolling 13 months</div>
                </div>
                <div className="rv-chart-toggle">
                  {["Line", "Bar", "Table"].map(m => (
                    <button key={m} className={`rv-toggle-btn ${chartMode === m ? "rv-toggle-active" : ""}`} onClick={() => setChartMode(m)}>{m}</button>
                  ))}
                </div>
              </div>

              {chartMode === "Line" && (
                <SimpleLineChart rows={chartRows} keys={kpiKeys} colors={chartColors} />
              )}
              {chartMode === "Bar" && (
                <SimpleBarChart rows={chartRows} keys={kpiKeys} colors={chartColors} />
              )}
              {chartMode === "Table" && (
                <div className="rv-table-wrap">
                  <table className="rv-table">
                    <thead>
                      <tr>
                        <th>Site</th>
                        {kpiKeys.map(k => <th key={k}>{KPI_META[k]?.label || k}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {chartRows.map((row, i) => (
                        <tr key={i}>
                          <td><strong>{row.site}</strong></td>
                          {kpiKeys.map(k => <td key={k}>{row[k] ?? "—"}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="rv-chart-legend">
                {kpiKeys.map((k, i) => (
                  <span key={k} className="rv-legend-item">
                    <span className="rv-legend-dot" style={{ background: chartColors[i] }} />
                    {KPI_META[k]?.label || k}
                  </span>
                ))}
              </div>
            </div>

            {/* At-Risk Assets panel */}
            {isEditMode && (
              <div className="rv-asset-section">
                <div className="rv-asset-header">
                  <span className="rv-edit-hint">✏️ Editing asset rows — hover a row and click the eye icon to hide/show it</span>
                </div>
                {[
                  { name: "Chiller #2", type: "HVAC", tier: "Tier 1", risk: 86, note: "Plan replacement study" },
                  { name: "VAV Loop A17", type: "Controls", tier: "Tier 2", risk: 72, note: "Sporadic flow oscillation, hunting — recalibrate actuator" },
                  { name: "Boiler #1", type: "Mechanical", tier: "Tier 1", risk: 73, note: "Bearing wear monitor — schedule inspection" },
                  { name: "AHU-3", type: "HVAC", tier: "Tier 2", risk: 66, note: "Efficiency tuning — coil cleaning recommended" },
                ].map((a, i) => (
                  <div key={i} className="rv-asset-row">
                    <span className="rv-asset-icon">❄️</span>
                    <strong>{a.name}</strong>
                    <span className="rv-asset-type">{a.type}</span>
                    <span className="rv-asset-tier">{a.tier}</span>
                    <span className="rv-asset-risk">Risk: {a.risk}</span>
                    <span className="rv-asset-note">{a.note}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab !== "Overview" && (
          <div className="rv-tab-placeholder">
            <p><strong>{activeTab}</strong> — data will be available in the next iteration.</p>
          </div>
        )}
      </div>

      {/* ── FOOTER ──────────────────────────────────────────────── */}
      <footer className="rv-footer">
        <span>Generated: {generatedAt ? generatedAt.slice(0, 10) : "—"}</span>
        <span>·</span>
        <span>© 2026 Honeywell International Inc.</span>
        <span>·</span>
        <span>World Class Customer Reports</span>
      </footer>
    </div>
  );
}
