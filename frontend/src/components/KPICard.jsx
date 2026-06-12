function KPICard({ label, value, unit = "", trend = null, change = null, color = "", source = "" }) {
  const trendDir = trend === "up" ? "▲" : trend === "down" ? "▼" : null;
  return (
    <div className={`kpi-card ${color}`}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">
        {value}
        {unit && <span className="kpi-unit"> {unit}</span>}
      </div>
      {trendDir && change !== null && (
        <div className={`kpi-trend ${trend}`}>
          {trendDir} {Math.abs(change)}% vs prior period
        </div>
      )}
      {source && <div className="kpi-source">Source: {source}</div>}
    </div>
  );
}

export default KPICard;
