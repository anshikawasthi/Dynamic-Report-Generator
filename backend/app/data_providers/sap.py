from datetime import date

from app.data_providers.base import DataProvider

SITES = [
    {"site": "Bengaluru",   "region": "APAC", "contract_id": "C-200", "asset_id": "A-902", "invoice_id": "INV-5562"},
    {"site": "Singapore",   "region": "APAC", "contract_id": "C-200", "asset_id": "A-909", "invoice_id": "INV-5563"},
    {"site": "Sydney",      "region": "APAC", "contract_id": "C-200", "asset_id": "A-910", "invoice_id": "INV-5564"},
]

KPI_DATA = [
    ("INVOICE_CYCLE",    [11.0,  9.5,  13.2], "days"),
    ("CONTRACT_COVERAGE",[97.0, 94.2,  98.5], "%"),
]


class SAPProvider(DataProvider):
    source_name = "SAP"

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
                    "invoice_id": site["invoice_id"],
                })
        return records
