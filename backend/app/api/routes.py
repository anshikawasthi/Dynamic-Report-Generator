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
        return jsonify({"error": "not_found"}), 404
    return jsonify(report)


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
    from io import BytesIO

    return send_file(BytesIO(binary), mimetype=mimetype, as_attachment=True, download_name=filename)


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
