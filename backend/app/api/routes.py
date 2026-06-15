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
    payload = request.get_json(silent=True) or {}
    report_payload = json.dumps(payload, sort_keys=True)
    permalink = hashlib.sha256(report_payload.encode("utf-8")).hexdigest()[:16]
    current_app.shared_reports[permalink] = payload
    return jsonify({"permalink": f"/api/reports/shared/{permalink}"})


@api_bp.get("/reports/shared/<permalink>")
def get_shared_report(permalink):
    report = current_app.shared_reports.get(permalink)
    if not report:
        return "<h2 style='font-family:sans-serif;color:#CC0000;padding:40px'>Report not found or has expired.</h2>", 404

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
