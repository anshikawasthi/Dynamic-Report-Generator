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
    edit_mode = request.args.get("edit", "").lower() == "true"
    if not d:
        return "<h2 style='font-family:sans-serif;color:#CC0000;padding:40px'>No report data in URL.</h2>", 400
    try:
        padded = d + "=" * (-len(d) % 4)
        decoded = base64.urlsafe_b64decode(padded.encode()).decode("utf-8")
        snapshot = json.loads(decoded)
    except Exception:
        return "<h2 style='font-family:sans-serif;color:#CC0000;padding:40px'>Invalid report data.</h2>", 400

    return _render_html_report(snapshot, edit_mode=edit_mode)


@api_bp.get("/reports/shared/<permalink>")
def get_shared_report(permalink):
    """Legacy: server-side stored report (may be empty on stateless deployments)."""
    edit_mode = request.args.get("edit", "").lower() == "true"
    report = current_app.shared_reports.get(permalink)
    if not report:
        return "<h2 style='font-family:sans-serif;color:#CC0000;padding:40px'>Report not found or expired. Use the Generate Permalink button again.</h2>", 404
    return _render_html_report(report, edit_mode=edit_mode)


def _render_html_report(snapshot, edit_mode=False):
    """Render interactive Honeywell permalink page with chart drilldowns.
    
    Args:
        snapshot: Report data snapshot
        edit_mode: If True, show "EDITING MODE" banner with save/preview controls
    """
    from flask import Response
    import math

    data = snapshot.get("data", [])
    filters = snapshot.get("filters", {})
    kpi_summary = snapshot.get("kpiSummary", {})
    chart_rows = snapshot.get("chartRows", [])
    compliance_rows = snapshot.get("complianceMixRows", [])
    sections = snapshot.get("sections", [])
    role = snapshot.get("role", "")
    total_records = snapshot.get("totalRecords", len(data))
    generated_at = snapshot.get("generatedAt", "")[:19].replace("T", " ") + " UTC"
    
    # Customer portal details
    customer_name = snapshot.get("customerName", "")
    contract_id = snapshot.get("contractId", "")
    customer_email = snapshot.get("customerEmail", "")
    report_type = snapshot.get("reportType", "")
    report_type_display = report_type.replace("_", " ").title() if report_type else ""

    kpi_avgs = {k: v for k, v in kpi_summary.items() if v is not None}
    if not kpi_avgs and data:
        totals, counts = {}, {}
        for rec in data:
            code = rec.get("kpi_code", "")
            value = float(rec.get("value", 0))
            totals[code] = totals.get(code, 0) + value
            counts[code] = counts.get(code, 0) + 1
        kpi_avgs = {k: round(totals[k] / counts[k], 2) for k in totals}

    KPI_META = {
        "MTTR": ("Mean Time to Repair", "hrs", "#CC0000"),
        "PM_COMPLETION": ("PM Completion", "%", "#1D6FA4"),
        "UPTIME": ("System Uptime", "%", "#16A34A"),
        "CSAT": ("CSAT Score", "/ 5", "#D97706"),
        "INVOICE_CYCLE": ("Invoice Cycle", "days", "#7C3AED"),
        "SYSTEM_AVAILABILITY": ("System Availability", "%", "#0891B2"),
        "COMPLIANCE": ("SLA Compliance", "%", "#059669"),
        "CONTRACT_COVERAGE": ("Contract Coverage", "%", "#DC2626"),
        "REACTIVE_MAINTENANCE": ("Reactive Maintenance", "%", "#F97316"),
    }

    metric_defs = [
        ("PM", "PM", "#1D6FA4"),
        ("Reactive", "Reactive", "#CC0000"),
        ("Remote", "Remote", "#0891B2"),
        ("CSAT_X20", "CSAT x20", "#D97706"),
    ]

    def js_safe(value):
        return str(value).replace("\\", "\\\\").replace("'", "\\'")

    def kpi_card_html(code):
        if code not in kpi_avgs:
            return ""
        label, unit, color = KPI_META.get(code, (code, "", "#888"))
        return f"""<div class=\"kpi-card\" style=\"border-top:4px solid {color}\">
            <div class=\"kpi-label\">{label}</div>
            <div class=\"kpi-value\">{kpi_avgs[code]}</div>
            <div class=\"kpi-unit\">{unit}</div>
        </div>"""

    drill_rows = []
    for row in chart_rows:
        site = row.get("site", "")
        pm = float(row.get("PM_COMPLETION", 0) or 0)
        reactive_base = float(row.get("REACTIVE_MAINTENANCE", 0) or 0)
        remote = float(row.get("SYSTEM_AVAILABILITY", 0) or 0)
        csat_base = float(row.get("CSAT", 0) or 0)
        drill_rows.append(
            {
                "site": site,
                "PM": round(pm, 2),
                "Reactive": round(max(0, 100 - reactive_base), 2),
                "Remote": round(remote, 2),
                "CSAT_X20": round(csat_base * 20, 2),
                "PM_COMPLETION": pm,
                "REACTIVE_MAINTENANCE": reactive_base,
                "SYSTEM_AVAILABILITY": remote,
                "CSAT": csat_base,
                "UPTIME": float(row.get("UPTIME", 0) or 0),
                "MTTR": float(row.get("MTTR", 0) or 0),
            }
        )

    pie_slices = []
    if compliance_rows:
        colors = ["#1D6FA4", "#CC0000", "#0891B2", "#D97706"]
        for idx, item in enumerate(compliance_rows):
            name = item.get("name", "")
            value = float(item.get("value", 0) or 0)
            if value <= 0:
                continue
            metric_key = "PM" if name == "PM" else "Reactive" if name == "Reactive" else "Remote" if name == "Remote" else "CSAT_X20"
            pie_slices.append({"label": name, "value": value, "color": colors[idx % len(colors)], "metricKey": metric_key})
    else:
        pie_slices = [
            {"label": "PM", "value": float(kpi_avgs.get("PM_COMPLETION", 0) or 0), "color": "#1D6FA4", "metricKey": "PM"},
            {"label": "Reactive", "value": float(max(0, 100 - float(kpi_avgs.get("REACTIVE_MAINTENANCE", 0) or 0))), "color": "#CC0000", "metricKey": "Reactive"},
            {"label": "Remote", "value": float(kpi_avgs.get("SYSTEM_AVAILABILITY", 0) or 0), "color": "#0891B2", "metricKey": "Remote"},
            {"label": "CSAT x20", "value": float((kpi_avgs.get("CSAT", 0) or 0) * 20), "color": "#D97706", "metricKey": "CSAT_X20"},
        ]
        pie_slices = [x for x in pie_slices if x["value"] > 0]

    def svg_pie(slices, width=420, height=300):
        if not slices:
            return ""
        total = sum(s["value"] for s in slices)
        if total <= 0:
            return ""
        cx, cy, r = width * 0.38, height / 2, min(width, height) * 0.38
        angle = -math.pi / 2
        paths = ""
        legend = ""
        for i, s in enumerate(slices):
            label, value, color, metric_key = s["label"], s["value"], s["color"], s["metricKey"]
            sweep = 2 * math.pi * value / total
            x1 = cx + r * math.cos(angle)
            y1 = cy + r * math.sin(angle)
            angle += sweep
            x2 = cx + r * math.cos(angle)
            y2 = cy + r * math.sin(angle)
            large = 1 if sweep > math.pi else 0
            pct = round(value / total * 100, 1)
            paths += (
                f'<path d="M{cx:.1f},{cy:.1f} L{x1:.1f},{y1:.1f} A{r:.1f},{r:.1f} 0 {large},1 {x2:.1f},{y2:.1f} Z" '
                f'fill="{color}" style="cursor:pointer" onclick="drillByMetric(\'{metric_key}\')" '
                f'title="{label}: {value} ({pct}%)"></path>'
            )
            mid = angle - sweep / 2
            lx = cx + r * 0.65 * math.cos(mid)
            ly = cy + r * 0.65 * math.sin(mid)
            if pct > 4:
                paths += f'<text x="{lx:.1f}" y="{ly:.1f}" text-anchor="middle" font-size="10" fill="#fff" font-weight="bold" style="cursor:pointer" onclick="drillByMetric(\'{metric_key}\')">{pct}%</text>'
            ly2 = 20 + i * 22
            legend += (
                f'<rect x="{width*0.76:.0f}" y="{ly2-10}" width="12" height="12" fill="{color}" rx="2" style="cursor:pointer" onclick="drillByMetric(\'{metric_key}\')"/>'
                f'<text x="{width*0.76+16:.0f}" y="{ly2:.0f}" font-size="10" fill="#374151" style="cursor:pointer" onclick="drillByMetric(\'{metric_key}\')">{label}: {value}</text>'
            )
        return f'<svg viewBox="0 0 {width} {height}" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:{width}px"><circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r:.1f}" fill="#F9FAFB"/>{paths}{legend}</svg>'

    def svg_bar(rows, width=580, height=300):
        if not rows:
            return ""
        margin = {"top": 18, "right": 16, "bottom": 58, "left": 42}
        inner_w = width - margin["left"] - margin["right"]
        inner_h = height - margin["top"] - margin["bottom"]
        all_vals = [float(r.get(key, 0) or 0) for r in rows for key, _, _ in metric_defs]
        max_val = max(all_vals) if all_vals else 1
        group_w = inner_w / max(1, len(rows))
        bar_w = (group_w * 0.76) / len(metric_defs)
        parts = []
        for i in range(5):
            y = margin["top"] + inner_h * (1 - i / 4)
            v = round(max_val * i / 4, 1)
            parts.append(f'<line x1="{margin["left"]}" y1="{y:.1f}" x2="{width-margin["right"]}" y2="{y:.1f}" stroke="#EEF2F7" />')
            parts.append(f'<text x="{margin["left"]-6}" y="{y+3:.1f}" text-anchor="end" font-size="9" fill="#9CA3AF">{v}</text>')
        for gi, row in enumerate(rows):
            gx = margin["left"] + gi * group_w + group_w * 0.12
            site = str(row.get("site", ""))
            parts.append(f'<text x="{gx + group_w*0.34:.1f}" y="{height-margin["bottom"]+15}" text-anchor="middle" font-size="9" fill="#6B7280">{site[:11]}</text>')
            for si, (metric_key, _, color) in enumerate(metric_defs):
                val = float(row.get(metric_key, 0) or 0)
                bh = (val / max_val) * inner_h if max_val else 0
                bx = gx + si * bar_w
                by = margin["top"] + inner_h - bh
                safe_site = js_safe(site)
                parts.append(
                    f'<rect x="{bx:.1f}" y="{by:.1f}" width="{max(1.0, bar_w-1):.1f}" height="{bh:.1f}" fill="{color}" rx="2" '
                    f'style="cursor:pointer" onclick="drillByMetricSite(\'{metric_key}\', \'{safe_site}\')">'
                    f'<title>{site} {metric_key}: {val}</title></rect>'
                )
        return f'<svg viewBox="0 0 {width} {height}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">{"".join(parts)}</svg>'

    def svg_line(rows, width=580, height=300):
        if not rows:
            return ""
        margin = {"top": 16, "right": 16, "bottom": 46, "left": 42}
        inner_w = width - margin["left"] - margin["right"]
        inner_h = height - margin["top"] - margin["bottom"]
        all_vals = [float(r.get(key, 0) or 0) for r in rows for key, _, _ in metric_defs]
        max_val = max(all_vals) if all_vals else 1
        step_x = inner_w / max(1, len(rows) - 1)
        parts = []
        for i, row in enumerate(rows):
            x = margin["left"] + i * step_x
            site = str(row.get("site", ""))
            parts.append(f'<text x="{x:.1f}" y="{height - 14}" text-anchor="middle" font-size="9" fill="#6B7280">{site[:11]}</text>')
        for metric_key, metric_label, color in metric_defs:
            pts = []
            for i, row in enumerate(rows):
                x = margin["left"] + i * step_x
                y = margin["top"] + inner_h - ((float(row.get(metric_key, 0) or 0) / max_val) * inner_h if max_val else 0)
                pts.append((x, y, row))
            points_attr = " ".join(f"{x:.1f},{y:.1f}" for x, y, _ in pts)
            parts.append(f'<polyline points="{points_attr}" fill="none" stroke="{color}" stroke-width="2" opacity="0.95"/>')
            for x, y, row in pts:
                site = str(row.get("site", ""))
                safe_site = js_safe(site)
                val = float(row.get(metric_key, 0) or 0)
                parts.append(
                    f'<circle cx="{x:.1f}" cy="{y:.1f}" r="4" fill="{color}" style="cursor:pointer" '
                    f'onclick="drillByMetricSite(\'{metric_key}\', \'{safe_site}\')">'
                    f'<title>{site} {metric_label}: {val}</title></circle>'
                )
        return f'<svg viewBox="0 0 {width} {height}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">{"".join(parts)}</svg>'

    def svg_heatmap(rows, width=580, height=300):
        if not rows:
            return ""
        margin = {"top": 16, "right": 12, "bottom": 66, "left": 72}
        metrics = metric_defs
        inner_w = width - margin["left"] - margin["right"]
        inner_h = height - margin["top"] - margin["bottom"]
        cell_w = inner_w / max(1, len(rows))
        cell_h = inner_h / max(1, len(metrics))
        max_val = max(float(r.get(mk, 0) or 0) for r in rows for mk, _, _ in metrics) if rows else 1
        parts = []
        for mi, (metric_key, metric_label, base_color) in enumerate(metrics):
            y = margin["top"] + mi * cell_h
            parts.append(f'<text x="{margin["left"] - 8}" y="{y + cell_h*0.58:.1f}" text-anchor="end" font-size="9" fill="#6B7280">{metric_label}</text>')
            for si, row in enumerate(rows):
                site = str(row.get("site", ""))
                safe_site = js_safe(site)
                val = float(row.get(metric_key, 0) or 0)
                opacity = 0.18 + (0.82 * (val / max_val if max_val else 0))
                x = margin["left"] + si * cell_w
                parts.append(
                    f'<rect x="{x+1:.1f}" y="{y+1:.1f}" width="{max(1.0, cell_w-3):.1f}" height="{max(1.0, cell_h-3):.1f}" '
                    f'fill="{base_color}" fill-opacity="{opacity:.2f}" rx="3" style="cursor:pointer" '
                    f'onclick="drillByMetricSite(\'{metric_key}\', \'{safe_site}\')">'
                    f'<title>{site} {metric_label}: {val}</title></rect>'
                )
                parts.append(f'<text x="{x + cell_w*0.5:.1f}" y="{y + cell_h*0.60:.1f}" text-anchor="middle" font-size="9" fill="#111827">{val:.1f}</text>')
        for si, row in enumerate(rows):
            site = str(row.get("site", ""))
            x = margin["left"] + si * cell_w + cell_w * 0.5
            parts.append(f'<text x="{x:.1f}" y="{height-12}" text-anchor="middle" font-size="9" fill="#6B7280">{site[:10]}</text>')
        return f'<svg viewBox="0 0 {width} {height}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">{"".join(parts)}</svg>'

    pie_svg = svg_pie(pie_slices)
    bar_svg = svg_bar(drill_rows)
    line_svg = svg_line(drill_rows)
    heatmap_svg = svg_heatmap(drill_rows)
    kpi_cards_html = "".join(kpi_card_html(k) for k in KPI_META if k in kpi_avgs)
    sites_list = ", ".join(sorted({r.get("site", "") for r in chart_rows if r.get("site")})) or "All"
    regions_list = filters.get("region") or "All"
    drill_json = json.dumps(drill_rows)

    html = f"""<!DOCTYPE html>
<html lang=\"en\">
<head>
    <meta charset=\"UTF-8\">
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">
    <title>Honeywell — Interactive Shared Report</title>
    <style>
        *{{box-sizing:border-box;margin:0;padding:0}}
        body{{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#F0F2F5;color:#1F2937}}
        .header{{background:#CC0000;color:#fff;padding:18px 36px;display:flex;align-items:center;gap:14px}}
        .hw{{width:42px;height:42px;background:#fff;color:#CC0000;border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:22px;flex-shrink:0}}
        .brand{{font-size:20px;font-weight:700}} .brand-sub{{font-size:12px;opacity:.85}}
        .meta{{background:#1F2937;color:#9CA3AF;padding:9px 36px;font-size:12px;display:flex;gap:20px;flex-wrap:wrap}} .meta b{{color:#fff}}
        .wrap{{max-width:1160px;margin:0 auto;padding:28px 20px 80px}}
        h2{{font-size:15px;font-weight:700;margin:28px 0 12px;border-left:4px solid #CC0000;padding-left:10px;color:#1F2937}}
        .kpi-grid{{display:flex;flex-wrap:wrap;gap:14px;margin-bottom:4px}}
        .kpi-card{{background:#fff;border-radius:10px;padding:18px 22px;min-width:155px;box-shadow:0 2px 8px rgba(0,0,0,.07)}}
        .kpi-label{{font-size:10px;color:#6B7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px}}
        .kpi-value{{font-size:26px;font-weight:700;color:#1F2937}} .kpi-unit{{font-size:11px;color:#9CA3AF;margin-top:3px}}
        .charts{{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:10px}} @media(max-width:900px){{.charts{{grid-template-columns:1fr}}}}
        .chart-box,.panel{{background:#fff;border-radius:10px;padding:18px;box-shadow:0 2px 8px rgba(0,0,0,.07)}}
        .chart-title{{font-size:12px;font-weight:700;color:#374151;margin-bottom:12px}}
        .hint{{font-size:12px;color:#6B7280;margin-top:6px}}
        .filter-row{{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px;align-items:center}}
        .filter-row select,.filter-row input,.filter-row button{{padding:8px 10px;border:1px solid #E5E7EB;border-radius:8px;background:#fff;font-size:12px}}
        .filter-row button{{cursor:pointer;background:#111827;color:#fff;border-color:#111827}}
        table{{width:100%;border-collapse:collapse;background:#fff;border-radius:10px;overflow:hidden}}
        th{{background:#F9FAFB;padding:9px 11px;font-size:10px;text-transform:uppercase;letter-spacing:.4px;color:#6B7280;text-align:left;border-bottom:2px solid #E5E7EB}}
        td{{padding:7px 11px;font-size:12px;border-bottom:1px solid #F9FAFB}}
        tr:last-child td{{border-bottom:none}} tr:hover td{{background:#FAFAFA}}
        .footer{{text-align:center;padding:22px;font-size:11px;color:#9CA3AF;border-top:1px solid #E5E7EB;margin-top:36px}}
        .badge{{display:inline-block;background:#FEE2E2;color:#991B1B;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600}}
        .edit-mode-banner{{background:#CC0000;color:#fff;padding:12px 36px;display:flex;justify-content:space-between;align-items:center;gap:20px;font-size:13px;font-weight:600}}
        .edit-mode-banner-text{{flex:1}}
        .edit-mode-banner-actions{{display:flex;gap:10px;align-items:center}}
        .edit-mode-banner-actions button,.edit-mode-banner-actions a{{padding:8px 16px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;border:none;text-decoration:none;display:inline-block}}
        .edit-mode-btn{{background:transparent;color:#fff;border:1px solid #fff;transition:all .2s}}
        .edit-mode-btn:hover{{background:#fff;color:#CC0000}}
        .save-btn{{background:#fff;color:#CC0000;transition:all .2s}}
        .save-btn:hover{{background:#fee2e2;color:#991B1B}}
        .done-btn{{background:transparent;color:#fff;border:1px solid #fff;transition:all .2s;padding:6px 12px;font-size:11px}}
        .done-btn:hover{{background:#fff;color:#CC0000}}
    </style>
</head>
<body>    {f'<div class="edit-mode-banner"><div class="edit-mode-banner-text">EDITING MODE — Customers see the saved version. Hidden elements and label changes take effect after clicking Save Changes.</div><div class="edit-mode-banner-actions"><button class="edit-mode-btn" onclick="alert(\'Edit Mode - changes are temporary\')">Edit Mode</button><button class="edit-mode-btn" onclick="window.location.href=window.location.href.replace(/[?&]edit=true/,\'\')">Preview as Customer</button><button class="save-btn" onclick="alert(\'Changes saved!\')">Save Changes</button><a href="#" class="done-btn" onclick="event.preventDefault(); window.history.back()">Done</a></div></div>' if edit_mode else ''}    <div class=\"header\">
        <div class=\"hw\">H</div>
        <div><div class=\"brand\">Honeywell</div><div class=\"brand-sub\">World Class Customer Reports — Interactive Shared Snapshot</div></div>
    </div>
    <div class=\"meta\">
        {f'<span><b>Service Contract:</b> {contract_id}</span>' if contract_id else ''}
        {f'<span><b>Customer:</b> {customer_name}</span>' if customer_name else ''}
        {f'<span><b>Email:</b> {customer_email}</span>' if customer_email else ''}
        {f'<span><b>Report Type:</b> {report_type_display}</span>' if report_type_display else ''}
        <span><b>Generated:</b> {generated_at}</span>
        <span><b>Records:</b> {total_records}</span>
        <span><b>Sites:</b> {sites_list}</span>
        <span><b>Regions:</b> {regions_list}</span>
        <span><b>Contract:</b> {filters.get('contract') or 'All'}</span>
        <span><b>Range:</b> {filters.get('rangePreset','All')}</span>
        <span><b>Role:</b> {role}</span>
        <span><b>Sections:</b> {', '.join(sections) if sections else 'All'}</span>
    </div>

    <div class=\"wrap\">
        <h2>Key Performance Indicators</h2>
        <div class=\"kpi-grid\">{kpi_cards_html}</div>

        <h2>Interactive Visualizations</h2>
        <div class=\"charts\">
            <div class=\"chart-box\">
                <div class=\"chart-title\">Pie Chart: Compliance Mix</div>
                {pie_svg if pie_svg else '<p style="color:#9CA3AF;font-size:12px">No compliance data available.</p>'}
                <div class=\"hint\">Click slice, percentage label, or legend.</div>
            </div>
            <div class=\"chart-box\">
                <div class=\"chart-title\">Bar Chart: Site vs KPI Mix</div>
                {bar_svg if bar_svg else '<p style="color:#9CA3AF;font-size:12px">No bar data available.</p>'}
                <div class=\"hint\">Click any bar to filter by both metric and site.</div>
            </div>
            <div class=\"chart-box\">
                <div class=\"chart-title\">Line Chart: KPI Trend by Site Order</div>
                {line_svg if line_svg else '<p style="color:#9CA3AF;font-size:12px">No line data available.</p>'}
                <div class=\"hint\">Click any line point to drill into site + metric.</div>
            </div>
            <div class=\"chart-box\">
                <div class=\"chart-title\">Heatmap: Site-Metric Intensity</div>
                {heatmap_svg if heatmap_svg else '<p style="color:#9CA3AF;font-size:12px">No heatmap data available.</p>'}
                <div class=\"hint\">Click a heatmap cell for direct drilldown.</div>
            </div>
        </div>

        <h2>Drilldown Filters</h2>
        <div class=\"panel\">
            <div class=\"filter-row\">
                <select id=\"metricFilter\" onchange=\"renderDetailTable()\">
                    <option value=\"PM\">PM</option>
                    <option value=\"Reactive\">Reactive</option>
                    <option value=\"Remote\">Remote</option>
                    <option value=\"CSAT_X20\">CSAT x20</option>
                </select>
                <input id=\"siteFilter\" placeholder=\"Filter site...\" oninput=\"renderDetailTable()\" />
                <input id=\"minFilter\" type=\"number\" step=\"0.1\" placeholder=\"Min value\" oninput=\"renderDetailTable()\" />
                <button type=\"button\" onclick=\"clearDrillFilters()\">Reset Filters</button>
            </div>
            <div class=\"hint\">All permalink visualizations now drive this same interactive drilldown table.</div>
        </div>

        <h2>Drilldown Detail <span id=\"activeMetricBadge\" class=\"badge\">PM</span></h2>
        <div class=\"panel\">
            <table id=\"drillTable\">
                <thead>
                    <tr>
                        <th>Site</th>
                        <th>Slice/Series Value</th>
                        <th>Contribution %</th>
                        <th>Base KPI</th>
                        <th>How Computed</th>
                    </tr>
                </thead>
                <tbody id=\"drillTableBody\"></tbody>
            </table>
        </div>

        <div class=\"footer\">
            Honeywell Building Solutions &middot; World Class Customer Reports &middot; Confidential &middot; {generated_at}
            <br><span style=\"font-size:10px;color:#D1D5DB\">Permalink is fully interactive across pie, bar, line, and heatmap.</span>
        </div>
    </div>

    <script>
        const DRILL_ROWS = {drill_json};

        function drillByMetric(metricKey) {{
            const metricSelect = document.getElementById('metricFilter');
            metricSelect.value = metricKey;
            renderDetailTable();
            document.getElementById('drillTable').scrollIntoView({{ behavior: 'smooth', block: 'start' }});
        }}

        function drillByMetricSite(metricKey, site) {{
            const metricSelect = document.getElementById('metricFilter');
            const siteInput = document.getElementById('siteFilter');
            metricSelect.value = metricKey;
            siteInput.value = site || '';
            renderDetailTable();
            document.getElementById('drillTable').scrollIntoView({{ behavior: 'smooth', block: 'start' }});
        }}

        function clearDrillFilters() {{
            document.getElementById('metricFilter').value = 'PM';
            document.getElementById('siteFilter').value = '';
            document.getElementById('minFilter').value = '';
            renderDetailTable();
        }}

        function metricConfig(metricKey) {{
            const cfg = {{
                PM: {{ label: 'PM', base: 'PM_COMPLETION', explain: 'Direct PM completion percentage' }},
                Reactive: {{ label: 'Reactive', base: 'REACTIVE_MAINTENANCE', explain: 'Computed as 100 - REACTIVE_MAINTENANCE' }},
                Remote: {{ label: 'Remote', base: 'SYSTEM_AVAILABILITY', explain: 'Direct system availability percentage' }},
                CSAT_X20: {{ label: 'CSAT x20', base: 'CSAT', explain: 'Computed as CSAT score × 20' }},
            }};
            return cfg[metricKey] || cfg.PM;
        }}

        function renderDetailTable() {{
            const metricKey = document.getElementById('metricFilter').value;
            const siteQuery = (document.getElementById('siteFilter').value || '').toLowerCase();
            const minVal = parseFloat(document.getElementById('minFilter').value || '');
            const cfg = metricConfig(metricKey);

            const rows = DRILL_ROWS
                .filter(r => !siteQuery || String(r.site || '').toLowerCase().includes(siteQuery))
                .map(r => {{
                    const value = Number(r[metricKey] || 0);
                    let baseValue = Number(r[cfg.base] || 0);
                    if (metricKey === 'Reactive') baseValue = Number(r.REACTIVE_MAINTENANCE || 0);
                    return {{ ...r, value, baseValue }};
                }})
                .filter(r => Number.isNaN(minVal) ? true : r.value >= minVal)
                .sort((a, b) => b.value - a.value);

            const total = rows.reduce((sum, r) => sum + r.value, 0) || 1;
            const tbody = document.getElementById('drillTableBody');
            document.getElementById('activeMetricBadge').textContent = cfg.label;

            if (!rows.length) {{
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#9CA3AF;padding:16px">No matching rows</td></tr>';
                return;
            }}

            tbody.innerHTML = rows.map(r => `
                <tr>
                    <td><b>${{r.site || ''}}</b></td>
                    <td>${{r.value.toFixed(2)}}</td>
                    <td>${{((r.value / total) * 100).toFixed(1)}}%</td>
                    <td>${{r.baseValue.toFixed(2)}}</td>
                    <td>${{cfg.explain}}</td>
                </tr>
            `).join('');
        }}

        renderDetailTable();
    </script>
</body>
</html>"""

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
