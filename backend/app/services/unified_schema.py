from typing import Dict, List


def to_universal_response(
    records: List[Dict],
    filters: Dict,
    schema_name: str = "UnifiedKPIRecord",
    advanced_charting: bool = True,
) -> Dict:
    charts = ["line", "table"]
    if advanced_charting:
        charts.insert(0, "bar")
    return {
        "meta": {
            "count": len(records),
            "filters": filters,
        },
        "presentation": {
            "defaultChart": "line",
            "availableCharts": charts,
            "legendToggle": True,
            "zoom": True,
            "hoverTooltips": True,
        },
        "schema": {
            "name": schema_name,
            "fields": [
                "tenant_id",
                "source",
                "entity",
                "kpi_code",
                "contract_id",
                "asset_id",
                "region",
                "site",
                "date",
                "value",
                "language",
            ],
        },
        "data": records,
    }
