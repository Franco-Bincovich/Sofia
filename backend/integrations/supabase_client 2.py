"""
Clientes de Supabase para el backend.

- supabase_client: usa la anon key, respeta RLS. Para operaciones autenticadas del usuario.
- supabase_admin: usa la service key, bypasea RLS. Solo para operaciones administrativas
  que requieren acceso sin restricción de políticas (ej. leer perfil tras login).
"""
from supabase import Client, create_client

from config.settings import settings


def _create_anon_client() -> Client:
    """Instancia el cliente público con la anon key. Respeta RLS."""
    return create_client(settings.supabase_url, settings.supabase_anon_key)


def _create_admin_client() -> Client:
    """Instancia el cliente admin con la service key. Bypasea RLS — usar con criterio."""
    return create_client(settings.supabase_url, settings.supabase_service_key)


supabase_client: Client = _create_anon_client()
supabase_admin: Client = _create_admin_client()
