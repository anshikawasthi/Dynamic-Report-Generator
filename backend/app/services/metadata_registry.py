import json
from pathlib import Path


class MetadataRegistryService:
    def __init__(self):
        self.registry_path = Path(__file__).resolve().parents[1] / "metadata" / "kpi_registry.json"

    def get_registry(self):
        with self.registry_path.open("r", encoding="utf-8") as f:
            base = json.load(f)

        base["unifiedMappings"] = {
            "kpis": ["kpi_code", "value", "date"],
            "contracts": ["contract_id", "region", "site"],
            "assets": ["asset_id", "site", "region"],
            "invoices": ["invoice_id", "invoice_amount", "date"],
            "opportunities": ["opportunity", "contract_id", "region"],
        }
        base["dataSources"] = ["SMS", "NEX", "SAP"]
        return base
