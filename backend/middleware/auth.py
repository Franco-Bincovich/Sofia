"""
Middleware de autenticación JWT.
Delega la verificación del token a Supabase Admin (get_user) para soportar
el algoritmo ES256 que usa Supabase internamente, y expone user_id y rol
en request.state.user para los handlers.
"""
import re
from typing import Optional

from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from integrations.supabase_client import supabase_admin
from utils.logger import logger

PUBLIC_ROUTES = frozenset([
    "/health",
    "/api/auth/login",
    "/api/auth/refresh",
    "/api/integraciones/google/callback",
])
_ASSESSMENT_FE_RE  = re.compile(r"^/assessment/[^/]+$")
_ASSESSMENT_API_RE = re.compile(r"^/api/assessment/evaluacion/[^/]+(/submit)?$")


def _is_public(path: str) -> bool:
    return (
        path in PUBLIC_ROUTES
        or bool(_ASSESSMENT_FE_RE.match(path))
        or bool(_ASSESSMENT_API_RE.match(path))
    )


def _extract_token(request: Request) -> Optional[str]:
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth[7:]
    return None


class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        if _is_public(request.url.path):
            return await call_next(request)

        token = _extract_token(request)
        if not token:
            return JSONResponse(
                status_code=401,
                content={"error": True, "message": "No autorizado", "code": "MISSING_TOKEN"},
            )

        try:
            user_resp = supabase_admin.auth.get_user(token)
            user_id = user_resp.user.id
        except Exception:
            logger.warning("Token JWT inválido o expirado", extra={"path": request.url.path})
            return JSONResponse(
                status_code=401,
                content={"error": True, "message": "No autorizado", "code": "UNAUTHORIZED"},
            )

        try:
            row = (
                supabase_admin.table("users")
                .select("rol")
                .eq("id", user_id)
                .single()
                .execute()
            )
            rol = row.data.get("rol") if row.data else None
        except Exception:
            rol = None

        request.state.user = {"id": user_id, "rol": rol}
        return await call_next(request)
