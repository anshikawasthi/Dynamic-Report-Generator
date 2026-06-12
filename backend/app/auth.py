from functools import wraps
from typing import Iterable

from flask import g, jsonify
from flask_jwt_extended import create_access_token, get_jwt, get_jwt_identity, jwt_required


def issue_token(username: str, tenant_id: str, role: str):
    return create_access_token(identity=username, additional_claims={"tenant_id": tenant_id, "role": role})


def require_roles(roles: Iterable[str]):
    role_set = set(roles)

    def decorator(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            username = get_jwt_identity()
            claims = get_jwt()
            role = claims.get("role")
            if role not in role_set:
                return jsonify({"error": "forbidden", "message": "Role not authorized"}), 403
            g.identity = {
                "username": username,
                "tenant_id": claims.get("tenant_id"),
                "role": role,
            }
            return fn(*args, **kwargs)

        return wrapper

    return decorator
