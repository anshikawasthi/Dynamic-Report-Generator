from app.data_providers.nex import NEXProvider
from app.data_providers.sap import SAPProvider
from app.data_providers.sms import SMSProvider


class ProviderRegistry:
    def __init__(self):
        self.providers = {
            "SMS": SMSProvider(),
            "NEX": NEXProvider(),
            "SAP": SAPProvider(),
        }

    def fetch_all(self, entity, filters):
        rows = []
        for provider in self.providers.values():
            rows.extend(provider.fetch(entity, filters))
        return rows
