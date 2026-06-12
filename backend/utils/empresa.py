"""
Helpers para resolución de empresa activa.
Usados por routers que necesitan filtrar o validar la empresa del request.
"""
from typing import Optional
from uuid import UUID

from starlette.requests import Request

from utils.errors import AppError


def get_empresa_id(request: Request) -> Optional[UUID]:
    """
    Retorna el empresa_id del request (seteado por AuthMiddleware).
    None significa 'todas las empresas' — válido para lecturas consolidadas.
    """
    raw = getattr(request.state, "empresa_id", None)
    return UUID(raw) if raw else None


def require_empresa_id(request: Request) -> UUID:
    """
    Retorna el empresa_id del request o lanza AppError 400 si es None.
    Usar en escrituras (POST/PUT/DELETE) donde empresa concreta es obligatoria.
    """
    eid = get_empresa_id(request)
    if eid is None:
        raise AppError("empresa_id requerido para esta operación", "EMPRESA_ID_REQUIRED", 400)
    return eid
