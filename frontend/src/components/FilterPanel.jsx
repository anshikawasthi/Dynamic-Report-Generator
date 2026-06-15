const RANGE_OPTIONS = [
  { value: "day",        label: "Today" },
  { value: "week",       label: "This Week" },
  { value: "month",      label: "This Month" },
  { value: "quarter",    label: "This Quarter" },
  { value: "ytd",        label: "Year to Date" },
  { value: "rolling13m", label: "Rolling 13 Months" },
];

// All known contracts with company names for the dropdown
export const CONTRACT_OPTIONS = [
  { id: "",      label: "All Contracts",                   customer: "",          region: "" },
  { id: "C-100", label: "C-100 — Acme Corp (Phoenix, NA)", customer: "Acme Corp", region: "NA",   site: "Phoenix",   sla: "Gold",     service: "Remote + Preventive" },
  { id: "C-101", label: "C-101 — Acme Corp (Chicago, NA)", customer: "Acme Corp", region: "NA",   site: "Chicago",   sla: "Silver",   service: "Reactive + Preventive" },
  { id: "C-200", label: "C-200 — Acme Corp (Bengaluru, APAC)", customer: "Acme Corp", region: "APAC", site: "Bengaluru", sla: "Platinum", service: "Remote + Active + Preventive" },
];

function FilterPanel({ filters, onChange, onApply }) {
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">Report Filters</div>
          <div className="card-subtitle">Narrow the data by time period, company, and contract</div>
        </div>
        <button className="btn-primary" onClick={onApply}>🔄 Apply Filters</button>
      </div>

      <div className="filter-row">
        <div className="filter-group">
          <label className="filter-label">Date Range</label>
          <select value={filters.rangePreset} onChange={(e) => onChange("rangePreset", e.target.value)}>
            {RANGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">Start Date</label>
          <input type="date" value={filters.startDate} onChange={(e) => onChange("startDate", e.target.value)} />
        </div>

        <div className="filter-group">
          <label className="filter-label">End Date</label>
          <input type="date" value={filters.endDate} onChange={(e) => onChange("endDate", e.target.value)} />
        </div>

        <div className="filter-group">
          <label className="filter-label">Region</label>
          <select value={filters.region} onChange={(e) => onChange("region", e.target.value)}>
            <option value="">All Regions</option>
            <option value="NA">North America</option>
            <option value="EU">Europe</option>
            <option value="APAC">APAC</option>
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">Contract</label>
          <select value={filters.contract} onChange={(e) => {
            const opt = CONTRACT_OPTIONS.find(o => o.id === e.target.value);
            onChange("contract", e.target.value);
            if (opt?.region) onChange("region", opt.region);
          }}>
            {CONTRACT_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">Language</label>
          <select value={filters.language} onChange={(e) => onChange("language", e.target.value)}>
            <option value="">All</option>
            <option value="en">English</option>
            <option value="de">Deutsch</option>
            <option value="fr">Français</option>
            <option value="es">Español</option>
          </select>
        </div>
      </div>

      {/* Contract detail card when a specific contract is selected */}
      {filters.contract && (() => {
        const opt = CONTRACT_OPTIONS.find(o => o.id === filters.contract);
        if (!opt?.customer) return null;
        return (
          <div style={{ marginTop: 14, padding: "12px 16px", background: "var(--bg-page)", borderRadius: 8, borderLeft: "4px solid var(--hw-red)", display: "flex", gap: 24, flexWrap: "wrap", fontSize: 13 }}>
            <span><strong>Customer:</strong> {opt.customer}</span>
            <span><strong>Contract:</strong> {opt.id}</span>
            <span><strong>Region:</strong> {opt.region}</span>
            <span><strong>Site:</strong> {opt.site}</span>
            <span><strong>SLA Tier:</strong> {opt.sla}</span>
            <span><strong>Services:</strong> <span style={{ color: "var(--hw-red)", fontWeight: 600 }}>{opt.service}</span></span>
          </div>
        );
      })()}
    </div>
  );
}

export default FilterPanel;
