import {
  Bar, BarChart, CartesianGrid, Cell, Legend,
  Line, LineChart, PieChart, Pie, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

const COLORS = ["#CC0000", "#1D6FA4", "#16A34A", "#D97706", "#7C3AED", "#0891B2"];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 6, padding: "10px 14px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", fontSize: 12 }}>
      <p style={{ fontWeight: 600, marginBottom: 6, color: "#1F2937" }}>{label}</p>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  );
};

function toSeriesRows(rows, seriesKeys, xKey) {
  if (!rows.length) return [];
  if (!seriesKeys?.length) return rows;
  return rows.map((row) => {
    const shaped = { [xKey]: row[xKey] };
    seriesKeys.forEach((key) => {
      shaped[key] = Number(row[key] ?? 0);
    });
    return shaped;
  });
}

function inferSeriesKeys(rows, xKey) {
  if (!rows.length) return [];
  if ("value" in rows[0]) return ["value"];
  return Object.keys(rows[0]).filter((k) => k !== xKey && typeof rows[0][k] === "number");
}

function toPieRows(rows, seriesKeys, xKey) {
  if (!rows.length) return [];
  if ("value" in rows[0]) {
    return rows.map((r) => ({ name: r.kpi_code || r.name || "Value", value: Number(r.value ?? 0) }));
  }
  const keys = seriesKeys?.length ? seriesKeys : inferSeriesKeys(rows, xKey);
  const totals = {};
  keys.forEach((key) => { totals[key] = 0; });
  rows.forEach((r) => {
    keys.forEach((key) => {
      totals[key] += Number(r[key] ?? 0);
    });
  });
  return Object.entries(totals).map(([name, value]) => ({ name, value: +value.toFixed(1) }));
}

function ChartWorkspace({ chartType = "bar", rows = [], xKey = "site", seriesKeys = [] }) {
  if (!rows.length) {
    return (
      <div style={{ textAlign: "center", padding: "30px 0", color: "var(--text-secondary)", fontSize: 13 }}>
        No chart data — apply filters and load data.
      </div>
    );
  }

  const margin = { top: 10, right: 20, left: 0, bottom: 5 };
  const finalSeries = seriesKeys.length ? seriesKeys : inferSeriesKeys(rows, xKey);
  const seriesRows = toSeriesRows(rows, finalSeries, xKey);
  const pieRows = toPieRows(rows, finalSeries, xKey);

  return (
    <div>
      <div className="chart-container tall">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === "bar" ? (
            <BarChart data={seriesRows} margin={margin}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {finalSeries.slice(0, 4).map((key, i) => (
                <Bar key={key} dataKey={key} name={key} fill={COLORS[i]} radius={[3, 3, 0, 0]} />
              ))}
            </BarChart>
          ) : chartType === "pie" ? (
            <PieChart>
              <Pie data={pieRows.slice(0, 8)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} label={({ name, value }) => `${name}: ${value}`}>
                {pieRows.slice(0, 8).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          ) : chartType === "heatmap" ? (
            <HeatmapChart rows={rows} xKey={xKey} seriesKeys={finalSeries} />
          ) : (
            <LineChart data={seriesRows} margin={margin}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {finalSeries.slice(0, 4).map((key, i) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={key}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: COLORS[i % COLORS.length] }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Heatmap (pure CSS grid, no extra lib) ─────────────────────────────────────
function HeatmapChart({ rows, xKey, seriesKeys }) {
  if (!rows.length || !seriesKeys.length) return null;
  const allVals = rows.flatMap(r => seriesKeys.map(k => Number(r[k] ?? 0)));
  const min = Math.min(...allVals);
  const max = Math.max(...allVals) || 1;
  const heatColor = (val) => {
    const pct = (val - min) / (max - min);
    const r = Math.round(204 * pct);
    const g = Math.round(163 * (1 - pct));
    const b = Math.round(60 * (1 - pct));
    return `rgb(${r},${g},${b})`;
  };
  return (
    <div style={{ overflowX: "auto", paddingTop: 8 }}>
      <table style={{ borderCollapse: "collapse", fontSize: 11, width: "100%" }}>
        <thead>
          <tr>
            <th style={{ padding: "4px 8px", textAlign: "left", color: "var(--text-secondary)" }}></th>
            {seriesKeys.map(k => (
              <th key={k} style={{ padding: "4px 8px", textAlign: "center", color: "var(--text-secondary)", fontWeight: 600 }}>{k}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              <td style={{ padding: "4px 8px", fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap" }}>{row[xKey]}</td>
              {seriesKeys.map(k => {
                const val = Number(row[k] ?? 0);
                return (
                  <td key={k} title={`${row[xKey]} / ${k}: ${val}`} style={{ padding: "6px 10px", textAlign: "center", background: heatColor(val), color: "#fff", fontWeight: 600, borderRadius: 4, margin: 2 }}>
                    {val}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ChartWorkspace;
