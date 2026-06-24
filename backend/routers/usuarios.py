"""
Router de usuarios del sistema. Solo lectura — listado para selectores de responsable.
No maneja autenticación ni permisos (eso está en routers/auth.py).
"""
from fastapi import APIRouter, Request

from integrations.supabase_client import supabase_admin
from utils.permisos import Seccion

router = APIRouter()
SECCION = Seccion.USUARIOS


@router.get("")
async def list_usuarios(request: Request) -> dict:
    """Retorna usuarios activos del sistema (para el selector de responsable de objetivos)."""
    data = (
        supabase_admin.table("users")
        .select("id, nombre, apellido, email, rol")
        .eq("activo", True)
        .order("apellido")
        .execute().data or []
    )
    return {"items": data, "total": len(data)}
