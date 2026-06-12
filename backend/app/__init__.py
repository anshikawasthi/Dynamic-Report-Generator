from flask import Flask
from flask_cors import CORS
from flask import jsonify, request

from app.api.graphql_schema import schema
from app.api.routes import api_bp
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
    app.scheduler_service.start()
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

    return app
