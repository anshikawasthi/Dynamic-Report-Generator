import { useEffect, useMemo, useState } from "react";
import {
  exportReport, fetchKpiCatalog, fetchUnified,
  login, saveTemplate, setToken, shareReport,
} from "./api";
import ChartWorkspace from "./components/ChartWorkspace";
import DataTable from "./components/DataTable";
import FilterPanel from "./components/FilterPanel";
import KPICard from "./components/KPICard";
import Sidebar from "./components/Sidebar";
import TopNav from "./components/TopNav";

// ── static mock data for module tables ────────────────────────────────────────
const CONTRACTS = [
  { id: "C-100", customer: "Acme Corp", region: "NA",   site: "Phoenix",   expiry: "2026-12-31", sla: "Gold",     status: "Active",   services: "Remote + Preventive" },
  { id: "C-101", customer: "Acme Corp", region: "NA",   site: "Chicago",   expiry: "2026-09-30", sla: "Silver",   status: "Expiring", services: "Reactive + Preventive" },
  { id: "C-100", customer: "Acme Corp", region: "NA",   site: "Houston",   expiry: "2026-12-31", sla: "Gold",     status: "Active",   services: "Reactive + Preventive" },
  { id: "C-100", customer: "Acme Corp", region: "NA",   site: "Denver",    expiry: "2026-12-31", sla: "Gold",     status: "Active",   services: "Remote + Preventive" },
  { id: "C-100", customer: "Acme Corp", region: "NA",   site: "Dallas",    expiry: "2027-06-30", sla: "Gold",     status: "Active",   services: "Preventive" },
  { id: "C-101", customer: "Acme Corp", region: "NA",   site: "Atlanta",   expiry: "2026-09-30", sla: "Silver",   status: "Expiring", services: "Remote + Reactive + Preventive" },
  { id: "C-100", customer: "Acme Corp", region: "NA",   site: "Seattle",   expiry: "2027-03-31", sla: "Gold",     status: "Active",   services: "Remote + Preventive" },
  { id: "C-101", customer: "Acme Corp", region: "NA",   site: "Miami",     expiry: "2026-09-30", sla: "Silver",   status: "Expiring", services: "Reactive" },
  { id: "C-100", customer: "Acme Corp", region: "EU",   site: "Berlin",    expiry: "2027-01-31", sla: "Gold",     status: "Active",   services: "Remote + Active" },
  { id: "C-100", customer: "Acme Corp", region: "EU",   site: "London",    expiry: "2027-01-31", sla: "Gold",     status: "Active",   services: "Remote + Preventive" },
  { id: "C-100", customer: "Acme Corp", region: "EU",   site: "Paris",     expiry: "2027-01-31", sla: "Gold",     status: "Active",   services: "Active + Preventive" },
  { id: "C-200", customer: "Acme Corp", region: "EU",   site: "Stockholm", expiry: "2027-06-30", sla: "Platinum", status: "Active",   services: "Remote + Active + Preventive" },
  { id: "C-100", customer: "Acme Corp", region: "EU",   site: "Amsterdam", expiry: "2027-01-31", sla: "Gold",     status: "Active",   services: "Remote" },
  { id: "C-100", customer: "Acme Corp", region: "EU",   site: "Madrid",    expiry: "2027-01-31", sla: "Gold",     status: "Active",   services: "Preventive + Active" },
  { id: "C-200", customer: "Acme Corp", region: "EU",   site: "Frankfurt", expiry: "2027-06-30", sla: "Platinum", status: "Active",   services: "Remote + Active" },
  { id: "C-200", customer: "Acme Corp", region: "EU",   site: "Warsaw",    expiry: "2027-06-30", sla: "Platinum", status: "Active",   services: "Preventive" },
  { id: "C-200", customer: "Acme Corp", region: "APAC", site: "Bengaluru", expiry: "2027-03-15", sla: "Platinum", status: "Active",   services: "Remote + Active + Preventive" },
  { id: "C-200", customer: "Acme Corp", region: "APAC", site: "Singapore", expiry: "2027-03-15", sla: "Platinum", status: "Active",   services: "Remote + Preventive" },
  { id: "C-200", customer: "Acme Corp", region: "APAC", site: "Sydney",    expiry: "2027-03-15", sla: "Platinum", status: "Active",   services: "Active + Preventive" },
  { id: "C-200", customer: "Acme Corp", region: "APAC", site: "Tokyo",     expiry: "2027-03-15", sla: "Platinum", status: "Active",   services: "Remote + Active" },
  { id: "C-200", customer: "Acme Corp", region: "APAC", site: "Mumbai",    expiry: "2027-03-15", sla: "Platinum", status: "Active",   services: "Preventive" },
  { id: "C-200", customer: "Acme Corp", region: "APAC", site: "Seoul",     expiry: "2027-03-15", sla: "Platinum", status: "Active",   services: "Remote + Active + Preventive" },
];

const ASSETS = [
  { id: "A-900", name: "North Chiller",       site: "Phoenix",   region: "NA",   type: "HVAC",       uptime: "99.2%", lastPM: "2026-05-10", status: "OK" },
  { id: "A-901", name: "East Compressor",     site: "Berlin",    region: "EU",   type: "Compressor", uptime: "97.8%", lastPM: "2026-04-28", status: "Watch" },
  { id: "A-902", name: "South AHU",           site: "Bengaluru", region: "APAC", type: "AHU",        uptime: "99.5%", lastPM: "2026-05-20", status: "OK" },
  { id: "A-903", name: "West Boiler",         site: "Chicago",   region: "NA",   type: "Boiler",     uptime: "94.1%", lastPM: "2026-03-05", status: "Alert" },
  { id: "A-904", name: "Main Chiller B",      site: "Houston",   region: "NA",   type: "HVAC",       uptime: "98.3%", lastPM: "2026-05-18", status: "OK" },
  { id: "A-905", name: "RTU-12",             site: "Denver",    region: "NA",   type: "RTU",        uptime: "97.5%", lastPM: "2026-05-02", status: "OK" },
  { id: "A-906", name: "Cooling Tower A",    site: "London",    region: "EU",   type: "Cooling",    uptime: "98.9%", lastPM: "2026-05-15", status: "OK" },
  { id: "A-907", name: "AHU-Paris-01",       site: "Paris",     region: "EU",   type: "AHU",        uptime: "99.1%", lastPM: "2026-05-22", status: "OK" },
  { id: "A-908", name: "BMS Controller",     site: "Stockholm", region: "EU",   type: "Controls",   uptime: "99.8%", lastPM: "2026-06-01", status: "OK" },
  { id: "A-909", name: "Chiller SG-1",       site: "Singapore", region: "APAC", type: "HVAC",       uptime: "97.5%", lastPM: "2026-04-18", status: "Watch" },
  { id: "A-910", name: "AHU-Sydney-02",      site: "Sydney",    region: "APAC", type: "AHU",        uptime: "99.0%", lastPM: "2026-05-28", status: "OK" },
  { id: "A-911", name: "Rooftop Unit DL-3",  site: "Dallas",    region: "NA",   type: "RTU",        uptime: "96.8%", lastPM: "2026-04-10", status: "Watch" },
  { id: "A-912", name: "Chiller ATL-1",      site: "Atlanta",   region: "NA",   type: "HVAC",       uptime: "98.5%", lastPM: "2026-05-30", status: "OK" },
  { id: "A-913", name: "Air Handler SEA-B",  site: "Seattle",   region: "NA",   type: "AHU",        uptime: "99.3%", lastPM: "2026-06-05", status: "OK" },
  { id: "A-914", name: "Cooling Tower MIA",  site: "Miami",     region: "NA",   type: "Cooling",    uptime: "95.2%", lastPM: "2026-03-20", status: "Alert" },
  { id: "A-919", name: "TKY Chiller-01",     site: "Tokyo",     region: "APAC", type: "HVAC",       uptime: "98.1%", lastPM: "2026-05-12", status: "OK" },
  { id: "A-920", name: "MUM AHU-02",         site: "Mumbai",    region: "APAC", type: "AHU",        uptime: "97.8%", lastPM: "2026-04-25", status: "Watch" },
  { id: "A-921", name: "Seoul BMS-01",       site: "Seoul",     region: "APAC", type: "Controls",   uptime: "99.6%", lastPM: "2026-06-08", status: "OK" },
];

const INVOICES = [
  { id: "INV-5559", contract: "C-100", customer: "Acme Corp", site: "Phoenix",   amount: "$14,200", date: "2026-04-01", due: "2026-04-30", status: "Paid" },
  { id: "INV-5560", contract: "C-100", customer: "Acme Corp", site: "Phoenix",   amount: "$14,200", date: "2026-05-01", due: "2026-05-31", status: "Paid" },
  { id: "INV-5561", contract: "C-101", customer: "Acme Corp", site: "Chicago",   amount: "$8,750",  date: "2026-05-01", due: "2026-05-31", status: "Outstanding" },
  { id: "INV-5562", contract: "C-200", customer: "Acme Corp", site: "Bengaluru", amount: "$22,100", date: "2026-06-01", due: "2026-06-30", status: "Outstanding" },
  { id: "INV-5563", contract: "C-200", customer: "Acme Corp", site: "Singapore", amount: "$18,500", date: "2026-06-01", due: "2026-06-30", status: "Outstanding" },
  { id: "INV-5564", contract: "C-200", customer: "Acme Corp", site: "Sydney",    amount: "$16,800", date: "2026-05-01", due: "2026-05-31", status: "Paid" },
  { id: "INV-5565", contract: "C-200", customer: "Acme Corp", site: "Tokyo",     amount: "$21,400", date: "2026-06-01", due: "2026-06-30", status: "Outstanding" },
  { id: "INV-5566", contract: "C-200", customer: "Acme Corp", site: "Mumbai",    amount: "$12,600", date: "2026-05-01", due: "2026-05-31", status: "Paid" },
  { id: "INV-5567", contract: "C-200", customer: "Acme Corp", site: "Seoul",     amount: "$19,200", date: "2026-06-01", due: "2026-06-30", status: "Outstanding" },
  { id: "INV-5568", contract: "C-100", customer: "Acme Corp", site: "Berlin",    amount: "$11,300", date: "2026-05-01", due: "2026-05-31", status: "Paid" },
  { id: "INV-5569", contract: "C-100", customer: "Acme Corp", site: "London",    amount: "$13,700", date: "2026-05-01", due: "2026-05-31", status: "Paid" },
  { id: "INV-5570", contract: "C-100", customer: "Acme Corp", site: "Houston",   amount: "$9,800",  date: "2026-06-01", due: "2026-06-30", status: "Outstanding" },
];

const OPPORTUNITIES = [
  { id: "OP-01", title: "Obsolescence Upgrade – A-903",        type: "Risk",    priority: "High",   value: "$32,000", site: "Chicago",   region: "NA" },
  { id: "OP-02", title: "Coverage Expansion – A-901",          type: "Growth",  priority: "Medium", value: "$18,500", site: "Berlin",    region: "EU" },
  { id: "OP-03", title: "Remote Monitoring Add-on",            type: "Upsell",  priority: "Medium", value: "$9,000",  site: "Phoenix",   region: "NA" },
  { id: "OP-04", title: "A-914 Cooling Tower Replacement",     type: "Risk",    priority: "High",   value: "$45,000", site: "Miami",     region: "NA" },
  { id: "OP-05", title: "Active Monitoring Upgrade – Tokyo",   type: "Upsell",  priority: "Medium", value: "$28,000", site: "Tokyo",     region: "APAC" },
  { id: "OP-06", title: "Contract Renewal – C-101",            type: "Renewal", priority: "High",   value: "$120,000",site: "Chicago",   region: "NA" },
  { id: "OP-07", title: "PM Frequency Increase – Atlanta",     type: "Upsell",  priority: "Low",    value: "$7,500",  site: "Atlanta",   region: "NA" },
  { id: "OP-08", title: "BMS Integration – Seoul",             type: "Growth",  priority: "Medium", value: "$55,000", site: "Seoul",     region: "APAC" },
  { id: "OP-09", title: "Energy Efficiency Retrofit – Paris",  type: "Growth",  priority: "Low",    value: "$38,000", site: "Paris",     region: "EU" },
  { id: "OP-10", title: "Reactive to Preventive Migration",    type: "Upsell",  priority: "Medium", value: "$22,000", site: "Houston",   region: "NA" },
];

// ── Role-Based Data Filtering ──
function filterByRole(data, role) {
  if (!role) return data;
  // CustomerSuccess: sees all contracts/assets/invoices (full visibility)
  if (role === "CustomerSuccess") return data;
  // FieldService: sees assets and contracts only for own region
  if (role === "FieldService") {
    if (Array.isArray(data) && data.length > 0) {
      return data.filter((item) => item.region !== "APAC"); // FS doesn't see APAC region
    }
  }
  // SiteDirector: sees all data (can manage all sites)
  if (role === "SiteDirector") return data;
  return data;
}

const HEALTH_TREND_ROWS = [
  { month: "Apr", PM_COMPLIANCE: 82, REACTIVE_COMPLIANCE: 80, REMOTE_COMPLIANCE: 78 },
  { month: "May", PM_COMPLIANCE: 86, REACTIVE_COMPLIANCE: 84, REMOTE_COMPLIANCE: 81 },
  { month: "Jun", PM_COMPLIANCE: 85, REACTIVE_COMPLIANCE: 88, REMOTE_COMPLIANCE: 83 },
  { month: "Jul", PM_COMPLIANCE: 89, REACTIVE_COMPLIANCE: 86, REMOTE_COMPLIANCE: 84 },
  { month: "Aug", PM_COMPLIANCE: 90, REACTIVE_COMPLIANCE: 85, REMOTE_COMPLIANCE: 88 },
  { month: "Sep", PM_COMPLIANCE: 87, REACTIVE_COMPLIANCE: 89, REMOTE_COMPLIANCE: 82 },
  { month: "Oct", PM_COMPLIANCE: 84, REACTIVE_COMPLIANCE: 87, REMOTE_COMPLIANCE: 85 },
  { month: "Nov", PM_COMPLIANCE: 83, REACTIVE_COMPLIANCE: 86, REMOTE_COMPLIANCE: 84 },
  { month: "Dec", PM_COMPLIANCE: 82, REACTIVE_COMPLIANCE: 88, REMOTE_COMPLIANCE: 83 },
  { month: "Jan", PM_COMPLIANCE: 81, REACTIVE_COMPLIANCE: 87, REMOTE_COMPLIANCE: 81 },
  { month: "Feb", PM_COMPLIANCE: 84, REACTIVE_COMPLIANCE: 90, REMOTE_COMPLIANCE: 86 },
  { month: "Mar", PM_COMPLIANCE: 88, REACTIVE_COMPLIANCE: 91, REMOTE_COMPLIANCE: 90 },
  { month: "Apr", PM_COMPLIANCE: 89, REACTIVE_COMPLIANCE: 90, REMOTE_COMPLIANCE: 88 },
];

const AT_RISK_ASSETS = [
  { asset: "Chiller #2", type: "HVAC", criticality: "Tier 1", risk: 88, signal: "High vibration, short-cycling", recommendation: "Plan replacement study", savings: "$48K/yr" },
  { asset: "VAV Loop A17", type: "Controls", criticality: "Tier 2", risk: 72, signal: "Flow oscillation, hunting", recommendation: "Retune PID and damper", savings: "$8K/yr" },
  { asset: "Boiler #1", type: "Mechanical", criticality: "Tier 1", risk: 73, signal: "Bearing wear monitor", recommendation: "Bearing and seal refresh", savings: "$11K/yr" },
  { asset: "AHU-3", type: "HVAC", criticality: "Tier 2", risk: 66, signal: "Low efficiency trend", recommendation: "Coil cleaning and balancing", savings: "$6K/yr" },
];

const SECTION_CHIPS = ["KPIs", "Contracts", "Assets", "Invoices", "Opportunities"];
const CATALOG_COLORS = ["", "green", "blue", "amber", "purple", "teal", ""];

function statusBadge(s) {
  const map = { Active: "badge-green", Expiring: "badge-amber", Alert: "badge-red", Watch: "badge-amber", OK: "badge-green", Paid: "badge-green", Outstanding: "badge-amber", High: "badge-red", Medium: "badge-amber", Low: "badge-blue" };
  return <span className={`badge ${map[s] || "badge-gray"}`}>{s}</span>;
}

// ── App root ──────────────────────────────────────────────────────────────────
export default function App() {
  const [username, setUsername]       = useState("cs_user");
  const [session,  setSession]        = useState(null);
  const [authError, setAuthError]     = useState("");
  const [section,  setSection]        = useState("dashboard");
  const [dashboardTab, setDashboardTab] = useState("Overview");
  const [catalog,  setCatalog]        = useState([]);
  const [catQuery, setCatQuery]       = useState("");
  const [filters,  setFilters]        = useState({ rangePreset: "month", region: "", site: "", contract: "", language: "", startDate: "", endDate: "" });
  const [response, setResponse]       = useState({ data: [], presentation: { defaultChart: "bar" }, meta: {} });
  const [chartType, setChartType]     = useState("bar");
  const [reportChartType, setReportChartType] = useState("bar");
  const [outputMode, setOutputMode]   = useState("summary");
  const [selectedSections, setSelectedSections] = useState(["KPIs", "Contracts", "Assets"]);
  const [permalink, setPermalink]     = useState("");
  const [loading, setLoading]         = useState(false);
  const [templatesSaved, setTemplatesSaved] = useState([]);
  const [aliases, setAliases]         = useState({ "A-900": "North Chiller", "A-901": "East Compressor" });

  useEffect(() => {
    if (!session) return;
    fetchKpiCatalog(catQuery).then(setCatalog).catch(() => {});
  }, [catQuery, session]);

  const rows = useMemo(() =>
    (response.data || []).map((r) => ({ ...r, asset_id: aliases[r.asset_id] || r.asset_id })),
  [response.data, aliases]);

  // Pivot rows by site for grouped charts
  const chartRows = useMemo(() => {
    const bySite = {};
    rows.forEach((r) => {
      if (!bySite[r.site]) bySite[r.site] = { site: r.site };
      bySite[r.site][r.kpi_code] = r.value;
    });
    return Object.values(bySite);
  }, [rows]);

  const kpiSummary = useMemo(() => {
    const byCode = {};
    rows.forEach((r) => { if (!byCode[r.kpi_code]) byCode[r.kpi_code] = []; byCode[r.kpi_code].push(r.value); });
    const avg = (arr) => arr.length ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : null;
    return {
      MTTR:                avg(byCode.MTTR || []),
      UPTIME:              avg(byCode.UPTIME || []),
      PM_COMPLETION:       avg(byCode.PM_COMPLETION || []),
      REACTIVE_MAINTENANCE:avg(byCode.REACTIVE_MAINTENANCE || []),
      CSAT:                avg(byCode.CSAT || []),
      INVOICE_CYCLE:       avg(byCode.INVOICE_CYCLE || []),
      SYSTEM_AVAILABILITY: avg(byCode.SYSTEM_AVAILABILITY || []),
      COMPLIANCE:          avg(byCode.COMPLIANCE || []),
    };
  }, [rows]);

  const complianceMixRows = useMemo(() => [
    { name: "PM", value: +(kpiSummary.PM_COMPLETION || 0).toFixed(1) },
    { name: "Reactive", value: +(100 - (kpiSummary.REACTIVE_MAINTENANCE || 0)).toFixed(1) },
    { name: "Remote", value: +(kpiSummary.SYSTEM_AVAILABILITY || 0).toFixed(1) },
    { name: "CSAT x20", value: +((kpiSummary.CSAT || 0) * 20).toFixed(1) },
  ], [kpiSummary]);

  // ── handlers ────────────────────────────────────────────────────────────────
  const handleLogin = async () => {
    setAuthError("");
    setLoading(true);
    try {
      const data = await login(username);
      setToken(data.accessToken);
      setSession(data);
      const res = await fetchUnified({ ...filters });
      setResponse(res);
      setChartType(res.presentation?.defaultChart || "bar");
    } catch (err) {
      const apiMessage = err?.response?.data?.message || err?.response?.data?.error;
      const message = apiMessage || "Sign in failed. Verify backend URL and CORS settings.";
      setAuthError(message);
    } finally { setLoading(false); }
  };

  const loadData = async () => {
    setLoading(true);
    try { const res = await fetchUnified(filters); setResponse(res); setChartType(res.presentation?.defaultChart || "bar"); }
    finally { setLoading(false); }
  };

  const handleSaveTemplate = async () => {
    const tpl = await saveTemplate({ name: `${outputMode} – ${new Date().toLocaleDateString()}`, role: session.role, filters, outputMode, sections: selectedSections });
    setTemplatesSaved((p) => [...p, tpl.template]);
    alert("Template saved!");
  };

  const handleShare = async () => {
    const r = await shareReport({ filters, data: response.data });
    const baseUrl = `${window.location.protocol}//${window.location.host}`;
    setPermalink(`${baseUrl}${r.permalink}`);
  };

  const handleExport = async (fmt) => {
    const blob = await exportReport(fmt, { data: response.data });
    const url = URL.createObjectURL(blob);
    Object.assign(document.createElement("a"), { href: url, download: `report.${fmt}` }).click();
    URL.revokeObjectURL(url);
  };

  const toggleSection = (s) =>
    setSelectedSections((p) => p.includes(s) ? p.filter((x) => x !== s) : [...p, s]);

  // ── login screen ─────────────────────────────────────────────────────────────
  if (!session) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-logo">
            <div className="login-hw-badge">H</div>
            <div className="login-brand">
              <div className="login-brand-name">Honeywell</div>
              <div className="login-brand-sub">World Class Customer Reports</div>
            </div>
          </div>
          <div className="login-form">
            <div className="login-field">
              <label>User Account</label>
              <select value={username} onChange={(e) => setUsername(e.target.value)}>
                <option value="cs_user">Customer Success (cs_user)</option>
                <option value="fs_user">Field Service (fs_user)</option>
                <option value="director_user">Site Director (director_user)</option>
                <option value="tenant2_user">Tenant 2 Demo (tenant2_user)</option>
              </select>
            </div>
            <button className="login-btn" onClick={handleLogin} disabled={loading}>{loading ? "Signing In..." : "Sign In →"}</button>
            {!!authError && <div className="info-banner warning" style={{ marginTop: 12 }}>{authError}</div>}
          </div>
          <div className="login-hint">
            Demo instance • <span onClick={() => setUsername("director_user")}>Switch to Director view</span>
          </div>
        </div>
      </div>
    );
  }

  // ── main shell ───────────────────────────────────────────────────────────────
  const greeting = `Good ${new Date().getHours() < 12 ? "Morning" : new Date().getHours() < 18 ? "Afternoon" : "Evening"}, ${session.role}!`;

  return (
    <>
      <TopNav session={session} onLogout={() => setSession(null)} />
      <Sidebar active={section} onNav={setSection} />

      <div className="app-layout">
        <main className="page-content">

          {/* ── DASHBOARD ─────────────────────────────── */}
          {section === "dashboard" && (
            <>
              <div className="page-header">
                <div className="page-greeting">{greeting}</div>
                <div className="page-subtitle">
                  Tenant: {session.tenantId} &nbsp;|&nbsp; Role: {session.role} &nbsp;|&nbsp;
                  {loading ? "Loading data…" : `${rows.length} records loaded`}
                </div>
              </div>

              <div className="tabs">
                {[
                  "Overview", "Insights", "Preventive", "Reactive", "Remote", "CSAT", "Invoicing",
                ].map((label) => (
                  <div 
                    key={label} 
                    className={`tab ${dashboardTab === label ? "active" : ""}`}
                    onClick={() => setDashboardTab(label)}
                    style={{ cursor: "pointer" }}
                  >
                    {label}
                  </div>
                ))}
              </div>

              <div className="dashboard-controls">
                <div className="control-pill">Rolling 13 months</div>
                <div className="control-pill">Monthly ▾</div>
                <div className="control-pill">YoY ▾</div>
              </div>

              {!rows.length && (
                <div className="info-banner info">
                  ℹ️ Click <strong>Report Builder</strong> to load and visualize data, or use the button below.
                  <button className="btn-primary btn-sm" style={{ marginLeft: "auto" }} onClick={loadData}>Load Dashboard Data</button>
                </div>
              )}

              {/* ── OVERVIEW TAB ─────────────────────────────── */}
              {dashboardTab === "Overview" && (
                <>
                  <div className="kpi-grid">
                    <KPICard label="Mean Time To Repair"    value={kpiSummary.MTTR ?? "--"}              unit="hrs"  color=""       trend="down" change={8}   source="SMS" />
                    <KPICard label="System Uptime"          value={kpiSummary.UPTIME ?? "--"}            unit="%"    color="green"  trend="up"   change={1.2} source="NEX" />
                    <KPICard label="PM Completion"          value={kpiSummary.PM_COMPLETION ?? "--"}     unit="%"    color="blue"   trend="up"   change={3.5} source="SMS" />
                    <KPICard label="CSAT Score"             value={kpiSummary.CSAT ?? "--"}              unit="/ 5"  color="amber"  trend="up"   change={2}   source="SMS" />
                    <KPICard label="Invoice Cycle Time"     value={kpiSummary.INVOICE_CYCLE ?? "--"}     unit="days" color="purple" trend="down" change={5}   source="SAP" />
                    <KPICard label="System Availability"    value={kpiSummary.SYSTEM_AVAILABILITY ?? "--"} unit="%" color="teal" trend="up"   change={0.8} source="NEX" />
                  </div>

                  <div className="grid-2">
                    <div className="card">
                      <div className="card-header">
                        <div><div className="card-title">Performance by Site</div><div className="card-subtitle">KPI values grouped by location</div></div>
                        <div className="button-row">
                          {["bar","line","pie"].map((t) => (
                            <button key={t} className={chartType === t ? "btn-primary btn-sm" : "btn-secondary btn-sm"} onClick={() => setChartType(t)}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
                          ))}
                        </div>
                      </div>
                      <ChartWorkspace chartType={chartType} rows={chartRows} xKey="site" seriesKeys={["PM_COMPLETION", "UPTIME", "MTTR"]} />
                    </div>

                    <div className="card">
                      <div className="card-header">
                        <div><div className="card-title">Contract Health</div><div className="card-subtitle">Entitlements &amp; expiry summary</div></div>
                      </div>
                      {[
                        { label: "SLA Compliance",       pct: 94, color: "green" },
                        { label: "PM Scheduling",         pct: 88, color: "blue" },
                        { label: "Reactive Response",     pct: 79, color: "amber" },
                        { label: "Invoicing On-Time",     pct: 96, color: "green" },
                        { label: "Contract Renewal Risk", pct: 32, color: "" },
                      ].map(({ label, pct, color }) => (
                        <div key={label} style={{ marginBottom: 12 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>
                            <span>{label}</span><span style={{ fontWeight: 600 }}>{pct}%</span>
                          </div>
                          <div className="progress-bar"><div className={`progress-fill ${color}`} style={{ width: `${pct}%` }} /></div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid-2">
                <div className="card">
                  <div className="card-header">
                    <div><div className="card-title">Service Health Trend (Rolling 13 months)</div><div className="card-subtitle">PM, Reactive and Remote compliance</div></div>
                  </div>
                  <ChartWorkspace
                    chartType="line"
                    rows={HEALTH_TREND_ROWS}
                    xKey="month"
                    seriesKeys={["PM_COMPLIANCE", "REACTIVE_COMPLIANCE", "REMOTE_COMPLIANCE"]}
                  />
                </div>

                <div className="card">
                  <div className="card-header">
                    <div><div className="card-title">Compliance Mix</div><div className="card-subtitle">Distribution across service categories</div></div>
                  </div>
                  <ChartWorkspace chartType="pie" rows={complianceMixRows} xKey="name" />
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <div><div className="card-title">At-Risk Assets</div><div className="card-subtitle">Criticality, risk signal, and recommendation</div></div>
                </div>
                <DataTable
                  columns={[
                    { key: "asset", label: "Asset" },
                    { key: "type", label: "Type" },
                    { key: "criticality", label: "Criticality" },
                    {
                      key: "risk",
                      label: "Risk",
                      render: (v) => (
                        <div>
                          <span>{v}</span>
                          <div className="progress-bar" style={{ marginTop: 4 }}>
                            <div className={`progress-fill ${v >= 80 ? "" : v >= 70 ? "amber" : "blue"}`} style={{ width: `${v}%` }} />
                          </div>
                        </div>
                      ),
                    },
                    { key: "signal", label: "Signal" },
                    { key: "recommendation", label: "Recommendation" },
                    { key: "savings", label: "Savings" },
                  ]}
                  rows={AT_RISK_ASSETS}
                />
              </div>

              <div className="grid-2">
                <div className="card">
                  <div className="card-header"><div className="card-title">Recent Contracts</div></div>
                  <DataTable
                    columns={[
                      { key: "id",     label: "Contract" },
                      { key: "site",   label: "Site" },
                      { key: "sla",    label: "SLA Tier" },
                      { key: "expiry", label: "Expiry" },
                      { key: "status", label: "Status", render: (v) => statusBadge(v) },
                    ]}
                    rows={filterByRole(CONTRACTS, session.role)}
                  />
                </div>
                <div className="card">
                  <div className="card-header"><div className="card-title">Invoice Summary</div></div>
                  <DataTable
                    columns={[
                      { key: "id",       label: "Invoice" },
                      { key: "amount",   label: "Amount" },
                      { key: "due",      label: "Due Date" },
                      { key: "status",   label: "Status", render: (v) => statusBadge(v) },
                    ]}
                    rows={filterByRole(INVOICES, session.role)}
                  />
                </div>
              </div>
              </>
              )}

              {/* ── INSIGHTS TAB ─────────────────────────── */}
              {dashboardTab === "Insights" && (
                <>
                  <div className="card">
                    <div className="card-header">
                      <div className="card-title">AI-Driven Insights & Recommendations</div>
                    </div>
                    <div className="kpi-grid">
                      <div className="phase2-item">
                        <div className="phase2-icon-wrap amber">⚠️</div>
                        <div>
                          <div className="phase2-title">Risk Profiling</div>
                          <div className="phase2-desc">Chiller #2 at Tier 1 criticality shows high vibration & short-cycling. Risk score: 88%. Estimated cost impact: $48K/yr if failure occurs.</div>
                          <div className="phase2-eta">Confidence: High • Data source: SMS sensors</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-header">
                      <div className="card-title">Bad Actor Detection</div>
                    </div>
                    <DataTable
                      columns={[
                        { key: "asset", label: "Asset" },
                        { key: "failures", label: "Failures (12mo)" },
                        { key: "mttr", label: "Avg MTTR" },
                        { key: "cost", label: "Maintenance Cost" },
                        { key: "recommendation", label: "Recommendation" },
                      ]}
                      rows={[
                        { asset: "Boiler #1", failures: 7, mttr: "8.5 hrs", cost: "$12,400", recommendation: "Plan replacement in Q3" },
                        { asset: "AHU-3", failures: 5, mttr: "6.2 hrs", cost: "$8,900", recommendation: "Coil cleaning & rebalance" },
                        { asset: "VAV Loop A17", failures: 4, mttr: "4.1 hrs", cost: "$6,200", recommendation: "PID tuning review" },
                      ]}
                    />
                  </div>

                  <div className="card">
                    <div className="card-header">
                      <div className="card-title">Obsolescence Alerts</div>
                    </div>
                    <div className="info-banner warning">⚠️ <strong>A-903 (West Boiler, Chicago)</strong> is 14 years old. Parts availability declining. Recommend replacement study in next 18 months.</div>
                  </div>
                </>
              )}

              {/* ── PREVENTIVE TAB ─────────────────────────── */}
              {dashboardTab === "Preventive" && (
                <>
                  <div className="kpi-grid">
                    <KPICard label="PM Completion Rate" value={88} unit="%" color="green" trend="up" change={2.3} source="SMS" />
                    <KPICard label="Scheduled vs Completed" value={92} unit="%" color="blue" trend="up" change={1.5} source="SMS" />
                    <KPICard label="PM Schedule Adherence" value={85} unit="%" color="amber" trend="up" change={3.2} source="SMS" />
                    <KPICard label="Preventive Cost Index" value={3.2} unit="$/mth" color="purple" trend="down" change={0.4} source="SMS" />
                  </div>

                  <div className="grid-2">
                    <div className="card">
                      <div className="card-header">
                        <div className="card-title">PM Compliance Trend</div>
                        <div className="card-subtitle">Last 13 months</div>
                      </div>
                      <ChartWorkspace
                        chartType="line"
                        rows={HEALTH_TREND_ROWS}
                        xKey="month"
                        seriesKeys={["PM_COMPLIANCE"]}
                      />
                    </div>
                    <div className="card">
                      <div className="card-header">
                        <div className="card-title">PM Schedule by Site</div>
                      </div>
                      <DataTable
                        columns={[
                          { key: "site", label: "Site" },
                          { key: "scheduled", label: "Scheduled" },
                          { key: "completed", label: "Completed" },
                          { key: "rate", label: "Rate", render: (v) => <span style={{ fontWeight: 600, color: "var(--hw-red)" }}>{v}%</span> },
                        ]}
                        rows={[
                          { site: "Phoenix", scheduled: 12, completed: 12, rate: 100 },
                          { site: "Chicago", scheduled: 11, completed: 9, rate: 82 },
                          { site: "Houston", scheduled: 10, completed: 9, rate: 90 },
                          { site: "Denver", scheduled: 9, completed: 8, rate: 89 },
                        ]}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* ── REACTIVE TAB ─────────────────────────── */}
              {dashboardTab === "Reactive" && (
                <>
                  <div className="kpi-grid">
                    <KPICard label="Mean Time To Repair" value={4.2} unit="hrs" color="" trend="down" change={1.1} source="SMS" />
                    <KPICard label="Reactive Compliance" value={89} unit="%" color="green" trend="up" change={2.5} source="SMS" />
                    <KPICard label="Response Time" value={1.3} unit="hrs" color="blue" trend="up" change={0.2} source="SMS" />
                    <KPICard label="SLA Adherence" value={94} unit="%" color="amber" trend="up" change={1.8} source="SMS" />
                  </div>

                  <div className="card">
                    <div className="card-header">
                      <div className="card-title">Recent Reactive Incidents</div>
                    </div>
                    <DataTable
                      columns={[
                        { key: "incident", label: "Incident #" },
                        { key: "asset", label: "Asset" },
                        { key: "date", label: "Date" },
                        { key: "response", label: "Response Time" },
                        { key: "resolution", label: "Resolution Time" },
                        { key: "status", label: "Status", render: (v) => statusBadge(v) },
                      ]}
                      rows={[
                        { incident: "INC-2026-001", asset: "Chiller #2", date: "2026-06-10", response: "45 min", resolution: "3.5 hrs", status: "Closed" },
                        { incident: "INC-2026-002", asset: "Boiler #1", date: "2026-06-09", response: "30 min", resolution: "4.2 hrs", status: "Closed" },
                        { incident: "INC-2026-003", asset: "AHU-3", date: "2026-06-08", response: "1.2 hrs", resolution: "2.1 hrs", status: "Closed" },
                      ]}
                    />
                  </div>
                </>
              )}

              {/* ── REMOTE TAB ─────────────────────────── */}
              {dashboardTab === "Remote" && (
                <>
                  <div className="kpi-grid">
                    <KPICard label="System Availability" value={90} unit="%" color="green" trend="up" change={0.8} source="NEX" />
                    <KPICard label="Remote Monitoring Uptime" value={99.8} unit="%" color="blue" trend="up" change={0.1} source="NEX" />
                    <KPICard label="Sensors Online" value={847} unit="of 850" color="amber" trend="up" change={2} source="NEX" />
                    <KPICard label="Data Collection Rate" value={98.5} unit="%" color="purple" trend="up" change={0.3} source="NEX" />
                  </div>

                  <div className="grid-2">
                    <div className="card">
                      <div className="card-header">
                        <div className="card-title">Remote Monitoring Compliance</div>
                      </div>
                      <ChartWorkspace
                        chartType="line"
                        rows={HEALTH_TREND_ROWS}
                        xKey="month"
                        seriesKeys={["REMOTE_COMPLIANCE"]}
                      />
                    </div>
                    <div className="card">
                      <div className="card-header">
                        <div className="card-title">Sensor Status by Site</div>
                      </div>
                      <DataTable
                        columns={[
                          { key: "site", label: "Site" },
                          { key: "total", label: "Total Sensors" },
                          { key: "online", label: "Online" },
                          { key: "rate", label: "Rate", render: (v) => <span style={{ fontWeight: 600, color: "var(--hw-red)" }}>{v}%</span> },
                        ]}
                        rows={[
                          { site: "Phoenix", total: 215, online: 215, rate: 100 },
                          { site: "Chicago", total: 198, online: 197, rate: 99.5 },
                          { site: "Houston", total: 210, online: 208, rate: 99 },
                          { site: "Denver", total: 224, online: 227, rate: 100 },
                        ]}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* ── CSAT TAB ─────────────────────────── */}
              {dashboardTab === "CSAT" && (
                <>
                  <div className="kpi-grid">
                    <KPICard label="Overall CSAT Score" value={4.6} unit="/ 5.0" color="green" trend="up" change={0.2} source="SMS" />
                    <KPICard label="Net Promoter Score" value={72} unit="pts" color="blue" trend="up" change={5} source="SMS" />
                    <KPICard label="Resolution Quality" value={92} unit="%" color="amber" trend="up" change={1.5} source="SMS" />
                    <KPICard label="Customer Satisfaction Trend" value={88} unit="%" color="purple" trend="up" change={3.2} source="SMS" />
                  </div>

                  <div className="card">
                    <div className="card-header">
                      <div className="card-title">CSAT Score Trend (Rolling 13 Months)</div>
                    </div>
                    <ChartWorkspace
                      chartType="line"
                      rows={HEALTH_TREND_ROWS.map(row => ({ month: row.month, CSAT: Math.round((row.PM_COMPLIANCE + row.REACTIVE_COMPLIANCE + row.REMOTE_COMPLIANCE) / 3 * 0.92) / 100 * 5 }))}
                      xKey="month"
                      seriesKeys={["CSAT"]}
                    />
                  </div>

                  <div className="card">
                    <div className="card-header">
                      <div className="card-title">Satisfaction by Category</div>
                    </div>
                    <DataTable
                      columns={[
                        { key: "category", label: "Category" },
                        { key: "score", label: "Score", render: (v) => <span style={{ fontWeight: 600, color: "var(--hw-red)" }}>{v}</span> },
                        { key: "trend", label: "Trend" },
                        { key: "feedback", label: "Key Feedback" },
                      ]}
                      rows={[
                        { category: "Response Time", score: "4.7 / 5", trend: "↑ +0.3", feedback: "Consistently fast response" },
                        { category: "Technical Competence", score: "4.6 / 5", trend: "↑ +0.2", feedback: "Well-trained technicians" },
                        { category: "Communication", score: "4.5 / 5", trend: "→ 0.0", feedback: "Could be more proactive" },
                        { category: "First-Time Fix Rate", score: "4.4 / 5", trend: "↑ +0.5", feedback: "Improving with better diagnostics" },
                      ]}
                    />
                  </div>
                </>
              )}

              {/* ── INVOICING TAB ─────────────────────── */}
              {dashboardTab === "Invoicing" && (
                <>
                  <div className="kpi-grid">
                    <KPICard label="Avg Invoice Cycle Time" value={11} unit="days" color="green" trend="down" change={2} source="SAP" />
                    <KPICard label="Invoice On-Time Rate" value={96} unit="%" color="blue" trend="up" change={1.5} source="SAP" />
                    <KPICard label="Payment Aging" value={18} unit="days" color="amber" trend="down" change={3} source="SAP" />
                    <KPICard label="Invoice Accuracy Rate" value={99.2} unit="%" color="purple" trend="up" change={0.3} source="SAP" />
                  </div>

                  <div className="grid-2">
                    <div className="card">
                      <div className="card-header">
                        <div className="card-title">Invoice Volume Trend</div>
                      </div>
                      <ChartWorkspace
                        chartType="bar"
                        rows={HEALTH_TREND_ROWS.map(row => ({ month: row.month, volume: Math.floor(Math.random() * 50) + 20, paid: Math.floor(Math.random() * 40) + 15 }))}
                        xKey="month"
                        seriesKeys={["volume", "paid"]}
                      />
                    </div>
                    <div className="card">
                      <div className="card-header">
                        <div className="card-title">Payment Status Summary</div>
                      </div>
                      <DataTable
                        columns={[
                          { key: "status", label: "Status" },
                          { key: "count", label: "Count" },
                          { key: "amount", label: "Amount" },
                          { key: "days", label: "Avg Days" },
                        ]}
                        rows={[
                          { status: "Paid", count: 142, amount: "$185,400", days: 15 },
                          { status: "Outstanding", count: 28, amount: "$42,300", days: 22 },
                          { status: "Overdue", count: 3, amount: "$5,850", days: 35 },
                          { status: "Disputed", count: 1, amount: "$1,200", days: 10 },
                        ]}
                      />
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-header">
                      <div className="card-title">Recent Invoices</div>
                    </div>
                    <DataTable
                      columns={[
                        { key: "invoice", label: "Invoice #" },
                        { key: "contract", label: "Contract" },
                        { key: "amount", label: "Amount" },
                        { key: "date", label: "Date" },
                        { key: "due", label: "Due" },
                        { key: "status", label: "Status", render: (v) => statusBadge(v) },
                      ]}
                      rows={filterByRole(INVOICES, session.role)}
                    />
                  </div>
                </>
              )}
            </>
          )}

          {/* ── KPI CATALOG ───────────────────────────── */}
          {section === "kpi-catalog" && (
            <>
              <div className="page-header">
                <div className="page-greeting">KPI Catalog</div>
                <div className="page-subtitle">Searchable registry of all performance indicators</div>
              </div>
              <div className="search-box-wrap">
                <span className="search-icon">🔍</span>
                <input placeholder="Search by KPI code or name…" value={catQuery} onChange={(e) => setCatQuery(e.target.value)} style={{ paddingLeft: 34 }} />
              </div>
              <div className="catalog-grid">
                {catalog.map((kpi, i) => (
                  <div key={kpi.code} className={`catalog-card ${CATALOG_COLORS[i % CATALOG_COLORS.length]}`}>
                    <div className="catalog-code">{kpi.code}</div>
                    <div className="catalog-name">{kpi.name}</div>
                    <div className="catalog-desc">{kpi.description}</div>
                    <div className="catalog-meta">
                      <span className="badge badge-gray">{kpi.unit}</span>
                      <span className="badge badge-blue">{kpi.default_chart}</span>
                      {kpi.source_priority?.map((s) => <span key={s} className="badge badge-purple">{s}</span>)}
                    </div>
                  </div>
                ))}
                {!catalog.length && <div style={{ color: "var(--text-secondary)", fontSize: 13, gridColumn: "1/-1" }}>No KPIs matched. Try clearing the search.</div>}
              </div>
            </>
          )}

          {/* ── CONTRACTS ─────────────────────────────── */}
          {section === "contracts" && (
            <>
              <div className="page-header">
                <div className="page-greeting">Contracts</div>
                <div className="page-subtitle">Entitlements, SLA details, and renewal risk ({session.role})</div>
              </div>
              <div className="info-banner warning">⚠️ 1 contract expires within 90 days — C-101 (Chicago, Sep 30 2026)</div>
              <div className="card">
                <div className="card-header"><div className="card-title">Contract Register</div></div>
                <DataTable
                  columns={[
                    { key: "id",       label: "Contract #" },
                    { key: "customer", label: "Customer" },
                    { key: "region",   label: "Region" },
                    { key: "site",     label: "Site" },
                    { key: "sla",      label: "SLA Tier" },
                    { key: "expiry",   label: "Expiry Date" },
                    { key: "status",   label: "Status", render: (v) => statusBadge(v) },
                  ]}
                  rows={filterByRole(CONTRACTS, session.role)}
                />
              </div>
            </>
          )}

          {/* ── ASSETS ────────────────────────────────── */}
          {section === "assets" && (
            <>
              <div className="page-header">
                <div className="page-greeting">Assets</div>
                <div className="page-subtitle">Equipment performance, coverage, and bad actor detection ({session.role})</div>
              </div>
              <div className="info-banner warning">⚠️ Asset A-903 (West Boiler, Chicago) is below uptime threshold — review required.</div>
              <div className="card">
                <div className="card-header">
                  <div className="card-title">Asset Registry</div>
                  <button className="btn-outline btn-sm" onClick={() => setAliases((p) => ({ ...p, "A-904": "Main Chiller B" }))}>Apply Aliases</button>
                </div>
                <DataTable
                  columns={[
                    { key: "id",     label: "Asset ID" },
                    { key: "name",   label: "Asset Name" },
                    { key: "site",   label: "Site" },
                    { key: "type",   label: "Type" },
                    { key: "uptime", label: "Uptime" },
                    { key: "lastPM", label: "Last PM" },
                    { key: "status", label: "Status", render: (v) => statusBadge(v) },
                  ]}
                  rows={filterByRole(ASSETS, session.role)}
                />
              </div>
            </>
          )}

          {/* ── INVOICES ──────────────────────────────── */}
          {section === "invoices" && (
            <>
              <div className="page-header">
                <div className="page-greeting">Invoices</div>
                <div className="page-subtitle">Paid, outstanding, and disputed payments ({session.role})</div>
              </div>
              <div className="kpi-grid">
                <KPICard label="Total Invoiced"     value="$59,250"  color=""       />
                <KPICard label="Paid"               value="$28,400"  color="green"  />
                <KPICard label="Outstanding"        value="$30,850"  color="amber"  />
                <KPICard label="Avg Cycle Time"     value="11"       unit="days" color="blue" />
              </div>
              <div className="card">
                <div className="card-header"><div className="card-title">Invoice Detail</div></div>
                <DataTable
                  columns={[
                    { key: "id",       label: "Invoice #" },
                    { key: "contract", label: "Contract" },
                    { key: "amount",   label: "Amount" },
                    { key: "date",     label: "Invoice Date" },
                    { key: "due",      label: "Due Date" },
                    { key: "status",   label: "Status", render: (v) => statusBadge(v) },
                  ]}
                  rows={filterByRole(INVOICES, session.role)}
                />
              </div>
            </>
          )}

          {/* ── OPPORTUNITIES ─────────────────────────── */}
          {section === "opportunities" && (
            <>
              <div className="page-header">
                <div className="page-greeting">Opportunities</div>
                <div className="page-subtitle">Recommended actions, upsell, and risk mitigation ({session.role})</div>
              </div>
              <div className="card">
                <div className="card-header"><div className="card-title">Recommended Actions</div></div>
                <DataTable
                  columns={[
                    { key: "id",       label: "Ref" },
                    { key: "title",    label: "Opportunity" },
                    { key: "type",     label: "Type" },
                    { key: "site",     label: "Site" },
                    { key: "value",    label: "Est. Value" },
                    { key: "priority", label: "Priority", render: (v) => statusBadge(v) },
                  ]}
                  rows={filterByRole(OPPORTUNITIES, session.role)}
                />
              </div>
            </>
          )}

          {/* ── REPORT BUILDER ────────────────────────── */}
          {section === "report-builder" && (
            <>
              <div className="page-header">
                <div className="page-greeting">Report Builder</div>
                <div className="page-subtitle">Configure, generate, export, and share reports</div>
              </div>

              <FilterPanel
                filters={filters}
                onChange={(k, v) => setFilters((p) => ({ ...p, [k]: v }))}
                onApply={loadData}
              />

              {/* ── Section selector + Output mode ── */}
              <div className="grid-2">
                <div className="card">
                  <div className="card-title" style={{ marginBottom: 14 }}>Report Sections</div>
                  <div className="section-selector">
                    {SECTION_CHIPS.map((s) => (
                      <div key={s} className={`section-chip ${selectedSections.includes(s) ? "selected" : ""}`} onClick={() => toggleSection(s)}>{s}</div>
                    ))}
                  </div>
                </div>
                <div className="card">
                  <div className="card-title" style={{ marginBottom: 14 }}>Output Mode</div>
                  <div className="button-row">
                    {["summary", "detailed"].map((m) => (
                      <button key={m} className={outputMode === m ? "btn-primary" : "btn-secondary"} onClick={() => setOutputMode(m)}>
                        {m.charAt(0).toUpperCase() + m.slice(1)}
                      </button>
                    ))}
                  </div>
                  <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 10 }}>
                    {outputMode === "summary" ? "Key metrics only — ideal for executives" : "Full data with all records — for field teams"}
                  </p>
                </div>
              </div>

              {/* ── Chart type selector ── */}
              <div className="card">
                <div className="card-header">
                  <div><div className="card-title">Chart Style</div><div className="card-subtitle">Applies to preview, permalink, and downloaded reports</div></div>
                  <div className="button-row">
                    {[
                      { key: "bar",     icon: "▊", label: "Bar" },
                      { key: "line",    icon: "〰", label: "Line" },
                      { key: "pie",     icon: "◕", label: "Pie" },
                      { key: "heatmap", icon: "⬛", label: "Heatmap" },
                    ].map(({ key, icon, label }) => (
                      <button
                        key={key}
                        className={reportChartType === key ? "btn-primary btn-sm" : "btn-secondary btn-sm"}
                        onClick={() => setReportChartType(key)}
                        title={label}
                      >
                        {icon} {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Live Report Preview ── */}
              {(() => {
                // apply contract/region filter to local mock data
                const contractFilter = filters.contract;
                const regionFilter = filters.region;
                const filteredContracts = filterByRole(CONTRACTS, session.role).filter(c =>
                  (!contractFilter || c.id === contractFilter) &&
                  (!regionFilter || c.region === regionFilter)
                );
                const contractIds = filteredContracts.map(c => c.id);
                const filteredAssets = filterByRole(ASSETS, session.role).filter(a =>
                  (!contractFilter || filteredContracts.some(c => c.site === a.site))
                );
                const filteredInvoices = filterByRole(INVOICES, session.role).filter(i =>
                  (!contractFilter || contractIds.includes(i.contract))
                );
                const filteredOpps = filterByRole(OPPORTUNITIES, session.role);
                const filteredRows = rows.filter(r =>
                  (!regionFilter || r.region === regionFilter) &&
                  (!contractFilter || filteredContracts.some(c => c.site === r.site))
                );
                const activeRows = filteredRows.length ? filteredRows : rows;

                return (
                  <>
                    <div style={{ borderBottom: "2px solid var(--hw-red)", padding: "0 0 10px 0", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontWeight: 700, color: "var(--hw-red)", fontSize: 15 }}>📋 LIVE REPORT PREVIEW</span>
                      <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                        {contractFilter ? `Contract ${contractFilter}` : "All Contracts"} 
                        {regionFilter ? ` · Region: ${regionFilter}` : ""} 
                        · {outputMode === "summary" ? "Summary view" : "Detailed view"}
                        · {activeRows.length} records
                      </span>
                    </div>

                    {/* KPIs section */}
                    {selectedSections.includes("KPIs") && (
                      <div style={{ marginBottom: 20 }}>
                        <div className="card-title" style={{ marginBottom: 12 }}>Key Performance Indicators</div>
                        <div className="kpi-grid">
                          <KPICard label="Mean Time To Repair"  value={kpiSummary.MTTR ?? "--"}              unit="hrs" color=""       trend="down" change={8}   source="SMS" />
                          <KPICard label="System Uptime"        value={kpiSummary.UPTIME ?? "--"}            unit="%"   color="green"  trend="up"   change={1.2} source="NEX" />
                          <KPICard label="PM Completion"        value={kpiSummary.PM_COMPLETION ?? "--"}     unit="%"   color="blue"   trend="up"   change={3.5} source="SMS" />
                          <KPICard label="CSAT Score"           value={kpiSummary.CSAT ?? "--"}              unit="/ 5" color="amber"  trend="up"   change={2}   source="SMS" />
                          <KPICard label="Invoice Cycle Time"   value={kpiSummary.INVOICE_CYCLE ?? "--"}     unit="days" color="purple" trend="down" change={5}  source="SAP" />
                          <KPICard label="System Availability"  value={kpiSummary.SYSTEM_AVAILABILITY ?? "--"} unit="%"color="teal"  trend="up"   change={0.8} source="NEX" />
                        </div>
                      </div>
                    )}

                    {/* Chart section */}
                    {selectedSections.includes("KPIs") && (
                      <div className="card" style={{ marginBottom: 20 }}>
                        <div className="card-header">
                          <div><div className="card-title">Performance Chart</div><div className="card-subtitle">KPI values by site — {reportChartType} view</div></div>
                        </div>
                        <ChartWorkspace chartType={reportChartType} rows={chartRows} xKey="site" seriesKeys={["PM_COMPLETION","UPTIME","MTTR"]} />
                      </div>
                    )}

                    {/* Service type breakdown */}
                    {selectedSections.includes("KPIs") && (
                      <div className="card" style={{ marginBottom: 20 }}>
                        <div className="card-header"><div className="card-title">Service Type Breakdown</div></div>
                        <DataTable
                          columns={[
                            { key: "service", label: "Service Type" },
                            { key: "count", label: "Work Orders" },
                            { key: "compliance", label: "Compliance %", render: (v) => <span style={{ fontWeight: 600, color: v >= 90 ? "#10B981" : v >= 80 ? "#F59E0B" : "#EF4444" }}>{v}%</span> },
                            { key: "mttr", label: "Avg MTTR" },
                            { key: "uptime", label: "Avg Uptime" },
                          ]}
                          rows={[
                            { service: "Remote Monitoring",    count: 128, compliance: 99, mttr: "N/A",    uptime: "99.8%" },
                            { service: "Preventive Maintenance", count: 42,  compliance: 93, mttr: "N/A",  uptime: "98.5%" },
                            { service: "Reactive / Break-Fix", count: 17,  compliance: 89, mttr: "4.2 hrs", uptime: "95.1%" },
                          ]}
                        />
                      </div>
                    )}

                    {/* Contracts section */}
                    {selectedSections.includes("Contracts") && (
                      <div className="card" style={{ marginBottom: 20 }}>
                        <div className="card-header"><div className="card-title">Contracts</div><div className="card-subtitle">{filteredContracts.length} contract(s) matching filter</div></div>
                        <DataTable
                          columns={[
                            { key: "id",       label: "Contract #" },
                            { key: "customer", label: "Company" },
                            { key: "region",   label: "Region" },
                            { key: "site",     label: "Site" },
                            { key: "sla",      label: "SLA Tier" },
                            { key: "services", label: "Services" },
                            { key: "expiry",   label: "Expiry" },
                            { key: "status",   label: "Status", render: (v) => statusBadge(v) },
                          ]}
                          rows={outputMode === "summary" ? filteredContracts.slice(0, 3) : filteredContracts}
                        />
                        {outputMode === "detailed" && (
                          <div style={{ marginTop: 14 }}>
                            <div className="card-title" style={{ fontSize: 13, marginBottom: 10 }}>SLA Health by Contract</div>
                            {filteredContracts.map(c => (
                              <div key={c.id} style={{ marginBottom: 10 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>
                                  <span><strong>{c.customer}</strong> — {c.id} ({c.site})</span>
                                  <span style={{ color: "var(--hw-red)", fontWeight: 600 }}>{c.sla}</span>
                                </div>
                                <div className="progress-bar"><div className={`progress-fill ${c.sla === "Platinum" ? "green" : c.sla === "Gold" ? "blue" : "amber"}`} style={{ width: c.sla === "Platinum" ? "100%" : c.sla === "Gold" ? "75%" : "50%" }} /></div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Assets section */}
                    {selectedSections.includes("Assets") && (
                      <div className="card" style={{ marginBottom: 20 }}>
                        <div className="card-header"><div className="card-title">Assets</div><div className="card-subtitle">{filteredAssets.length} asset(s)</div></div>
                        <DataTable
                          columns={[
                            { key: "id",     label: "Asset ID" },
                            { key: "name",   label: "Name" },
                            { key: "site",   label: "Site" },
                            { key: "type",   label: "Type" },
                            { key: "uptime", label: "Uptime" },
                            { key: "lastPM", label: "Last PM" },
                            { key: "status", label: "Status", render: (v) => statusBadge(v) },
                          ]}
                          rows={outputMode === "summary" ? filteredAssets.slice(0, 3) : filteredAssets}
                        />
                      </div>
                    )}

                    {/* Invoices section */}
                    {selectedSections.includes("Invoices") && (
                      <div className="card" style={{ marginBottom: 20 }}>
                        <div className="card-header"><div className="card-title">Invoices</div><div className="card-subtitle">{filteredInvoices.length} invoice(s)</div></div>
                        <DataTable
                          columns={[
                            { key: "id",       label: "Invoice #" },
                            { key: "contract", label: "Contract" },
                            { key: "amount",   label: "Amount" },
                            { key: "date",     label: "Invoice Date" },
                            { key: "due",      label: "Due Date" },
                            { key: "status",   label: "Status", render: (v) => statusBadge(v) },
                          ]}
                          rows={outputMode === "summary" ? filteredInvoices.slice(0, 3) : filteredInvoices}
                        />
                      </div>
                    )}

                    {/* Opportunities section */}
                    {selectedSections.includes("Opportunities") && (
                      <div className="card" style={{ marginBottom: 20 }}>
                        <div className="card-header"><div className="card-title">Opportunities</div></div>
                        <DataTable
                          columns={[
                            { key: "id",       label: "ID" },
                            { key: "title",    label: "Title" },
                            { key: "type",     label: "Type" },
                            { key: "priority", label: "Priority", render: (v) => statusBadge(v) },
                            { key: "value",    label: "Value" },
                            { key: "site",     label: "Site" },
                          ]}
                          rows={outputMode === "summary" ? filteredOpps.slice(0, 3) : filteredOpps}
                        />
                      </div>
                    )}
                  </>
                );
              })()}

              {/* ── Export & Share ── */}
              <div className="card">
                <div className="card-header">
                  <div className="card-title">Export &amp; Share</div>
                </div>
                <div className="button-row" style={{ marginBottom: 12 }}>
                  <button className="btn-primary"   onClick={handleSaveTemplate}>💾 Save Template</button>
                  <button className="btn-secondary" onClick={handleShare}>🔗 Generate Permalink</button>
                  <button className="btn-secondary" onClick={() => handleExport("csv")}>CSV</button>
                  <button className="btn-secondary" onClick={() => handleExport("xlsx")}>Excel</button>
                  <button className="btn-secondary" onClick={() => handleExport("docx")}>Word</button>
                  <button className="btn-secondary" onClick={() => handleExport("pdf")}>PDF</button>
                </div>
                {permalink && (
                  <div>
                    <div className="info-banner success" style={{ marginBottom: 16 }}>
                      ✅ Shareable link: <a href={permalink} target="_blank" rel="noreferrer" style={{ color: "var(--hw-red)", marginLeft: 6 }}>{permalink}</a>
                    </div>
                    {/* Inline permalink report preview */}
                    <div style={{ border: "2px dashed var(--hw-red)", borderRadius: 10, padding: 20 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                        <span style={{ fontWeight: 700, fontSize: 15, color: "var(--hw-red)" }}>🔗 PERMALINK REPORT SNAPSHOT</span>
                        <span style={{ fontSize: 11, color: "var(--text-secondary)", background: "var(--bg-page)", padding: "2px 8px", borderRadius: 12 }}>{new Date().toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" })}</span>
                      </div>
                      <div className="kpi-grid">
                        <KPICard label="Mean Time To Repair"  value={kpiSummary.MTTR ?? "--"}              unit="hrs" color=""       trend="down" change={8}   source="SMS" />
                        <KPICard label="System Uptime"        value={kpiSummary.UPTIME ?? "--"}            unit="%"   color="green"  trend="up"   change={1.2} source="NEX" />
                        <KPICard label="PM Completion"        value={kpiSummary.PM_COMPLETION ?? "--"}     unit="%"   color="blue"   trend="up"   change={3.5} source="SMS" />
                        <KPICard label="CSAT Score"           value={kpiSummary.CSAT ?? "--"}              unit="/ 5" color="amber"  trend="up"   change={2}   source="SMS" />
                      </div>
                      <div style={{ marginTop: 16 }}>
                        <div className="card-title" style={{ marginBottom: 10, fontSize: 13 }}>Performance Chart ({reportChartType})</div>
                        <ChartWorkspace chartType={reportChartType} rows={chartRows} xKey="site" seriesKeys={["PM_COMPLETION","UPTIME","MTTR"]} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── TEMPLATES ─────────────────────────────── */}
          {section === "templates" && (
            <>
              <div className="page-header">
                <div className="page-greeting">Saved Templates</div>
                <div className="page-subtitle">Reuse report configurations across sessions</div>
              </div>
              {templatesSaved.length === 0 && (
                <div className="info-banner info">ℹ️ No templates saved yet. Go to Report Builder and click <strong>Save Template</strong>.</div>
              )}
              {templatesSaved.map((t) => (
                <div className="card" key={t.id} style={{ borderLeft: "4px solid var(--hw-red)" }}>
                  <div className="card-header">
                    <div><div className="card-title">{t.name}</div><div className="card-subtitle">ID: {t.id} • Tenant: {t.tenant_id}</div></div>
                    <button className="btn-outline btn-sm" onClick={() => { setFilters(t.payload?.filters || filters); setSection("report-builder"); }}>Load</button>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* ── AI INSIGHTS (PHASE 2) ─────────────────── */}
          {section === "ai-insights" && (
            <>
              <div className="page-header">
                <div className="page-greeting">AI Insights — Phase 2</div>
                <div className="page-subtitle">Intelligent contextualization roadmap</div>
              </div>
              <div className="info-banner info">🧪 These features are planned for Increment 2+ and will be activated via feature flags.</div>
              <div className="card">
                <div className="card-title" style={{ marginBottom: 16 }}>AI Contextualization Features</div>
                {[
                  { icon: "⚠️", color: "amber",  title: "Risk Profiling", desc: "Score contracts and assets by risk exposure using service history, SLA compliance, and asset age.", eta: "Sprint 3" },
                  { icon: "🔍", color: "red",    title: "Bad Actor Detection", desc: "Identify assets with repeat failures driving disproportionate maintenance costs.", eta: "Sprint 3" },
                  { icon: "📉", color: "blue",   title: "Obsolescence Alerts", desc: "Flag assets approaching end-of-life based on manufacture date, part availability, and upgrade cycles.", eta: "Sprint 3" },
                  { icon: "✅", color: "green",  title: "HITL Checkpoints", desc: "Human-in-the-loop approval gates for AI-generated recommendations before delivery to customer.", eta: "Sprint 4" },
                  { icon: "📝", color: "purple", title: "Executive Summaries", desc: "Auto-generated, audience-tailored narrative summaries with key takeaways and next actions.", eta: "Sprint 4" },
                  { icon: "💡", color: "blue",   title: "Cost Reduction Opportunities", desc: "AI-identified opportunities to reduce operational spend while maintaining service levels.", eta: "Sprint 4" },
                ].map((f) => (
                  <div className="phase2-item" key={f.title}>
                    <div className={`phase2-icon-wrap ${f.color}`}>{f.icon}</div>
                    <div>
                      <div className="phase2-title">{f.title}</div>
                      <div className="phase2-desc">{f.desc}</div>
                      <div className="phase2-eta">Planned: {f.eta}</div>
                    </div>
                    <span className="badge badge-gray" style={{ marginLeft: "auto", flexShrink: 0 }}>Planned</span>
                  </div>
                ))}
              </div>
            </>
          )}

        </main>

        <footer className="hw-footer">
          <span>© 2026 Honeywell International Inc. — World Class Customer Reports</span>
          <span>v1.0 Increment 1 &nbsp;|&nbsp; Powered by Flask + React</span>
        </footer>
      </div>
    </>
  );
}
