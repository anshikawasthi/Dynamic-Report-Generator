from datetime import date

from app.data_providers.base import DataProvider

SITES = [
    {"site": "Bengaluru", "region": "APAC", "contract_id": "C-200", "asset_id": "A-902", "invoice_id": "INV-5562", "customer": "Acme Corp", "service_type": "Remote+Active+Preventive", "technician": "V. Kumar"},
    {"site": "Singapore", "region": "APAC", "contract_id": "C-200", "asset_id": "A-909", "invoice_id": "INV-5563", "customer": "Acme Corp", "service_type": "Remote+Preventive",          "technician": "C. Tan"},
    {"site": "Sydney",    "region": "APAC", "contract_id": "C-200", "asset_id": "A-910", "invoice_id": "INV-5564", "customer": "Acme Corp", "service_type": "Active+Preventive",          "technician": "O. Smith"},
    {"site": "Tokyo",     "region": "APAC", "contract_id": "C-200", "asset_id": "A-919", "invoice_id": "INV-5565", "customer": "Acme Corp", "service_type": "Remote+Active",              "technician": "Y. Tanaka"},
    {"site": "Mumbai",    "region": "APAC", "contract_id": "C-200", "asset_id": "A-920", "invoice_id": "INV-5566", "customer": "Acme Corp", "service_type": "Preventive",                 "technician": "A. Shah"},
    {"site": "Seoul",     "region": "APAC", "contract_id": "C-200", "asset_id": "A-921", "invoice_id": "INV-5567", "customer": "Acme Corp", "service_type": "Remote+Active+Preventive", "technician": "J. Kim"},
]

KPI_DATA = [
    ("INVOICE_CYCLE",     [11.0, 9.5, 13.2, 10.8,  12.5, 9.0],  "days"),
    ("CONTRACT_COVERAGE", [97.0,94.2, 98.5, 96.3,  95.8,99.1],   "%"),
    ("UPTIME",            [98.8,97.5, 99.2, 98.1,  97.8,99.4],   "%"),
    ("CSAT",              [4.4, 4.6,  4.3,  4.5,   4.2, 4.8],    "/5"),
    ("PM_COMPLETION",     [93.0,96.5, 91.2, 94.8,  92.5,97.0],   "%"),
    ("REACTIVE_MAINTENANCE",[86.0,90.5,84.2,88.7, 85.3,91.0],    "%"),
]


class SAPProvider(DataProvider):
    source_name = "SAP"

    def fetch(self, entity, filters):
        tenant_id = filters.get("tenant_id", "t1")
        today = str(date.today())
        records = []
        lang_map = {"Tokyo": "ja", "Seoul": "ko", "Mumbai": "hi"}
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
                    "invoice_id": site["invoice_id"],
                    "date": today,
                    "value": values[i],
                    "unit": unit,
                    "language": lang_map.get(site["site"], "en"),
                })
        return records
