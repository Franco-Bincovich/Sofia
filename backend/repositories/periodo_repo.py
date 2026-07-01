"""
Repositorio de períodos cerrados — queries reales a Supabase.
Interfaz pública: crear · listar · find_cerrados · find_by_id · reabrir
Acceso con service_key (supabase_admin); el control de permisos es app-level.
"""
from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from integrations.supabase_client import supabase_admin
from schemas.periodo import PeriodoResponse
from utils.errors import AppError
from utils.logger import logger

_TABLE = "periodos_cerrados"


def _row(r: dict) -> PeriodoResponse:
    """Convierte un dict de Supabase en PeriodoResponse."""
    return PeriodoResponse.model_validate(r)


class PeriodoRepo:
    def crear(self, datos: dict) -> PeriodoResponse:
        """Inserta un cierre de período (descarta claves None) y devuelve el registro creado."""
        payload = {k: v for k, v in datos.items() if v is not None}
        result = supabase_admin.table(_TABLE).insert(payload).execute()
        if not result.data:
            logger.error("Supabase insert vacío en periodos_cerrados")
            raise AppError("Error al cerrar el período", "DB_ERROR", 500)
        return _row(result.data[0])

    def listar(self, empresa_id: Optional[UUID] = None) -> List[PeriodoResponse]:
        """Lista los períodos de una empresa (todos los estados), más recientes primero."""
        query = supabase_admin.table(_TABLE).select("*")
        if empresa_id:
            query = query.eq("empresa_id", str(empresa_id))
        result = query.order("cerrado_at", desc=True).execute()
        return [_row(r) for r in result.data]

    def find_cerrados(self, empresa_id: UUID, modulo: Optional[str]) -> List[PeriodoResponse]:
        """Períodos CERRADOS de la empresa que aplican a `modulo`: los del módulo + los globales
        (modulo IS NULL). Con modulo=None solo devuelve los globales."""
        query = supabase_admin.table(_TABLE).select("*").eq(
            "empresa_id", str(empresa_id)
        ).eq("estado", "cerrado")
        query = query.or_(f"modulo.eq.{modulo},modulo.is.null") if modulo else query.is_("modulo", "null")
        return [_row(r) for r in query.execute().data]

    def find_by_id(self, id: str) -> Optional[PeriodoResponse]:
        """Busca un período por UUID. Devuelve None si no existe."""
        result = supabase_admin.table(_TABLE).select("*").eq("id", id).maybe_single().execute()
        return _row(result.data) if result and result.data else None

    def reabrir(self, id: str, usuario_id: Optional[str]) -> None:
        """Reabre un período: estado='abierto' + traza de reapertura (no borra la fila)."""
        supabase_admin.table(_TABLE).update({
            "estado": "abierto",
            "reabierto_por": usuario_id,
            "reabierto_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", id).execute()
