from datetime import date

from app.data_providers.base import DataProvider

SITES = [
    {"site": "Phoenix",      "region": "NA",  "contract_id": "C-100", "asset_id": "A-900", "customer": "Acme Corp",    "service_type": "Remote+Preventive",          "technician": "J. Martinez"},
    {"site": "Chicago",      "region": "NA",  "contract_id": "C-101", "asset_id": "A-903", "customer": "Acme Corp",    "service_type": "Reactive+Preventive",        "technician": "L. Johnson"},
    {"site": "Houston",      "region": "NA",  "contract_id": "C-101", "asset_id": "A-904", "customer": "Acme Corp",    "service_type": "Reactive+Preventive",        "technician": "R. Patel"},
    {"site": "Denver",       "region": "NA",  "contract_id": "C-100", "asset_id": "A-905", "customer": "Acme Corp",    "service_type": "Remote+Preventive",          "technician": "S. Williams"},
    {"site": "Dallas",       "region": "NA",  "contract_id": "C-100", "asset_id": "A-911", "customer": "Acme Corp",    "service_type": "Preventive",                 "technician": "T. Brown"},
    {"site": "Atlanta",      "region": "NA",  "contract_id": "C-101", "asset_id": "A-912", "customer": "Acme Corp",    "service_type": "Remote+Reactive+Preventive", "technician": "K. Davis"},
    {"site": "Seattle",      "region": "NA",  "contract_id": "C-100", "asset_id": "A-913", "customer": "Acme Corp",    "service_type": "Remote+Preventive",          "technician": "M. Wilson"},
    {"site": "Miami",        "region": "NA",  "contract_id": "C-101", "asset_id": "A-914", "customer": "Acme Corp",    "service_type": "Reactive",                   "technician": "C. Garcia"},
]

KPI_DATA = [
    ("MTTR",                 [4.2, 3.8, 5.1, 4.5, 3.2, 6.1, 4.0, 5.5], "hours"),
    ("PM_COMPLETION",        [94.5,89.2,96.1,92.3,97.8,88.5,95.0,90.1], "%"),
    ("REACTIVE_MAINTENANCE", [87.0,91.5,83.2,88.7,92.3,85.6,89.4,84.1], "%"),
    ("CSAT",                 [4.3, 4.1, 4.5, 4.2, 4.7, 3.9, 4.4, 4.0], "/5"),
    ("COMPLIANCE",           [98.0,94.5,97.2,96.8,99.1,93.4,97.8,95.5], "%"),
    ("BREAK_FIX",            [88.0,92.5,85.0,90.0,94.0,86.0,91.0,87.5], "%"),
    ("PM_SCHEDULE_ADHERENCE",[91.0,86.0,93.0,89.0,95.0,84.0,92.0,88.0], "%"),
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
                    "customer": site["customer"],
                    "service_type": site["service_type"],
                    "technician": site["technician"],
                    "date": today,
                    "value": values[i],
                    "unit": unit,
                    "language": "en",
                })
        return records
