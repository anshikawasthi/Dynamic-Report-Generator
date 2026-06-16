function KPICard({ label, value, unit = "", trend = null, change = null, color = "", source = "", onClick = null }) {
  const trendDir = trend === "up" ? "▲" : trend === "down" ? "▼" : null;
  return (
    <div
      className={`kpi-card ${color}`}
      onClick={onClick || undefined}
      style={onClick ? { cursor: "pointer" } : undefined}
      title={onClick ? "Click to drill down" : undefined}
    >
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
