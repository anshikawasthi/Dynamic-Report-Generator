import graphene

from app.services.kpi_service import KPIService


class KPIType(graphene.ObjectType):
    code = graphene.String()
    name = graphene.String()
    description = graphene.String()
    default_chart = graphene.String()
    unit = graphene.String()


class UnifiedRecordType(graphene.ObjectType):
    source = graphene.String()
    kpi_code = graphene.String()
    contract_id = graphene.String()
    asset_id = graphene.String()
    region = graphene.String()
    site = graphene.String()
    date = graphene.String()
    value = graphene.Float()


class Query(graphene.ObjectType):
    kpi_catalog = graphene.List(KPIType, query=graphene.String())
    unified_data = graphene.List(UnifiedRecordType, entity=graphene.String(default_value="kpis"))

    def resolve_kpi_catalog(self, info, query=None):
        service = KPIService()
        return service.search_catalog(query or "")

    def resolve_unified_data(self, info, entity="kpis"):
        service = KPIService()
        return service.fetch_unified(entity=entity, filters={"tenant_id": "t1"}, tenant_id="t1")


schema = graphene.Schema(query=Query)
