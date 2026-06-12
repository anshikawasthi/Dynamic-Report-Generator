from datetime import date

from app.data_providers.base import DataProvider

SITES = [
    {"site": "Phoenix",  "region": "NA",   "contract_id": "C-100", "asset_id": "A-900"},
    {"site": "Chicago",  "region": "NA",   "contract_id": "C-101", "asset_id": "A-903"},
    {"site": "Houston",  "region": "NA",   "contract_id": "C-101", "asset_id": "A-904"},
    {"site": "Denver",   "region": "NA",   "contract_id": "C-100", "asset_id": "A-905"},
]

KPI_DATA = [
    ("MTTR",                 [4.2,  3.8,  5.1,  4.5],  "hours"),
    ("PM_COMPLETION",        [94.5, 89.2, 96.1, 92.3], "%"),
    ("REACTIVE_MAINTENANCE", [87.0, 91.5, 83.2, 88.7], "%"),
    ("CSAT",                 [4.3,  4.1,  4.5,  4.2],  "/5"),
    ("COMPLIANCE",           [98.0, 94.5, 97.2, 96.8], "%"),
]


class SMSProvider(DataProvider):
    source_name = "SMS"

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
                    "language": "en",
                })
        return records
