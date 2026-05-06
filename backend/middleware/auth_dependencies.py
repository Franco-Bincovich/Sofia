"""
Dependencias de FastAPI para control de acceso por rol.
"""
from fastapi import Depends, Request

from utils.errors import AppError


def get_admin_user(request: Request) -> dict:
    """
    Dependencia que verifica que el usuario autenticado tenga rol admin_rrhh.

    Raises:
        AppError: FORBIDDEN (403) si el usuario no es admin_rrhh.

    Returns:
        Dict con id y rol del usuario.
    """
    user = getattr(request.state, "user", None)
    if not user or user.get("rol") != "admin_rrhh":
        raise AppError("Acceso denegado", "FORBIDDEN", 403)
    return user
