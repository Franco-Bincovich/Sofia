"""
Middleware de autenticación JWT.
Decodifica el token Supabase sin verificar firma (PyJWT) y expone
el user_id, rol y empresa_id en request.state para los handlers.
empresa_id proviene del header X-Empresa-Id (UUID) o queda None si viene "todas" o ausente.
"""
import re
from typing import Optional
from uuid import UUID

import jwt
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
        if request.method == "OPTIONS":
            return await call_next(request)
        if _is_public(request.url.path):
            return await call_next(request)

        token = _extract_token(request)
        if not token:
            return JSONResponse(
                status_code=401,
                content={"error": True, "message": "No autorizado", "code": "MISSING_TOKEN"},
            )

        try:
            payload = jwt.decode(token, options={"verify_signature": False})
            user_id = payload.get("sub")
        except Exception:
            user_id = None

        if not user_id:
            logger.warning("Token JWT sin sub", extra={"path": request.url.path})
            return JSONResponse(
                status_code=401,
                content={"error": True, "message": "No autorizado", "code": "INVALID_TOKEN"},
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

        empresa_header = request.headers.get("X-Empresa-Id", "").strip()
        if empresa_header and empresa_header != "todas":
            try:
                UUID(empresa_header)
                request.state.empresa_id = empresa_header
            except ValueError:
                request.state.empresa_id = None
        else:
            request.state.empresa_id = None

        return await call_next(request)
