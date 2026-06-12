"""Repositorio de tipos_ausencia. Catálogo global (sin empresa_id)."""
from typing import List

from integrations.supabase_client import supabase_admin
from schemas.ausencias import TipoAusenciaResponse
from utils.errors import AppError

_TA = "tipos_ausencia"


class TiposAusenciaRepo:
    def find_all(self) -> List[TipoAusenciaResponse]:
        """Retorna todos los tipos activos ordenados por nombre."""
        data = supabase_admin.table(_TA).select("*").eq("activo", True).order("nombre").execute().data or []
        return [TipoAusenciaResponse.model_validate(t) for t in data]

    def create(self, nombre: str) -> TipoAusenciaResponse:
        """Inserta un tipo nuevo. Lanza AppError si hay error de DB."""
        res = supabase_admin.table(_TA).insert({"nombre": nombre, "es_base": False}).execute()
        if not res.data:
            raise AppError("Error al crear el tipo de ausencia", "DB_ERROR", 500)
        return TipoAusenciaResponse.model_validate(res.data[0])
