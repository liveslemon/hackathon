from supabase import Client, ClientOptions, create_client
from .config import settings

supabase: Client = create_client(
    settings.SUPABASE_URL,
    settings.SUPABASE_SERVICE_ROLE_KEY,
    options=ClientOptions(
        postgrest_client_timeout=15.0,
        storage_client_timeout=15.0,
    ),
)
