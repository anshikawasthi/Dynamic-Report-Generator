from dataclasses import dataclass, field
from typing import Any, Dict, List


@dataclass
class User:
    id: str
    tenant_id: str
    role: str
    username: str
    language: str = "en"


@dataclass
class ReportTemplate:
    id: str
    tenant_id: str
    user_id: str
    name: str
    payload: Dict[str, Any]


@dataclass
class ScheduledReport:
    id: str
    tenant_id: str
    template_id: str
    recipients: List[str]
    cron: str
    active: bool = True


@dataclass
class InMemoryStore:
    users: Dict[str, User] = field(default_factory=dict)
    templates: Dict[str, ReportTemplate] = field(default_factory=dict)
    schedules: Dict[str, ScheduledReport] = field(default_factory=dict)
