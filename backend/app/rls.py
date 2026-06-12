from typing import Dict, List


def enforce_row_level_security(records: List[Dict], tenant_id: str) -> List[Dict]:
    return [record for record in records if record.get("tenant_id") == tenant_id]
