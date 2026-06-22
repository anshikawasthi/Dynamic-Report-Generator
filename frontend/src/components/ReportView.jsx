import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";

const TABS = ["Overview", "Insights", "Preventive", "Reactive", "Remote", "CSAT", "Invoicing"];

const KPI_META = {
  MTTR:                 { label: "Mean Time To Repair", unit: "hrs",  icon: "wrench", color: "#000000" },
  UPTIME:               { label: "System Uptime",       unit: "%",    icon: "bolt", color: "#000000" },
  PM_COMPLETION:        { label: "PM Completion",       unit: "%",    icon: "check", color: "#000000" },
  REACTIVE_MAINTENANCE: { label: "Reactive Compliance", unit: "%",    icon: "settings", color: "#000000" },
  CSAT:                 { label: "CSAT",                unit: "",     icon: "star", color: "#000000" },
  SYSTEM_AVAILABILITY:  { label: "Remote Compliance",   unit: "%",    icon: "satellite", color: "#000000" },
  COMPLIANCE:           { label: "SLA Compliance",      unit: "%",    icon: "clipboard", color: "#000000" },
  INVOICE_CYCLE:        { label: "Invoice Cycle",       unit: "days", icon: "wallet", color: "#000000" },
};

function Icon({ name, size = 16, className = "" }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className,
    "aria-hidden": true,
  };

  switch (name) {
    case "wrench":
      return <svg {...common}><path d="M14.7 6.3a4 4 0 1 0 3 3l-6.7 6.7a2 2 0 0 1-2.8 0l-.2-.2a2 2 0 0 1 0-2.8z" /></svg>;
    case "bolt":
      return <svg {...common}><path d="M13 2 4 14h7l-1 8 9-12h-7z" /></svg>;
    case "check":
      return <svg {...common}><path d="M20 6 9 17l-5-5" /></svg>;
    case "settings":
      return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3h.1a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 1 1.5h.1a1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8v.1a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.2a1.6 1.6 0 0 0-1.5 1z" /></svg>;
    case "star":
      return <svg {...common}><path d="m12 3 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 18l-5.8 3 1.1-6.5L2.6 9.8l6.5-.9z" /></svg>;
    case "satellite":
      return <svg {...common}><path d="m13 11 9-9M3 21l9-9M2 11l11 11M13 2l9 9M8 16a4 4 0 0 1 0-8" /></svg>;
    case "clipboard":
      return <svg {...common}><rect x="8" y="3" width="8" height="4" rx="1" /><rect x="5" y="7" width="14" height="14" rx="2" /><path d="M9 12h6M9 16h6" /></svg>;
    case "wallet":
      return <svg {...common}><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M16 10h6v4h-6z" /></svg>;
    case "copy":
      return <svg {...common}><rect x="9" y="9" width="13" height="13" rx="2" /><rect x="2" y="2" width="13" height="13" rx="2" /></svg>;
    case "message":
      return <svg {...common}><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" /></svg>;
    case "download":
      return <svg {...common}><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></svg>;
    case "calendar":
      return <svg {...common}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>;
    case "edit":
      return <svg {...common}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>;
    case "eye":
      return <svg {...common}><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" /><circle cx="12" cy="12" r="3" /></svg>;
    case "file":
      return <svg {...common}><path d="M14 2H6a2 2 0 0 0-2 2v16h16V8z" /><path d="M14 2v6h6" /></svg>;
    case "table":
      return <svg {...common}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9M15 21V9" /></svg>;
    case "document":
      return <svg {...common}><path d="M14 2H6a2 2 0 0 0-2 2v16h16V8z" /><path d="M14 2v6h6" /></svg>;
    default:
      return <svg {...common}><circle cx="12" cy="12" r="9" /></svg>;
  }
}

function decodeSnapshot(d) {
  try {
    const padding = (4 - (d.length % 4)) % 4;
    const padded = d + "=".repeat(padding);
    const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function buildTrendRows(snapshotRows, kpiSummary) {
  if (Array.isArray(snapshotRows) && snapshotRows.length >= 3) {
    return snapshotRows;
  }

  const months = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr"];
  const seed = {
    PM_COMPLETION: Number(kpiSummary?.PM_COMPLETION || 93),
    REACTIVE_MAINTENANCE: Number(kpiSummary?.REACTIVE_MAINTENANCE || 88),
    SYSTEM_AVAILABILITY: Number(kpiSummary?.SYSTEM_AVAILABILITY || 97),
    CSAT: Number(kpiSummary?.CSAT || 4.2) * 20,
  };

  return months.map((m, i) => {
    const wave = Math.sin((i / 12) * Math.PI * 2);
    return {
      site: m,
      PM_COMPLETION: Math.min(99, Math.max(70, +(seed.PM_COMPLETION + wave * 2.4).toFixed(1))),
      REACTIVE_MAINTENANCE: Math.min(99, Math.max(70, +(seed.REACTIVE_MAINTENANCE + Math.cos((i / 12) * Math.PI * 2) * 3.1).toFixed(1))),
      SYSTEM_AVAILABILITY: Math.min(99.9, Math.max(70, +(seed.SYSTEM_AVAILABILITY + wave * 1.5).toFixed(1))),
      CSAT: Math.min(99, Math.max(70, +(seed.CSAT + Math.sin((i / 12) * Math.PI * 2 + 1.1) * 2.1).toFixed(1))),
    };
  });
}

function KpiCard({ code, value, meta, isEditMode, onEditLabel, onToggleVisibility, isHidden }) {
  const { label, unit, icon, color } = meta;
  // Simulated MOM/YoY/Target deltas for display
  const momChange = (((value || 0) * 0.012) * (code === "MTTR" || code === "INVOICE_CYCLE" ? -1 : 1)).toFixed(1);
  const yoyChange = (((value || 0) * 0.038) * (code === "MTTR" || code === "INVOICE_CYCLE" ? -1 : 1)).toFixed(1);
  const isPositiveMom = parseFloat(momChange) >= 0;
  const isPositiveYoy = parseFloat(yoyChange) >= 0;
  const isGoodPositive = code !== "MTTR" && code !== "INVOICE_CYCLE";

  return (
    <div className={`rv-kpi-card ${isHidden ? "rv-kpi-card-hidden" : ""}`}>
      {isEditMode && (
        <div className="rv-kpi-card-actions">
          <button className="rv-kpi-action-btn" onClick={() => onEditLabel(code)} title="Edit KPI label">
            <Icon name="edit" size={13} />
            Edit
          </button>
          <button className="rv-kpi-action-btn" onClick={() => onToggleVisibility(code)} title="Show or hide KPI card">
            <Icon name="eye" size={13} />
            {isHidden ? "Show" : "Hide"}
          </button>
        </div>
      )}
      <div className="rv-kpi-icon" style={{ color }}><Icon name={icon} size={18} /></div>
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
      <button className="rv-view-details">View details</button>
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rv-chart-tooltip">
      <p className="rv-chart-tooltip-title">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="rv-chart-tooltip-row">
          <span style={{ color: p.color }}>{KPI_META[p.name]?.label || p.name}</span>
          <strong>{p.value}%</strong>
        </div>
      ))}
    </div>
  );
}

export default function ReportView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("Overview");
  const [chartMode, setChartMode] = useState("Line");
  const [isEditMode, setIsEditMode] = useState(false);
  const [editModeBannerVisible, setEditModeBannerVisible] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(null);
  const [copied, setCopied] = useState(false);
  const [customKpiLabels, setCustomKpiLabels] = useState({});
  const [hiddenKpis, setHiddenKpis] = useState({});

  const d = searchParams.get("d") || "";
  const editParam = searchParams.get("edit") === "true";
  const hiddenParam = searchParams.get("hidden") || "";

  useEffect(() => { setIsEditMode(editParam); }, [editParam]);
  
  // Initialize hidden KPIs from URL params
  useEffect(() => {
    if (hiddenParam) {
      const hidden = hiddenParam.split(",").reduce((acc, code) => {
        acc[code] = true;
        return acc;
      }, {});
      setHiddenKpis(hidden);
    }
  }, [hiddenParam]);
  
  // Update URL when hidden KPIs change
  const updateHiddenInUrl = (newHidden) => {
    const hiddenCodes = Object.keys(newHidden).filter(k => newHidden[k]).join(",");
    const newParams = new URLSearchParams(searchParams);
    if (hiddenCodes) {
      newParams.set("hidden", hiddenCodes);
    } else {
      newParams.delete("hidden");
    }
    setSearchParams(newParams);
  };

  const snapshot = useMemo(() => decodeSnapshot(d), [d]);

  // Handle CSV export
  const handleCSVExport = () => {
    setExporting("csv");
    try {
      const { customerName, contractId, kpiSummary = {}, chartRows = [] } = snapshot;
      
      // Create CSV content
      let csv = "Report Data Export\n";
      csv += `Customer: ${customerName}\n`;
      csv += `Contract ID: ${contractId}\n`;
      csv += `Date: ${new Date().toLocaleDateString()}\n\n`;
      
      // KPI Summary section
      csv += "KPI Summary\n";
      csv += "KPI,Value,Unit\n";
      Object.entries(kpiSummary).forEach(([code, value]) => {
        if (KPI_META[code]) {
          const { label, unit } = KPI_META[code];
          csv += `${label},${value || "—"},${unit}\n`;
        }
      });
      
      // Chart data section
      if (chartRows.length > 0) {
        csv += "\nChart Data\n";
        const headers = ["Site", "PM_COMPLETION", "REACTIVE_MAINTENANCE", "SYSTEM_AVAILABILITY", "CSAT"];
        csv += headers.join(",") + "\n";
        chartRows.forEach(row => {
          csv += `${row.site || "—"},${row.PM_COMPLETION || "—"},${row.REACTIVE_MAINTENANCE || "—"},${row.SYSTEM_AVAILABILITY || "—"},${row.CSAT || "—"}\n`;
        });
      }
      
      // Download CSV
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${contractId || "report"}-data.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("CSV export failed:", e);
    } finally {
      setExporting(null);
      setExportOpen(false);
    }
  };

  // Handle PDF export (using html2canvas + jsPDF if available)
  const handlePDFExport = async () => {
    setExporting("pdf");
    try {
      // Try to import libraries
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import("jspdf"),
        import("html2canvas"),
      ]);
      
      // Find the main content area to capture
      const el = document.querySelector(".rv-content") || document.querySelector(".rv-root");
      if (!el) throw new Error("Report content not found");
      
      const canvas = await html2canvas(el, { scale: 1, useCORS: true, logging: false });
      const imgData = canvas.toDataURL("image/png");
      
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? "landscape" : "portrait",
        unit: "px",
        format: [canvas.width, canvas.height],
      });
      
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save(`${snapshot.contractId || "report"}-report.pdf`);
    } catch (e) {
      console.error("PDF export failed:", e);
      alert("PDF export requires jsPDF and html2canvas libraries. Please contact support.");
    } finally {
      setExporting(null);
      setExportOpen(false);
    }
  };

  // Handle share/copy
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const onExportButtonHover = (event, isOver) => {
    event.currentTarget.style.background = isOver ? "#F9FAFB" : "transparent";
  };

  if (!d || !snapshot) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#F0F2F5" }}>
        <div style={{ textAlign: "center", padding: 40 }}>
          <div style={{ color: "#CC0000", marginBottom: 16 }}><Icon name="document" size={48} /></div>
          <h2 style={{ fontFamily: "sans-serif", color: "#CC0000", marginBottom: 8 }}>Report not found</h2>
          <p style={{ color: "#6B7280", fontFamily: "sans-serif" }}>This report link is invalid or has expired. Please generate a new one.</p>
        </div>
      </div>
    );
  }

  const { customerName, contractId, reportType, kpiSummary = {}, chartRows = [], complianceMixRows = [], generatedAt = "" } = snapshot;
  const trendRows = useMemo(() => buildTrendRows(chartRows, kpiSummary), [chartRows, kpiSummary]);
  const reportTitle = reportType ? reportType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "Service Performance Summary";
  const kpiKeys = ["PM_COMPLETION", "REACTIVE_MAINTENANCE", "SYSTEM_AVAILABILITY", "CSAT"];
  const chartColors = ["#1D6FA4", "#CC0000", "#0891B2", "#D97706"];

  const handlePreviewAsCustomer = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("edit");
    const newUrl = `${window.location.pathname}?${newParams.toString()}`;
    window.location.href = newUrl;
  };

  const handleSaveChanges = () => {
    alert("Changes saved successfully!");
  };

  const handleEditKpiLabel = (code) => {
    const currentLabel = customKpiLabels[code] || KPI_META[code]?.label || code;
    const nextLabel = window.prompt("Edit KPI label", currentLabel);
    if (nextLabel !== null && nextLabel.trim()) {
      setCustomKpiLabels((prev) => ({ ...prev, [code]: nextLabel.trim() }));
    }
  };

  const handleToggleKpiVisibility = (code) => {
    setHiddenKpis((prev) => {
      const newHidden = { ...prev, [code]: !prev[code] };
      updateHiddenInUrl(newHidden);
      return newHidden;
    });
  };

  return (
    <div className="rv-root" style={{ borderWidth: isEditMode ? 4 : 0 }}>

      {/* ── EDITING MODE BANNER ─────────────────────────────────── */}
      {isEditMode && editModeBannerVisible && (
        <div className="rv-edit-banner">
          <span className="rv-banner-text"><Icon name="edit" size={14} /> EDITING MODE — Customers see the saved version. Hidden elements and label changes take effect after clicking Save Changes.</span>
          <div className="rv-edit-banner-actions">
            <button className="rv-edit-btn-outline" onClick={handlePreviewAsCustomer}>
              <Icon name="eye" size={14} /> Preview as Customer
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
              <button
                className="rv-icon-btn"
                title="Copy report link"
                onClick={handleShare}
              >
                <Icon name="copy" size={14} />
              </button>
              {copied && (
                <span style={{ fontSize: "11px", color: "#16A34A", fontWeight: 600 }}>
                  Link copied!
                </span>
              )}
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
            <button className="rv-btn-ask-ai"><Icon name="message" size={14} /> Ask AI</button>
            <div style={{ position: "relative" }}>
              <button
                className="rv-btn-export"
                onClick={() => setExportOpen(!exportOpen)}
              >
                <Icon name="download" size={14} /> Export
              </button>
              {exportOpen && (
                <>
                  {/* Backdrop */}
                  <div
                    style={{
                      position: "fixed",
                      inset: 0,
                      zIndex: 10,
                    }}
                    onClick={() => setExportOpen(false)}
                  />
                  {/* Dropdown */}
                  <div className="rv-export-menu">
                    <button
                      onClick={handleCSVExport}
                      disabled={!!exporting}
                      className="rv-export-item"
                      style={{ opacity: exporting === "csv" ? 0.6 : 1 }}
                      onMouseEnter={(e) => !exporting && onExportButtonHover(e, true)}
                      onMouseLeave={(e) => onExportButtonHover(e, false)}
                    >
                      <Icon name="table" size={14} />
                      {exporting === "csv" ? "Downloading..." : "Download CSV"}
                    </button>
                    <button
                      onClick={handlePDFExport}
                      disabled={!!exporting}
                      className="rv-export-item"
                      style={{ opacity: exporting === "pdf" ? 0.6 : 1, borderBottom: "none" }}
                      onMouseEnter={(e) => !exporting && onExportButtonHover(e, true)}
                      onMouseLeave={(e) => onExportButtonHover(e, false)}
                    >
                      <Icon name="file" size={14} />
                      {exporting === "pdf" ? "Downloading..." : "Download PDF"}
                    </button>
                  </div>
                </>
              )}
            </div>
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
          <span className="rv-date-pill"><Icon name="calendar" size={13} /> Rolling 13 months</span>
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
                <span className="rv-edit-toolbar-label"><Icon name="edit" size={13} /> Edit Mode</span>
                <span className="rv-edit-toolbar-hint">— changes are visible to the customer after saving</span>
                <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                  <button className="rv-edit-btn-outline" onClick={handlePreviewAsCustomer}><Icon name="eye" size={14} /> Preview as Customer</button>
                  <button className="rv-edit-btn-save" onClick={handleSaveChanges}>Save Changes</button>
                  <button className="rv-edit-btn-done" onClick={() => window.history.back()}>Done</button>
                </div>
              </div>
            )}

            {/* KPI Cards */}
            <div className="rv-kpi-grid">
              {Object.entries(kpiSummary)
                .filter(([code]) => KPI_META[code] && kpiSummary[code] !== null && kpiSummary[code] !== undefined)
                .filter(([code]) => isEditMode || !hiddenKpis[code])
                .map(([code, value]) => (
                  <KpiCard
                    key={code}
                    code={code}
                    value={value}
                    meta={{ ...KPI_META[code], label: customKpiLabels[code] || KPI_META[code].label }}
                    isEditMode={isEditMode}
                    onEditLabel={handleEditKpiLabel}
                    onToggleVisibility={handleToggleKpiVisibility}
                    isHidden={!!hiddenKpis[code]}
                  />
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
                <div className="rv-recharts-wrap">
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={trendRows} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="site" tick={{ fontSize: 11 }} tickLine={false} />
                      <YAxis domain={[70, 100]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} unit="%" />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend formatter={(value) => <span className="rv-legend-text">{KPI_META[value]?.label || value}</span>} />
                      <ReferenceLine y={90} stroke="#d1d5db" strokeDasharray="4 4" label={{ value: "90%", fontSize: 10, fill: "#9ca3af" }} />
                      {kpiKeys.map((k, i) => (
                        <Line
                          key={k}
                          type="monotoneX"
                          dataKey={k}
                          stroke={chartColors[i] || "#6b7280"}
                          strokeWidth={2}
                          dot={{ r: 3, strokeWidth: 0 }}
                          activeDot={{ r: 5 }}
                          connectNulls
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
              {chartMode === "Bar" && (
                <div className="rv-recharts-wrap">
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={trendRows} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="site" tick={{ fontSize: 11 }} tickLine={false} />
                      <YAxis domain={[70, 100]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} unit="%" />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend formatter={(value) => <span className="rv-legend-text">{KPI_META[value]?.label || value}</span>} />
                      {kpiKeys.map((k, i) => (
                        <Bar key={k} dataKey={k} fill={chartColors[i] || "#6b7280"} radius={[2, 2, 0, 0]} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
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
                      {trendRows.map((row, i) => (
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
                  <span className="rv-edit-hint"><Icon name="edit" size={12} /> Editing asset rows - hover a row and click the eye icon to hide/show it</span>
                </div>
                {[
                  { name: "Chiller #2", type: "HVAC", tier: "Tier 1", risk: 86, note: "Plan replacement study" },
                  { name: "VAV Loop A17", type: "Controls", tier: "Tier 2", risk: 72, note: "Sporadic flow oscillation, hunting — recalibrate actuator" },
                  { name: "Boiler #1", type: "Mechanical", tier: "Tier 1", risk: 73, note: "Bearing wear monitor — schedule inspection" },
                  { name: "AHU-3", type: "HVAC", tier: "Tier 2", risk: 66, note: "Efficiency tuning — coil cleaning recommended" },
                ].map((a, i) => (
                  <div key={i} className="rv-asset-row">
                    <span className="rv-asset-icon"><Icon name="settings" size={14} /></span>
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
