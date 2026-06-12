from app.models import InMemoryStore, User


def create_seed_store() -> InMemoryStore:
    store = InMemoryStore()
    store.users["cs_user"] = User(id="u1", tenant_id="t1", role="CustomerSuccess", username="cs_user")
    store.users["fs_user"] = User(id="u2", tenant_id="t1", role="FieldService", username="fs_user")
    store.users["director_user"] = User(id="u3", tenant_id="t1", role="SiteDirector", username="director_user")
    store.users["tenant2_user"] = User(id="u4", tenant_id="t2", role="CustomerSuccess", username="tenant2_user")
    return store
