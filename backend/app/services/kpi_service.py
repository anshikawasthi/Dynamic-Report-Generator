import json
from concurrent.futures import ThreadPoolExecutor, TimeoutError
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Dict, List

from flask import current_app

from app.data_providers.registry import ProviderRegistry
from app.rls import enforce_row_level_security


class KPIService:
    def __init__(self):
        self.providers = ProviderRegistry()
        self.registry_path = Path(__file__).resolve().parents[1] / "metadata" / "kpi_registry.json"

    def load_catalog(self):
        with self.registry_path.open("r", encoding="utf-8") as f:
            return json.load(f).get("kpis", [])

    def search_catalog(self, query: str):
        catalog = self.load_catalog()
        query_lower = (query or "").lower()
        return [
            item for item in catalog if query_lower in item["code"].lower() or query_lower in item["name"].lower()
        ]

    def _fetch_internal(self, entity: str, filters: Dict) -> List[Dict]:
        return self.providers.fetch_all(entity, filters)

    def fetch_unified(self, entity: str, filters: Dict, tenant_id: str) -> List[Dict]:
        timeout = current_app.config.get("QUERY_TIMEOUT_SECONDS", 5)
        with ThreadPoolExecutor(max_workers=1) as pool:
            future = pool.submit(self._fetch_internal, entity, filters)
            try:
                records = future.result(timeout=timeout)
            except TimeoutError as exc:
                raise RuntimeError("Query timeout exceeded") from exc

        scoped = enforce_row_level_security(records, tenant_id)
        return self.apply_filters(scoped, filters)

    def apply_filters(self, records: List[Dict], filters: Dict) -> List[Dict]:
        region = filters.get("region")
        site = filters.get("site")
        contract = filters.get("contract")
        language = filters.get("language")
        start_date = self._safe_parse_date(filters.get("startDate"))
        end_date = self._safe_parse_date(filters.get("endDate"))
        if not start_date and not end_date:
            start_date, end_date = self._range_from_preset(filters.get("rangePreset"))

        out = records
        if region:
            out = [r for r in out if r.get("region") == region]
        if site:
            out = [r for r in out if r.get("site") == site]
        if contract:
            out = [r for r in out if r.get("contract_id") == contract]
        if language:
            out = [r for r in out if r.get("language") == language]
        if start_date or end_date:
            tmp = []
            for row in out:
                row_date = self._safe_parse_date(row.get("date"))
                if not row_date:
                    continue
                if start_date and row_date < start_date:
                    continue
                if end_date and row_date > end_date:
                    continue
                tmp.append(row)
            out = tmp
        return out

    @staticmethod
    def _safe_parse_date(value):
        if not value:
            return None
        try:
            return datetime.fromisoformat(value).date()
        except ValueError:
            return None

    @staticmethod
    def _range_from_preset(preset):
        today = date.today()
        if preset == "day":
            return today, today
        if preset == "week":
            start = today - timedelta(days=today.weekday())
            return start, today
        if preset == "month":
            return today.replace(day=1), today
        if preset == "quarter":
            quarter_start_month = ((today.month - 1) // 3) * 3 + 1
            return today.replace(month=quarter_start_month, day=1), today
        if preset == "ytd":
            return today.replace(month=1, day=1), today
        if preset == "rolling13m":
            return today - timedelta(days=395), today
        return None, None
