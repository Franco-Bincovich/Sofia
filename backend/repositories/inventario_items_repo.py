"""Repositorio de inventario_items. Acceso a Supabase con supabase_admin."""
from typing import List, Optional
from uuid import UUID

from integrations.supabase_client import supabase_admin
from schemas.inventario import ItemCreate, ItemResponse, ItemUpdate
from utils.errors import AppError
from utils.logger import logger

_T = "inventario_items"


def _build(rows: List[dict]) -> List[ItemResponse]:
    """Enriquece filas con empresa_nombre y asignado_a (empleado con asignación activa)."""
    if not rows:
        return []
    empresa_map = {
        e["id"]: e["nombre"]
        for e in (supabase_admin.table("empresas").select("id, nombre")
                  .in_("id", list({r["empresa_id"] for r in rows})).execute().data or [])
    }
    item_ids = [r["id"] for r in rows]
    asig_data = (supabase_admin.table("inventario_asignaciones")
                 .select("item_id, empleado_id").in_("item_id", item_ids)
                 .is_("fecha_devolucion", "null").execute().data or [])
    emp_ids = list({a["empleado_id"] for a in asig_data})
    emp_map: dict = {}
    if emp_ids:
        emp_map = {
            e["id"]: f"{e['nombre']} {e['apellido']}"
            for e in (supabase_admin.table("empleados").select("id, nombre, apellido")
                      .in_("id", emp_ids).execute().data or [])
        }
    asig_map = {a["item_id"]: emp_map.get(a["empleado_id"]) for a in asig_data}
    return [
        ItemResponse.model_validate({**r, "empresa_nombre": empresa_map.get(r["empresa_id"]),
                                     "asignado_a": asig_map.get(r["id"])})
        for r in rows
    ]


class InventarioItemsRepo:
    def find_all(self, empresa_id: Optional[UUID] = None, estado: Optional[str] = None) -> List[ItemResponse]:
        """Retorna ítems filtrados por empresa y/o estado, ordenados por nombre."""
        q = supabase_admin.table(_T).select("*").order("nombre")
        if empresa_id:
            q = q.eq("empresa_id", str(empresa_id))
        if estado:
            q = q.eq("estado", estado)
        return _build(q.execute().data or [])

    def find_by_id(self, id: str, empresa_id: Optional[UUID] = None) -> Optional[ItemResponse]:
        q = supabase_admin.table(_T).select("*").eq("id", id)
        if empresa_id:
            q = q.eq("empresa_id", str(empresa_id))
        res = q.maybe_single().execute()
        return _build([res.data])[0] if res.data else None

    def find_empresa_for(self, id: str) -> Optional[str]:
        """Retorna empresa_id del ítem, o None si no existe."""
        res = supabase_admin.table(_T).select("empresa_id").eq("id", id).maybe_single().execute()
        return str(res.data["empresa_id"]) if res.data else None

    def has_asignaciones(self, id: str) -> bool:
        """True si el ítem tiene al menos una asignación (histórica o activa)."""
        res = supabase_admin.table("inventario_asignaciones").select("id").eq("item_id", id).limit(1).execute()
        return bool(res.data)

    def save(self, data: ItemCreate) -> ItemResponse:
        """Inserta un ítem y retorna el registro enriquecido."""
        payload = {k: v for k, v in data.model_dump().items() if v is not None}
        payload["empresa_id"] = str(data.empresa_id)
        if data.fecha_alta:
            payload["fecha_alta"] = str(data.fecha_alta)
        res = supabase_admin.table(_T).insert(payload).execute()
        if not res.data:
            logger.error("Supabase insert vacío en inventario_items")
            raise AppError("Error al crear el ítem", "DB_ERROR", 500)
        return self.find_by_id(str(res.data[0]["id"]))  # type: ignore[return-value]

    def update(self, id: str, data: ItemUpdate, empresa_id: Optional[UUID] = None) -> Optional[ItemResponse]:
        patch = {k: v for k, v in data.model_dump(exclude_none=True).items()}
        if patch:
            q = supabase_admin.table(_T).update(patch).eq("id", id)
            if empresa_id:
                q = q.eq("empresa_id", str(empresa_id))
            q.execute()
        return self.find_by_id(id, empresa_id)

    def set_estado(self, id: str, estado: str) -> None:
        """Actualiza solo el estado del ítem (llamado por el service de asignaciones)."""
        supabase_admin.table(_T).update({"estado": estado}).eq("id", id).execute()

    def delete(self, id: str, empresa_id: Optional[UUID] = None) -> bool:
        q = supabase_admin.table(_T).delete().eq("id", id)
        if empresa_id:
            q = q.eq("empresa_id", str(empresa_id))
        return bool(q.execute().data)
