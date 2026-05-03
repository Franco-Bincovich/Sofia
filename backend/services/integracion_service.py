"""
Servicio de integraciones por usuario.
Gestiona el flujo OAuth de Google y el guardado de API keys (Anthropic).
"""
import os
from datetime import timezone
from typing import Optional

import httpx
from google_auth_oauthlib.flow import Flow

from config.settings import settings
from repositories.integracion_repo import IntegracionRepo
from schemas.integracion import IntegracionResponse
from utils.errors import AppError
from utils.logger import logger

if settings.app_env == "development":
    os.environ.setdefault("OAUTHLIB_INSECURE_TRANSPORT", "1")

_GOOGLE_SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/userinfo.email",
    "openid",
]


def _google_client_config() -> dict:
    """Construye el dict de configuración OAuth requerido por google-auth-oauthlib."""
    return {
        "web": {
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [settings.google_redirect_uri],
        }
    }


class IntegracionService:
    def __init__(self, repo: Optional[IntegracionRepo] = None) -> None:
        self._repo = repo or IntegracionRepo()

    def get_integraciones(self, user_id: str) -> list[IntegracionResponse]:
        """
        Retorna el estado de todas las integraciones soportadas para el usuario.

        Args:
            user_id: UUID del usuario autenticado.

        Returns:
            Lista de IntegracionResponse para 'google' y 'anthropic'.
        """
        rows = self._repo.get_by_user(user_id)
        existing = {r["tipo"]: r for r in rows}

        result = []
        for tipo in ("google", "anthropic"):
            row = existing.get(tipo)
            if row and row.get("activo"):
                result.append(IntegracionResponse(
                    tipo=tipo,
                    email_cuenta=row.get("email_cuenta"),
                    activo=True,
                    connected=True,
                ))
            else:
                result.append(IntegracionResponse(
                    tipo=tipo,
                    email_cuenta=None,
                    activo=False,
                    connected=False,
                ))
        return result

    def init_google_oauth(self, user_id: str) -> str:
        """
        Genera la URL de autorización de Google OAuth 2.0.

        Args:
            user_id: UUID del usuario — se codifica en state para recuperarlo en el callback.

        Returns:
            URL de autorización de Google a la que redirigir al usuario.

        Raises:
            AppError: GOOGLE_NOT_CONFIGURED (503) si faltan las credenciales OAuth.
        """
        if not settings.google_client_id or not settings.google_client_secret:
            raise AppError("Google OAuth no está configurado", "GOOGLE_NOT_CONFIGURED", 503)

        flow = Flow.from_client_config(_google_client_config(), scopes=_GOOGLE_SCOPES)
        flow.redirect_uri = settings.google_redirect_uri
        auth_url, _ = flow.authorization_url(
            access_type="offline",
            include_granted_scopes="true",
            state=user_id,
            prompt="consent",
        )
        logger.info("Google OAuth iniciado", extra={"user_id": user_id})
        return auth_url

    def handle_google_callback(self, user_id: str, code: str) -> IntegracionResponse:
        """
        Procesa el callback de Google: intercambia el código por tokens y guarda en DB.

        Args:
            user_id: UUID del usuario (extraído del state param del callback).
            code: Código de autorización recibido de Google.

        Returns:
            IntegracionResponse con la cuenta conectada.

        Raises:
            AppError: GOOGLE_CALLBACK_ERROR (400) si falla el intercambio de tokens.
            AppError: GOOGLE_USERINFO_ERROR (400) si no se puede obtener el email.
        """
        try:
            flow = Flow.from_client_config(
                _google_client_config(), scopes=_GOOGLE_SCOPES, state=user_id
            )
            flow.redirect_uri = settings.google_redirect_uri
            flow.fetch_token(code=code)
            credentials = flow.credentials
        except Exception as exc:
            logger.error("Error en callback de Google", extra={"error": str(exc)})
            raise AppError("Error al conectar con Google", "GOOGLE_CALLBACK_ERROR", 400)

        try:
            with httpx.Client(timeout=10.0) as client:
                resp = client.get(
                    "https://www.googleapis.com/oauth2/v2/userinfo",
                    headers={"Authorization": f"Bearer {credentials.token}"},
                )
                resp.raise_for_status()
                email: str = resp.json().get("email", "")
        except Exception as exc:
            logger.error("Error obteniendo userinfo de Google", extra={"error": str(exc)})
            raise AppError("No se pudo obtener la cuenta de Google", "GOOGLE_USERINFO_ERROR", 400)

        expiry = credentials.expiry
        tokens = {
            "access_token": credentials.token,
            "refresh_token": credentials.refresh_token,
            "token_expiry": expiry.replace(tzinfo=timezone.utc).isoformat() if expiry else None,
            "email_cuenta": email,
        }
        self._repo.save_google_tokens(user_id, tokens)
        logger.info("Google conectado", extra={"user_id": user_id, "email": email})
        return IntegracionResponse(tipo="google", email_cuenta=email, activo=True, connected=True)

    def save_anthropic_key(self, user_id: str, api_key: str) -> IntegracionResponse:
        """
        Guarda o actualiza la API key de Anthropic del usuario.

        Args:
            user_id: UUID del usuario.
            api_key: API key de Anthropic a almacenar.

        Returns:
            IntegracionResponse confirmando que la key fue guardada.
        """
        self._repo.save_api_key(user_id, "anthropic", api_key)
        logger.info("API key Anthropic guardada", extra={"user_id": user_id})
        return IntegracionResponse(tipo="anthropic", email_cuenta=None, activo=True, connected=True)

    def disconnect(self, user_id: str, tipo: str) -> bool:
        """
        Desconecta una integración eliminando sus tokens/key de la base de datos.

        Args:
            user_id: UUID del usuario.
            tipo: Tipo de integración a desconectar ('google' o 'anthropic').

        Returns:
            True si la integración fue eliminada.

        Raises:
            AppError: INTEGRACION_NOT_FOUND (404) si el usuario no tenía esa integración.
        """
        deleted = self._repo.delete(user_id, tipo)
        if not deleted:
            raise AppError("Integración no encontrada", "INTEGRACION_NOT_FOUND", 404)
        logger.info("Integración desconectada", extra={"user_id": user_id, "tipo": tipo})
        return True
