from datetime import date

from app.data_providers.base import DataProvider

SITES = [
    {"site": "Berlin",    "region": "EU",   "contract_id": "C-100", "asset_id": "A-901"},
    {"site": "London",    "region": "EU",   "contract_id": "C-100", "asset_id": "A-906"},
    {"site": "Paris",     "region": "EU",   "contract_id": "C-100", "asset_id": "A-907"},
    {"site": "Stockholm", "region": "EU",   "contract_id": "C-200", "asset_id": "A-908"},
]

KPI_DATA = [
    ("UPTIME",              [99.2,  97.8,  99.5,  98.6],  "%"),
    ("SYSTEM_AVAILABILITY", [98.5,  96.3,  99.1,  97.8],  "%"),
    ("BREAK_FIX",           [92.0,  88.5,  94.2,  90.7],  "%"),
]


class NEXProvider(DataProvider):
    source_name = "NEX"

    def fetch(self, entity, filters):
        tenant_id = filters.get("tenant_id", "t1")
        today = str(date.today())
        records = []
        for i, site in enumerate(SITES):
            for kpi_code, values, unit in KPI_DATA:
                records.append({
                    "tenant_id": tenant_id,
                    "source": self.source_name,
                    "entity": entity,
                    "kpi_code": kpi_code,
                    "contract_id": site["contract_id"],
                    "asset_id": site["asset_id"],
                    "region": site["region"],
                    "site": site["site"],
                    "date": today,
                    "value": values[i],
                    "unit": unit,
                    "language": "de" if site["site"] == "Berlin" else "en",
                })
        return records
