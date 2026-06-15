from datetime import date

from app.data_providers.base import DataProvider

SITES = [
    {"site": "Berlin",      "region": "EU", "contract_id": "C-100", "asset_id": "A-901", "customer": "Acme Corp", "service_type": "Remote+Active",              "technician": "H. Mueller"},
    {"site": "London",      "region": "EU", "contract_id": "C-100", "asset_id": "A-906", "customer": "Acme Corp", "service_type": "Remote+Preventive",          "technician": "E. Clarke"},
    {"site": "Paris",       "region": "EU", "contract_id": "C-100", "asset_id": "A-907", "customer": "Acme Corp", "service_type": "Active+Preventive",          "technician": "A. Dupont"},
    {"site": "Stockholm",   "region": "EU", "contract_id": "C-200", "asset_id": "A-908", "customer": "Acme Corp", "service_type": "Remote+Active+Preventive",   "technician": "L. Svensson"},
    {"site": "Amsterdam",   "region": "EU", "contract_id": "C-100", "asset_id": "A-915", "customer": "Acme Corp", "service_type": "Remote",                     "technician": "P. de Vries"},
    {"site": "Madrid",      "region": "EU", "contract_id": "C-100", "asset_id": "A-916", "customer": "Acme Corp", "service_type": "Preventive+Active",          "technician": "I. Fernandez"},
    {"site": "Frankfurt",   "region": "EU", "contract_id": "C-200", "asset_id": "A-917", "customer": "Acme Corp", "service_type": "Remote+Active",              "technician": "K. Fischer"},
    {"site": "Warsaw",      "region": "EU", "contract_id": "C-200", "asset_id": "A-918", "customer": "Acme Corp", "service_type": "Preventive",                 "technician": "W. Nowak"},
]

KPI_DATA = [
    ("UPTIME",              [99.2,97.8,99.5,98.6,98.0,97.2,99.0,96.5], "%"),
    ("SYSTEM_AVAILABILITY", [98.5,96.3,99.1,97.8,97.5,96.0,98.2,95.8], "%"),
    ("BREAK_FIX",           [92.0,88.5,94.2,90.7,91.0,87.5,93.0,89.2], "%"),
    ("REACTIVE_MAINTENANCE",[85.0,88.0,91.0,87.5,86.0,84.0,90.0,83.5], "%"),
    ("MTTR",                [3.5, 4.8, 3.0, 4.2, 3.8, 5.2, 3.1, 5.8], "hours"),
    ("CSAT",                [4.5, 4.2, 4.6, 4.3, 4.4, 4.1, 4.7, 4.0], "/5"),
]


class NEXProvider(DataProvider):
    source_name = "NEX"

    def fetch(self, entity, filters):
        tenant_id = filters.get("tenant_id", "t1")
        today = str(date.today())
        records = []
        lang_map = {"Berlin": "de", "Paris": "fr", "Madrid": "es", "Warsaw": "pl"}
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
                    "customer": site["customer"],
                    "service_type": site["service_type"],
                    "technician": site["technician"],
                    "date": today,
                    "value": values[i],
                    "unit": unit,
                    "language": lang_map.get(site["site"], "en"),
                })
        return records
