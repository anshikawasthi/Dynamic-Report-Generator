from flask import current_app


def enabled(flag_name: str) -> bool:
    return bool(current_app.config.get(flag_name, False))
