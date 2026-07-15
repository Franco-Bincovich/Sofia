"""
Repositorio de adjuntos genéricos — queries reales a Supabase.
Interfaz pública: crear · find_by_entidad · find_by_id · marcar_eliminado
El acceso va siempre con service_key (supabase_admin); el control de permisos es app-level.
"""
from typing import List, Optional
from uuid import UUID

from integrations.supabase_client import supabase_admin
from schemas.adjunto import Adjunto
from utils.errors import AppError
from utils.logger import logger

_TABLE = "adjuntos"


def _row(r: dict) -> Adjunto:
    """Convierte un dict de Supabase en Adjunto."""
    return Adjunto.model_validate(r)


class AdjuntoRepo:
    def crear(self, datos: dict) -> Adjunto:
        """Inserta un adjunto (descarta claves None) y devuelve el registro creado."""
        payload = {k: v for k, v in datos.items() if v is not None}
        result = supabase_admin.table(_TABLE).insert(payload).execute()
        if not result.data:
            logger.error("Supabase insert vacío en adjuntos")
            raise AppError("Error al guardar el adjunto", "DB_ERROR", 500)
        return _row(result.data[0])

    def find_by_entidad(
        self, entidad: str, entidad_id: str, empresa_id: Optional[UUID] = None
    ) -> List[Adjunto]:
        """Lista los adjuntos ACTIVOS de una entidad (más recientes primero).
        Si empresa_id se provee, restringe a esa empresa."""
        query = (
            supabase_admin.table(_TABLE)
            .select("*")
            .eq("entidad", entidad)
            .eq("entidad_id", entidad_id)
            .eq("estado", "activo")
        )
        if empresa_id:
            query = query.eq("empresa_id", str(empresa_id))
        result = query.order("es_principal", desc=True).order("created_at", desc=True).execute()
        return [_row(r) for r in result.data]

    def find_by_id(self, id: str) -> Optional[Adjunto]:
        """Busca un adjunto por UUID (cualquier estado). Devuelve None si no existe."""
        result = supabase_admin.table(_TABLE).select("*").eq("id", id).maybe_single().execute()
        return _row(result.data) if result and result.data else None

    def marcar_eliminado(self, id: str) -> None:
        """Soft delete: estado='eliminado'. El objeto queda intacto en Storage."""
        supabase_admin.table(_TABLE).update({"estado": "eliminado"}).eq("id", id).execute()

    def set_principal(self, id: str, valor: bool) -> None:
        """Setea es_principal en un adjunto puntual."""
        supabase_admin.table(_TABLE).update({"es_principal": valor}).eq("id", id).execute()

    def desmarcar_principales(self, entidad: str, entidad_id: str) -> None:
        """Pone es_principal=False en TODOS los adjuntos activos de la entidad (una sola principal)."""
        supabase_admin.table(_TABLE).update({"es_principal": False}).eq("entidad", entidad).eq(
            "entidad_id", entidad_id
        ).eq("estado", "activo").execute()
