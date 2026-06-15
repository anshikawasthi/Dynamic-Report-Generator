import hashlib
import json
from dataclasses import asdict

from flask import Blueprint, current_app, g, jsonify, request, send_file
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from app.auth import issue_token, require_roles
from app.extensions import cache
from app.services.export_service import ExportService
from app.services.feature_flags import enabled
from app.services.kpi_service import KPIService
from app.services.metadata_registry import MetadataRegistryService
from app.services.report_service import ReportService
from app.services.unified_schema import to_universal_response

api_bp = Blueprint("api", __name__)
kpi_service = KPIService()
metadata_service = MetadataRegistryService()


@api_bp.post("/auth/login")
def login():
    payload = request.get_json(silent=True) or {}
    username = payload.get("username")
    user = current_app.store.users.get(username)
    if not user:
        return jsonify({"error": "invalid_user"}), 401

    token = issue_token(username=user.username, tenant_id=user.tenant_id, role=user.role)
    return jsonify({"accessToken": token, "role": user.role, "tenantId": user.tenant_id})


@api_bp.get("/kpis/catalog")
@jwt_required()
def catalog():
    query = request.args.get("q", "")
    return jsonify({"data": kpi_service.search_catalog(query)})


@api_bp.get("/metadata/registry")
@jwt_required()
def metadata_registry():
    return jsonify(metadata_service.get_registry())


@api_bp.get("/data/unified")
@jwt_required()
@cache.cached(timeout=120, query_string=True)
def unified_data():
    tenant_id = get_jwt().get("tenant_id")
    filters = {
        "tenant_id": tenant_id,
        "startDate": request.args.get("startDate"),
        "endDate": request.args.get("endDate"),
        "region": request.args.get("region"),
        "site": request.args.get("site"),
        "contract": request.args.get("contract"),
        "language": request.args.get("language"),
        "rangePreset": request.args.get("rangePreset"),
    }
    entity = request.args.get("entity", "kpis")

    records = kpi_service.fetch_unified(entity=entity, filters=filters, tenant_id=tenant_id)
    return jsonify(to_universal_response(records, filters, advanced_charting=enabled("ENABLE_ADVANCED_CHARTS")))


@api_bp.post("/reports/generate")
@jwt_required()
def generate_report():
    payload = request.get_json(silent=True) or {}
    mode = payload.get("outputMode", "summary")
    records = payload.get("data", [])
    if mode == "summary":
        reduced = []
        for row in records:
            reduced.append(
                {
                    "kpi_code": row.get("kpi_code"),
                    "value": row.get("value"),
                    "date": row.get("date"),
                    "contract_id": row.get("contract_id"),
                }
            )
        records = reduced

    return jsonify({"outputMode": mode, "sections": payload.get("sections", []), "data": records})


@api_bp.post("/reports/templates")
@require_roles(["CustomerSuccess", "FieldService", "SiteDirector"])
def save_template():
    identity = g.identity
    payload = request.get_json(silent=True) or {}
    service = ReportService(current_app.store)
    template = service.create_template(
        tenant_id=identity["tenant_id"],
        user_id=identity["username"],
        name=payload.get("name", "Untitled Template"),
        payload=payload,
    )
    return jsonify({"template": asdict(template)})


@api_bp.get("/reports/templates")
@jwt_required()
def list_templates():
    tenant_id = get_jwt().get("tenant_id")
    service = ReportService(current_app.store)
    templates = [asdict(x) for x in service.list_templates(tenant_id)]
    return jsonify({"templates": templates})


@api_bp.post("/reports/share")
@jwt_required()
def share_report():
    # Legacy endpoint kept for compatibility; new flow encodes data in URL
    payload = request.get_json(silent=True) or {}
    report_payload = json.dumps(payload, sort_keys=True)
    permalink = hashlib.sha256(report_payload.encode("utf-8")).hexdigest()[:16]
    current_app.shared_reports[permalink] = payload
    return jsonify({"permalink": f"/api/reports/shared/{permalink}"})


@api_bp.get("/reports/shared/snapshot")
def get_shared_snapshot():
    """Self-contained snapshot: all data encoded in ?d= base64 param."""
    import base64
    d = request.args.get("d", "")
    if not d:
        return "<h2 style='font-family:sans-serif;color:#CC0000;padding:40px'>No report data in URL.</h2>", 400
    try:
        decoded = base64.b64decode(d.encode()).decode("utf-8")
        snapshot = json.loads(decoded)
    except Exception:
        return "<h2 style='font-family:sans-serif;color:#CC0000;padding:40px'>Invalid report data.</h2>", 400

    return _render_html_report(snapshot)


@api_bp.get("/reports/shared/<permalink>")
def get_shared_report(permalink):
    """Legacy: server-side stored report (may be empty on stateless deployments)."""
    report = current_app.shared_reports.get(permalink)
    if not report:
        return "<h2 style='font-family:sans-serif;color:#CC0000;padding:40px'>Report not found or expired. Use the Generate Permalink button again.</h2>", 404
    return _render_html_report(report)


def _render_html_report(snapshot):
    """Render a full Honeywell-branded HTML report with SVG charts from snapshot dict."""
    from flask import Response

    data        = snapshot.get("data", [])
    filters     = snapshot.get("filters", {})
    kpi_summary = snapshot.get("kpiSummary", {})
    chart_rows  = snapshot.get("chartRows", [])
    chart_type  = snapshot.get("chartType", "bar")
    sections    = snapshot.get("sections", [])
    output_mode = snapshot.get("outputMode", "summary")
    role        = snapshot.get("role", "")
    generated_at = snapshot.get("generatedAt", "")[:19].replace("T", " ") + " UTC"

    # ── KPI averages from raw data ───────────────────────────────────────────
    kpi_totals, kpi_counts = {}, {}
    for rec in data:
        c = rec.get("kpi_code", "")
        v = float(rec.get("value", 0))
        kpi_totals[c] = kpi_totals.get(c, 0) + v
        kpi_counts[c] = kpi_counts.get(c, 0) + 1
    kpi_avgs = {k: round(kpi_totals[k] / kpi_counts[k], 2) for k in kpi_totals}
    # Merge in frontend-computed summary too
    for k, v in kpi_summary.items():
        if k not in kpi_avgs and v is not None:
            kpi_avgs[k] = v

    KPI_META = {
        "MTTR":                 ("Mean Time to Repair",  "hrs",  "#CC0000"),
        "PM_COMPLETION":        ("PM Completion",        "%",    "#1D6FA4"),
        "UPTIME":               ("System Uptime",        "%",    "#16A34A"),
        "CSAT":                 ("CSAT Score",           "/ 5",  "#D97706"),
        "INVOICE_CYCLE":        ("Invoice Cycle",        "days", "#7C3AED"),
        "SYSTEM_AVAILABILITY":  ("System Availability",  "%",    "#0891B2"),
        "COMPLIANCE":           ("SLA Compliance",       "%",    "#059669"),
        "CONTRACT_COVERAGE":    ("Contract Coverage",    "%",    "#DC2626"),
        "REACTIVE_MAINTENANCE": ("Reactive Maintenance", "%",    "#F97316"),
        "BREAK_FIX":            ("Break-Fix Rate",       "%",    "#EC4899"),
    }

    def kpi_card_html(code):
        if code not in kpi_avgs:
            return ""
        label, unit, color = KPI_META.get(code, (code, "", "#888"))
        return f"""<div class="kpi-card" style="border-top:4px solid {color}">
          <div class="kpi-label">{label}</div>
          <div class="kpi-value">{kpi_avgs[code]}</div>
          <div class="kpi-unit">{unit}</div>
        </div>"""

    # ── SVG Bar chart ────────────────────────────────────────────────────────
    CHART_COLORS = ["#CC0000","#1D6FA4","#16A34A","#D97706","#7C3AED","#0891B2"]

    def svg_bar(rows, series_keys, x_key, width=800, height=260):
        if not rows or not series_keys:
            return ""
        n_groups = len(rows)
        n_series = len(series_keys)
        margin   = {"top": 20, "right": 20, "bottom": 50, "left": 50}
        inner_w  = width - margin["left"] - margin["right"]
        inner_h  = height - margin["top"] - margin["bottom"]
        all_vals = [float(r.get(k, 0)) for r in rows for k in series_keys]
        max_val  = max(all_vals) if all_vals else 1
        group_w  = inner_w / n_groups
        bar_w    = (group_w * 0.8) / n_series

        bars = ""
        for gi, row in enumerate(rows):
            gx = margin["left"] + gi * group_w + group_w * 0.1
            label = str(row.get(x_key, ""))[:10]
            bars += f'<text x="{gx + group_w*0.4:.1f}" y="{height - margin["bottom"] + 14}" text-anchor="middle" font-size="9" fill="#6B7280">{label}</text>'
            for si, key in enumerate(series_keys):
                val   = float(row.get(key, 0))
                bh    = (val / max_val) * inner_h if max_val else 0
                bx    = gx + si * bar_w
                by    = margin["top"] + inner_h - bh
                color = CHART_COLORS[si % len(CHART_COLORS)]
                bars += f'<rect x="{bx:.1f}" y="{by:.1f}" width="{bar_w-1:.1f}" height="{bh:.1f}" fill="{color}" rx="2"/>'

        # Y axis ticks
        ticks = ""
        for i in range(5):
            y = margin["top"] + inner_h * (1 - i / 4)
            v = round(max_val * i / 4, 1)
            ticks += f'<line x1="{margin["left"]}" y1="{y:.1f}" x2="{width-margin["right"]}" y2="{y:.1f}" stroke="#F3F4F6" stroke-width="1"/>'
            ticks += f'<text x="{margin["left"]-4}" y="{y+3:.1f}" text-anchor="end" font-size="9" fill="#9CA3AF">{v}</text>'

        # Legend
        legend = ""
        for si, key in enumerate(series_keys):
            lx = margin["left"] + si * 130
            legend += f'<rect x="{lx}" y="{height-16}" width="10" height="10" fill="{CHART_COLORS[si%len(CHART_COLORS)]}" rx="2"/>'
            legend += f'<text x="{lx+14}" y="{height-7}" font-size="10" fill="#374151">{key}</text>'

        return f'<svg viewBox="0 0 {width} {height}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">{ticks}{bars}{legend}</svg>'

    # ── SVG Pie chart ────────────────────────────────────────────────────────
    import math

    def svg_pie(slices, width=420, height=300):
        """slices: list of (label, value, color)"""
        if not slices:
            return ""
        total = sum(v for _, v, _ in slices)
        if total == 0:
            return ""
        cx, cy, r = width * 0.38, height / 2, min(width, height) * 0.38
        angle = -math.pi / 2
        paths = ""
        legend = ""
        for i, (label, value, color) in enumerate(slices):
            sweep = 2 * math.pi * value / total
            x1 = cx + r * math.cos(angle)
            y1 = cy + r * math.sin(angle)
            angle += sweep
            x2 = cx + r * math.cos(angle)
            y2 = cy + r * math.sin(angle)
            large = 1 if sweep > math.pi else 0
            pct = round(value / total * 100, 1)
            paths += f'<path d="M{cx:.1f},{cy:.1f} L{x1:.1f},{y1:.1f} A{r:.1f},{r:.1f} 0 {large},1 {x2:.1f},{y2:.1f} Z" fill="{color}"><title>{label}: {value} ({pct}%)</title></path>'
            # mid-angle label
            mid = angle - sweep / 2
            lx = cx + r * 0.65 * math.cos(mid)
            ly = cy + r * 0.65 * math.sin(mid)
            if pct > 5:
                paths += f'<text x="{lx:.1f}" y="{ly:.1f}" text-anchor="middle" font-size="9" fill="#fff" font-weight="bold">{pct}%</text>'
            # legend
            ly2 = 20 + i * 22
            legend += f'<rect x="{width*0.76:.0f}" y="{ly2-10}" width="12" height="12" fill="{color}" rx="2"/>'
            legend += f'<text x="{width*0.76+16:.0f}" y="{ly2:.0f}" font-size="10" fill="#374151">{label}: {value}</text>'

        return f'<svg viewBox="0 0 {width} {height}" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:{width}px"><circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r:.1f}" fill="#F9FAFB"/>{paths}{legend}</svg>'

    # ── build KPI pie slices ─────────────────────────────────────────────────
    pie_slices = [
        (KPI_META[k][0], kpi_avgs[k], KPI_META[k][2])
        for k in ["PM_COMPLETION", "REACTIVE_MAINTENANCE", "SYSTEM_AVAILABILITY", "COMPLIANCE"]
        if k in kpi_avgs
    ]

    # ── bar chart rows ───────────────────────────────────────────────────────
    bar_series = ["PM_COMPLETION", "UPTIME", "MTTR"]
    bar_rows   = chart_rows if chart_rows else []

    # ── data table rows ──────────────────────────────────────────────────────
    def data_table_html(recs, limit=60):
        cols = ["site", "kpi_code", "value", "unit", "contract_id", "region", "source", "service_type"]
        headers = "".join(f"<th>{c.replace('_',' ').title()}</th>" for c in cols)
        rows_html = ""
        for r in recs[:limit]:
            rows_html += "<tr>" + "".join(f"<td>{r.get(c,'')}</td>" for c in cols) + "</tr>"
        return f"<table><thead><tr>{headers}</tr></thead><tbody>{rows_html}</tbody></table>"

    # ── site coverage table ──────────────────────────────────────────────────
    seen_sites = {}
    for r in data:
        s = r.get("site", "")
        if s and s not in seen_sites:
            seen_sites[s] = r
    site_rows_html = "".join(
        f"<tr><td><b>{r.get('site','')}</b></td><td>{r.get('region','')}</td><td>{r.get('contract_id','')}</td><td>{r.get('source','')}</td><td>{r.get('service_type','')}</td><td>{r.get('technician','')}</td></tr>"
        for r in seen_sites.values()
    )

    kpi_cards_html = "".join(kpi_card_html(k) for k in KPI_META if k in kpi_avgs)
    bar_svg        = svg_bar(bar_rows, bar_series, "site") if bar_rows else ""
    pie_svg        = svg_pie(pie_slices)
    sites_list     = ", ".join(sorted(seen_sites.keys())) or "All"
    regions_list   = ", ".join(sorted(set(r.get("region","") for r in data if r.get("region")))) or "All"

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Honeywell — Customer Report</title>
  <style>
    *{{box-sizing:border-box;margin:0;padding:0}}
    body{{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#F0F2F5;color:#1F2937}}
    .header{{background:#CC0000;color:#fff;padding:18px 36px;display:flex;align-items:center;gap:14px}}
    .hw{{width:42px;height:42px;background:#fff;color:#CC0000;border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:22px;flex-shrink:0}}
    .brand{{font-size:20px;font-weight:700}}.brand-sub{{font-size:12px;opacity:.85}}
    .meta{{background:#1F2937;color:#9CA3AF;padding:9px 36px;font-size:12px;display:flex;gap:20px;flex-wrap:wrap}}
    .meta b{{color:#fff}}
    .wrap{{max-width:1100px;margin:0 auto;padding:28px 20px 80px}}
    h2{{font-size:15px;font-weight:700;margin:28px 0 12px;border-left:4px solid #CC0000;padding-left:10px;color:#1F2937}}
    .kpi-grid{{display:flex;flex-wrap:wrap;gap:14px;margin-bottom:4px}}
    .kpi-card{{background:#fff;border-radius:10px;padding:18px 22px;min-width:155px;box-shadow:0 2px 8px rgba(0,0,0,.07)}}
    .kpi-label{{font-size:10px;color:#6B7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px}}
    .kpi-value{{font-size:26px;font-weight:700;color:#1F2937}}
    .kpi-unit{{font-size:11px;color:#9CA3AF;margin-top:3px}}
    .charts{{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:4px}}
    @media(max-width:700px){{.charts{{grid-template-columns:1fr}}}}
    .chart-box{{background:#fff;border-radius:10px;padding:18px;box-shadow:0 2px 8px rgba(0,0,0,.07)}}
    .chart-title{{font-size:12px;font-weight:700;color:#374151;margin-bottom:12px}}
    table{{width:100%;border-collapse:collapse;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.07)}}
    th{{background:#F9FAFB;padding:9px 11px;font-size:10px;text-transform:uppercase;letter-spacing:.4px;color:#6B7280;text-align:left;border-bottom:2px solid #E5E7EB}}
    td{{padding:7px 11px;font-size:12px;border-bottom:1px solid #F9FAFB}}
    tr:last-child td{{border-bottom:none}}
    tr:hover td{{background:#FAFAFA}}
    .footer{{text-align:center;padding:22px;font-size:11px;color:#9CA3AF;border-top:1px solid #E5E7EB;margin-top:36px}}
    @media print{{body{{background:#fff}}.meta{{background:#333}}}}
  </style>
</head>
<body>
  <div class="header">
    <div class="hw">H</div>
    <div><div class="brand">Honeywell</div><div class="brand-sub">World Class Customer Reports — Shared Snapshot</div></div>
  </div>
  <div class="meta">
    <span><b>Generated:</b> {generated_at}</span>
    <span><b>Records:</b> {len(data)}</span>
    <span><b>Regions:</b> {regions_list}</span>
    <span><b>Contract:</b> {filters.get('contract') or 'All'}</span>
    <span><b>Range:</b> {filters.get('rangePreset','All')}</span>
    <span><b>Role:</b> {role}</span>
    <span><b>Sections:</b> {', '.join(sections) if sections else 'All'}</span>
  </div>
  <div class="wrap">

    <h2>Key Performance Indicators</h2>
    <div class="kpi-grid">{kpi_cards_html}</div>

    <h2>Performance Charts</h2>
    <div class="charts">
      <div class="chart-box">
        <div class="chart-title">&#9646; KPI by Site (Bar Chart)</div>
        {bar_svg if bar_svg else '<p style="color:#9CA3AF;font-size:12px">No site-level data available.</p>'}
      </div>
      <div class="chart-box">
        <div class="chart-title">&#9679; Compliance Mix (Pie Chart)</div>
        {pie_svg if pie_svg else '<p style="color:#9CA3AF;font-size:12px">No compliance data available.</p>'}
      </div>
    </div>

    <h2>Site Coverage ({len(seen_sites)} sites)</h2>
    <table>
      <thead><tr><th>Site</th><th>Region</th><th>Contract</th><th>Source</th><th>Service Type</th><th>Technician</th></tr></thead>
      <tbody>{site_rows_html}</tbody>
    </table>

    <h2>KPI Data ({len(data)} records)</h2>
    {data_table_html(data)}

    <div class="footer">
      Honeywell Building Solutions &middot; World Class Customer Reports &middot; Confidential &middot; {generated_at}
      <br><span style="font-size:10px;color:#D1D5DB">This link contains a self-contained report snapshot.</span>
    </div>
  </div>
</body>
</html>"""

    return Response(html, mimetype="text/html")

    data = report.get("data", [])
    filters = report.get("filters", {})
    generated_at = __import__("datetime").datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")

    # Aggregate KPI averages from data
    kpi_totals = {}
    kpi_counts = {}
    for rec in data:
        code = rec.get("kpi_code", "")
        val  = rec.get("value", 0)
        kpi_totals[code] = kpi_totals.get(code, 0) + val
        kpi_counts[code] = kpi_counts.get(code, 0) + 1
    kpi_avgs = {k: round(kpi_totals[k] / kpi_counts[k], 2) for k in kpi_totals}

    def kpi_card(label, value, unit, color):
        return f"""
        <div style="background:#fff;border-radius:10px;padding:20px 24px;min-width:160px;box-shadow:0 2px 8px rgba(0,0,0,.08);border-top:4px solid {color}">
          <div style="font-size:11px;color:#6B7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">{label}</div>
          <div style="font-size:28px;font-weight:700;color:#1F2937">{value}</div>
          <div style="font-size:12px;color:#9CA3AF;margin-top:4px">{unit}</div>
        </div>"""

    def table_rows(recs, limit=20):
        if not recs:
            return "<tr><td colspan='8' style='text-align:center;color:#9CA3AF;padding:20px'>No records</td></tr>"
        cols = ["site", "kpi_code", "value", "unit", "contract_id", "region", "source", "service_type"]
        rows_html = ""
        for r in recs[:limit]:
            rows_html += "<tr>" + "".join(f"<td style='padding:8px 12px;border-bottom:1px solid #F3F4F6;font-size:12px'>{r.get(c,'')}</td>" for c in cols) + "</tr>"
        return rows_html

    # Build KPI cards HTML
    kpi_section = ""
    kpi_display = {
        "MTTR": ("Mean Time to Repair", "hrs", "#CC0000"),
        "PM_COMPLETION": ("PM Completion", "%", "#1D6FA4"),
        "UPTIME": ("System Uptime", "%", "#16A34A"),
        "CSAT": ("CSAT Score", "/5", "#D97706"),
        "INVOICE_CYCLE": ("Invoice Cycle", "days", "#7C3AED"),
        "SYSTEM_AVAILABILITY": ("System Availability", "%", "#0891B2"),
        "COMPLIANCE": ("SLA Compliance", "%", "#059669"),
        "CONTRACT_COVERAGE": ("Contract Coverage", "%", "#DC2626"),
    }
    for code, (label, unit, color) in kpi_display.items():
        if code in kpi_avgs:
            kpi_section += kpi_card(label, kpi_avgs[code], unit, color)

    # Unique sites in data
    sites = sorted(set(r.get("site", "") for r in data if r.get("site")))
    regions = sorted(set(r.get("region", "") for r in data if r.get("region")))

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Honeywell — Report Snapshot</title>
  <style>
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #F0F2F5; color: #1F2937; }}
    .header {{ background: #CC0000; color: #fff; padding: 20px 40px; display: flex; align-items: center; gap: 16px; }}
    .hw-badge {{ width: 40px; height: 40px; background: #fff; color: #CC0000; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 20px; }}
    .brand {{ font-size: 20px; font-weight: 700; }}
    .brand-sub {{ font-size: 12px; opacity: .8; }}
    .meta-bar {{ background: #1F2937; color: #D1D5DB; padding: 10px 40px; font-size: 12px; display: flex; gap: 24px; flex-wrap: wrap; }}
    .meta-bar span b {{ color: #fff; }}
    .container {{ max-width: 1100px; margin: 0 auto; padding: 32px 24px 80px; }}
    h2 {{ font-size: 16px; font-weight: 700; color: #1F2937; margin: 32px 0 14px; border-left: 4px solid #CC0000; padding-left: 12px; }}
    .kpi-grid {{ display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 8px; }}
    table {{ width: 100%; border-collapse: collapse; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,.07); }}
    th {{ background: #F9FAFB; padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: .5px; color: #6B7280; text-align: left; border-bottom: 2px solid #E5E7EB; }}
    td {{ padding: 8px 12px; font-size: 12px; border-bottom: 1px solid #F3F4F6; }}
    tr:last-child td {{ border-bottom: none; }}
    .badge {{ display:inline-block; padding:2px 8px; border-radius:12px; font-size:11px; font-weight:600; }}
    .badge-red {{ background:#FEE2E2; color:#991B1B; }}
    .badge-green {{ background:#D1FAE5; color:#065F46; }}
    .badge-blue {{ background:#DBEAFE; color:#1E40AF; }}
    .footer {{ text-align: center; padding: 24px; font-size: 11px; color: #9CA3AF; border-top: 1px solid #E5E7EB; margin-top: 40px; }}
  </style>
</head>
<body>
  <div class="header">
    <div class="hw-badge">H</div>
    <div>
      <div class="brand">Honeywell</div>
      <div class="brand-sub">World Class Customer Reports — Shared Snapshot</div>
    </div>
  </div>
  <div class="meta-bar">
    <span><b>Generated:</b> {generated_at}</span>
    <span><b>Records:</b> {len(data)}</span>
    <span><b>Sites:</b> {', '.join(sites) or 'All'}</span>
    <span><b>Regions:</b> {', '.join(regions) or 'All'}</span>
    <span><b>Date Range:</b> {filters.get('rangePreset', 'All')}</span>
    <span><b>Contract:</b> {filters.get('contract') or 'All'}</span>
  </div>
  <div class="container">
    <h2>Key Performance Indicators</h2>
    <div class="kpi-grid">{kpi_section}</div>

    <h2>Site Coverage ({len(sites)} sites)</h2>
    <table>
      <thead><tr><th>Site</th><th>Region</th><th>Contract</th><th>Source</th><th>Service Type</th><th>Technician</th></tr></thead>
      <tbody>
        {''.join(f"<tr><td><b>{r.get('site','')}</b></td><td>{r.get('region','')}</td><td>{r.get('contract_id','')}</td><td>{r.get('source','')}</td><td>{r.get('service_type','N/A')}</td><td>{r.get('technician','N/A')}</td></tr>"
          for r in {rec['site']: rec for rec in data}.values())}
      </tbody>
    </table>

    <h2>KPI Data ({len(data)} records)</h2>
    <table>
      <thead><tr><th>Site</th><th>KPI</th><th>Value</th><th>Unit</th><th>Contract</th><th>Region</th><th>Source</th><th>Service Type</th></tr></thead>
      <tbody>{table_rows(data, 50)}</tbody>
    </table>

    <div class="footer">
      Honeywell Building Solutions · World Class Customer Reports · Confidential · {generated_at}
    </div>
  </div>
</body>
</html>"""

    from flask import Response
    return Response(html, mimetype="text/html")


@api_bp.post("/reports/schedules")
@require_roles(["CustomerSuccess", "SiteDirector"])
def schedule_report():
    identity = g.identity
    payload = request.get_json(silent=True) or {}
    service = ReportService(current_app.store)
    schedule = service.create_schedule(
        tenant_id=identity["tenant_id"],
        template_id=payload["templateId"],
        recipients=payload.get("recipients", []),
        cron=payload.get("cron", "default"),
    )
    current_app.scheduler_service.schedule_email_delivery(schedule.id, schedule.recipients, schedule.cron)
    return jsonify({"schedule": asdict(schedule)})


@api_bp.post("/reports/export/<fmt>")
@jwt_required()
def export_report(fmt):
    payload = request.get_json(silent=True) or {}
    records = payload.get("data", [])

    if fmt in {"pdf", "docx", "xlsx"} and not enabled("ENABLE_ADVANCED_EXPORTS"):
        return jsonify({"error": "feature_disabled"}), 403

    exporters = {
        "csv": (ExportService.to_csv, "text/csv", "report.csv"),
        "xlsx": (ExportService.to_excel, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "report.xlsx"),
        "docx": (ExportService.to_word, "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "report.docx"),
        "pdf": (ExportService.to_pdf, "application/pdf", "report.pdf"),
    }
    if fmt not in exporters:
        return jsonify({"error": "unsupported_format"}), 400

    fn, mimetype, filename = exporters[fmt]
    binary = fn(records)
    
    # Return binary response directly for serverless compatibility
    from flask import Response
    response = Response(binary, mimetype=mimetype)
    response.headers["Content-Disposition"] = f"attachment; filename={filename}"
    return response


@api_bp.get("/phase2/ai-context")
@require_roles(["CustomerSuccess", "SiteDirector"])
def ai_context_placeholder():
    return jsonify(
        {
            "phase": 2,
            "riskProfiling": "planned",
            "badActorDetection": "planned",
            "obsolescenceAlerts": "planned",
            "hitlCheckpoints": "planned",
            "executiveSummary": "planned",
        }
    )
