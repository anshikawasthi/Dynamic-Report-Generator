from flask import Flask
from flask_cors import CORS
from flask import jsonify, request

from app.api.graphql_schema import schema
from app.api.routes import _render_html_report, api_bp
from app.config import Config
from app.extensions import cache, jwt
from app.seed import create_seed_store
from app.services.scheduler_service import SchedulerService


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    CORS(app)

    cache.init_app(app)
    jwt.init_app(app)

    app.store = create_seed_store()
    app.scheduler_service = SchedulerService()
    try:
        app.scheduler_service.start()
    except Exception:
        pass  # Scheduler is best-effort; serverless environments may not support background threads
    app.shared_reports = {}

    app.register_blueprint(api_bp, url_prefix="/api")

    @app.post("/graphql")
    def graphql_endpoint():
        payload = request.get_json(silent=True) or {}
        query = payload.get("query")
        variables = payload.get("variables")
        result = schema.execute(query, variable_values=variables)
        response = {}
        if result.errors:
            response["errors"] = [str(e) for e in result.errors]
        if result.data is not None:
            response["data"] = result.data
        return jsonify(response)

    @app.get("/health")
    def health():
        return {"status": "ok"}

    @app.get("/report/<report_id>")
    def report_permalink(report_id):
        """Portal-compatible permalink route: /report/<id>?d=<encoded snapshot>."""
        import base64
        import json

        encoded = request.args.get("d", "")
        if encoded:
            try:
                padded = encoded + "=" * (-len(encoded) % 4)
                decoded = base64.urlsafe_b64decode(padded.encode()).decode("utf-8")
                snapshot = json.loads(decoded)
                return _render_html_report(snapshot)
            except Exception:
                return "<h2 style='font-family:sans-serif;color:#CC0000;padding:40px'>Invalid report data.</h2>", 400

        # Fallback for non-snapshot links in stateful local runs.
        report = app.shared_reports.get(report_id)
        if report:
            return _render_html_report(report)
        return "<h2 style='font-family:sans-serif;color:#CC0000;padding:40px'>Report not found or expired. Generate a new link.</h2>", 404

    return app
