"""
Repositorio de cesiones — queries reales a Supabase (service_key; control app-level).
Interfaz: crear · find_by_empleado · find_by_id · update · delete.
Patrón defensivo de respuesta Supabase (res and res.data), como en empleado_repo/adjunto_repo.
"""
from typing import List, Optional

from integrations.supabase_client import supabase_admin
from schemas.cesion import CesionResponse
from utils.errors import AppError
from utils.logger import logger

_TABLE = "cesiones"


def _row(r: dict) -> CesionResponse:
    return CesionResponse.model_validate(r)


class CesionRepo:
    def crear(self, datos: dict) -> CesionResponse:
        """Inserta una cesión y devuelve el registro creado."""
        result = supabase_admin.table(_TABLE).insert(datos).execute()
        if not result or not result.data:
            logger.error("Supabase insert vacío en cesiones")
            raise AppError("Error al guardar la cesión", "DB_ERROR", 500)
        return _row(result.data[0])

    def find_by_empleado(self, empleado_id: str) -> List[CesionResponse]:
        """Cesiones del empleado, ordenadas por fecha descendente."""
        res = (supabase_admin.table(_TABLE).select("*")
               .eq("empleado_id", empleado_id).order("fecha", desc=True).execute())
        return [_row(r) for r in (res.data or [])] if res else []

    def find_by_id(self, id: str) -> Optional[CesionResponse]:
        """Busca una cesión por UUID. None si no existe."""
        res = supabase_admin.table(_TABLE).select("*").eq("id", id).maybe_single().execute()
        return _row(res.data) if res and res.data else None

    def update(self, id: str, patch: dict) -> Optional[CesionResponse]:
        """Actualiza los campos provistos; devuelve el registro. None si no existe o patch vacío sin fila."""
        if not patch:
            return self.find_by_id(id)
        res = supabase_admin.table(_TABLE).update(patch).eq("id", id).execute()
        return _row(res.data[0]) if res and res.data else None

    def delete(self, id: str) -> bool:
        """Borra la cesión (hard delete). True si borró alguna fila."""
        res = supabase_admin.table(_TABLE).delete().eq("id", id).execute()
        return bool(res and res.data)
