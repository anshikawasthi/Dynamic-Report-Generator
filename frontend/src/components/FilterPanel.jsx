const RANGE_OPTIONS = [
  { value: "day",        label: "Today" },
  { value: "week",       label: "This Week" },
  { value: "month",      label: "This Month" },
  { value: "quarter",    label: "This Quarter" },
  { value: "ytd",        label: "Year to Date" },
  { value: "rolling13m", label: "Rolling 13 Months" },
];

function FilterPanel({ filters, onChange, onApply }) {
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">Report Filters</div>
          <div className="card-subtitle">Narrow the data by time period, geography, and contract</div>
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
          <label className="filter-label">Site</label>
          <input placeholder="All sites" value={filters.site} onChange={(e) => onChange("site", e.target.value)} />
        </div>

        <div className="filter-group">
          <label className="filter-label">Contract #</label>
          <input placeholder="e.g. C-100" value={filters.contract} onChange={(e) => onChange("contract", e.target.value)} />
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
    </div>
  );
}

export default FilterPanel;
