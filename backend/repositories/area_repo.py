"""
Repositorio de áreas. Acceso directo a Supabase con supabase_admin.
Interfaz pública: find_all · find_by_id · save · update · delete
"""
from typing import List, Optional

from integrations.supabase_client import supabase_admin
from schemas.area import AreaCreate, AreaResponse, AreaUpdate

_TABLE = "areas"
_EMPLEADOS_TABLE = "empleados"


def _counts_by_area() -> dict[str, int]:
    res = (
        supabase_admin.table(_EMPLEADOS_TABLE)
        .select("area_id", count="exact")
        .eq("estado", "activo")
        .execute()
    )
    counts: dict[str, int] = {}
    for row in (res.data or []):
        aid = row.get("area_id")
        if aid:
            counts[aid] = counts.get(aid, 0) + 1
    return counts


def _to_response(row: dict, counts: dict[str, int]) -> AreaResponse:
    return AreaResponse(
        id=str(row["id"]),
        nombre=row["nombre"],
        descripcion=row.get("descripcion"),
        responsable_id=str(row["responsable_id"]) if row.get("responsable_id") else None,
        cantidad_empleados=counts.get(str(row["id"]), 0),
        created_at=row["created_at"],
    )


class AreaRepo:
    def find_all(self) -> List[AreaResponse]:
        res = (
            supabase_admin.table(_TABLE)
            .select("id, nombre, descripcion, responsable_id, created_at")
            .eq("activo", True)
            .order("nombre")
            .execute()
        )
        counts = _counts_by_area()
        return [_to_response(r, counts) for r in (res.data or [])]

    def find_by_id(self, id: str) -> Optional[AreaResponse]:
        res = (
            supabase_admin.table(_TABLE)
            .select("id, nombre, descripcion, responsable_id, created_at")
            .eq("id", id)
            .eq("activo", True)
            .single()
            .execute()
        )
        if not res.data:
            return None
        counts = _counts_by_area()
        return _to_response(res.data, counts)

    def save(self, data: AreaCreate) -> AreaResponse:
        payload = data.model_dump(exclude_none=True)
        res = supabase_admin.table(_TABLE).insert(payload).execute()
        counts = _counts_by_area()
        return _to_response(res.data[0], counts)

    def update(self, id: str, data: AreaUpdate) -> Optional[AreaResponse]:
        patch = data.model_dump(exclude_none=True)
        if not patch:
            return self.find_by_id(id)
        res = (
            supabase_admin.table(_TABLE)
            .update(patch)
            .eq("id", id)
            .execute()
        )
        if not res.data:
            return None
        counts = _counts_by_area()
        return _to_response(res.data[0], counts)

    def delete(self, id: str) -> bool:
        res = (
            supabase_admin.table(_TABLE)
            .update({"activo": False})
            .eq("id", id)
            .execute()
        )
        return bool(res.data)
