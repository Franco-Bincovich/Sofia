"""
Middleware de autenticación JWT.
Valida el token Supabase en todas las rutas no públicas y expone
el user_id y rol en request.state.user para los handlers.
"""
import re
from typing import Optional

from fastapi.responses import JSONResponse
from jose import JWTError, jwt
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from config.settings import settings
from utils.logger import logger

PUBLIC_ROUTES = frozenset([
    "/health",
    "/api/auth/login",
    "/api/auth/refresh",
])
_ASSESSMENT_RE = re.compile(r"^/assessment/[^/]+$")
_ALGORITHM = "HS256"


def _is_public(path: str) -> bool:
    return path in PUBLIC_ROUTES or bool(_ASSESSMENT_RE.match(path))


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
            payload = jwt.decode(token, settings.jwt_secret, algorithms=[_ALGORITHM])
        except JWTError:
            logger.warning("Token JWT inválido", extra={"path": request.url.path})
            return JSONResponse(
                status_code=401,
                content={"error": True, "message": "No autorizado", "code": "INVALID_TOKEN"},
            )

        app_meta = payload.get("app_metadata") or {}
        request.state.user = {
            "id": payload.get("sub"),
            "rol": app_meta.get("rol"),
        }
        return await call_next(request)
