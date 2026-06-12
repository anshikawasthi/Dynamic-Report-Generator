import uuid
from typing import Dict

from app.models import ReportTemplate, ScheduledReport


class ReportService:
    def __init__(self, store):
        self.store = store

    def create_template(self, tenant_id: str, user_id: str, name: str, payload: Dict):
        template = ReportTemplate(
            id=str(uuid.uuid4()),
            tenant_id=tenant_id,
            user_id=user_id,
            name=name,
            payload=payload,
        )
        self.store.templates[template.id] = template
        return template

    def list_templates(self, tenant_id: str):
        return [tpl for tpl in self.store.templates.values() if tpl.tenant_id == tenant_id]

    def create_schedule(self, tenant_id: str, template_id: str, recipients, cron: str):
        schedule = ScheduledReport(
            id=str(uuid.uuid4()),
            tenant_id=tenant_id,
            template_id=template_id,
            recipients=recipients,
            cron=cron,
        )
        self.store.schedules[schedule.id] = schedule
        return schedule
