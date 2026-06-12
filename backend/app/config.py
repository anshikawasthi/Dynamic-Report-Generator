import os


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-please-change-this-32chars")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret-please-change-this-32chars")
    CACHE_TYPE = os.getenv("CACHE_TYPE", "SimpleCache")
    CACHE_DEFAULT_TIMEOUT = int(os.getenv("CACHE_DEFAULT_TIMEOUT", "120"))
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    ENABLE_ADVANCED_CHARTS = os.getenv("ENABLE_ADVANCED_CHARTS", "true").lower() == "true"
    ENABLE_ADVANCED_EXPORTS = os.getenv("ENABLE_ADVANCED_EXPORTS", "true").lower() == "true"
    QUERY_TIMEOUT_SECONDS = int(os.getenv("QUERY_TIMEOUT_SECONDS", "5"))
