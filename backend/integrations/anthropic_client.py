"""
Cliente Anthropic singleton reutilizable para el backend.

Se instancia una sola vez al importar el módulo y se reutiliza entre requests,
evitando crear un cliente (y su pool httpx) por cada llamada. Usa timeout corto y
sin reintentos para que los errores lleguen controlados al usuario antes del corte
de la función serverless en Vercel.
"""
import anthropic

from config.settings import settings


def _create_client() -> anthropic.Anthropic:
    """Crea el cliente Anthropic con timeout de 25s y sin reintentos automáticos."""
    return anthropic.Anthropic(
        api_key=settings.anthropic_api_key,
        timeout=25.0,
        max_retries=0,
    )


anthropic_client: anthropic.Anthropic = _create_client()
