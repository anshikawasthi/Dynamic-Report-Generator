from apscheduler.schedulers.background import BackgroundScheduler


class SchedulerService:
    def __init__(self):
        self.scheduler = BackgroundScheduler()

    def start(self):
        if not self.scheduler.running:
            self.scheduler.start()

    def stop(self):
        if self.scheduler.running:
            self.scheduler.shutdown(wait=False)

    def schedule_email_delivery(self, report_id: str, recipients, cron: str):
        # Placeholder job. Integrate SMTP or enterprise mail in production.
        self.scheduler.add_job(
            func=lambda: print(f"Scheduled report {report_id} sent to {recipients}"),
            trigger="cron",
            id=f"report:{report_id}",
            replace_existing=True,
            minute="*/15" if cron == "default" else "*/30",
        )
