"""Repositorio de plantillas y criterios de evaluación de desempeño."""
from typing import List, Optional
from uuid import UUID

from integrations.supabase_client import supabase_admin
from schemas.evaluaciones import (
    CriterioCreate, CriterioResponse, PlantillaCreate, PlantillaResponse,
)
from utils.errors import AppError

_TP, _TC = "ev_plantillas", "ev_criterios"


def _crit(r: dict) -> CriterioResponse:
    return CriterioResponse(
        id=r["id"], plantilla_id=r["plantilla_id"], empresa_id=r["empresa_id"],
        nombre=r["nombre"], descripcion=r.get("descripcion"),
        peso=float(r.get("peso", 1)), orden=r.get("orden", 1),
    )


def _plantilla(r: dict, criterios: Optional[List[dict]] = None) -> PlantillaResponse:
    crits = [_crit(c) for c in (criterios or r.get("ev_criterios") or [])]
    return PlantillaResponse(
        id=r["id"], empresa_id=r["empresa_id"],
        empresa_nombre=r.get("_empresa_nombre"),
        nombre=r["nombre"], descripcion=r.get("descripcion"),
        tipo_escala=r["tipo_escala"], escala_min=r.get("escala_min"),
        escala_max=r.get("escala_max"),
        opciones_cualitativas=r.get("opciones_cualitativas"),
        activa=r.get("activa", True),
        area_id=r.get("area_id"), area_nombre=r.get("_area_nombre"),
        criterios=sorted(crits, key=lambda c: c.orden),
        created_at=r.get("created_at"),
    )


def _enrich(rows: List[dict]) -> List[PlantillaResponse]:
    if not rows:
        return []
    emp_ids = list({r["empresa_id"] for r in rows})
    area_ids = list({r["area_id"] for r in rows if r.get("area_id")})
    emp_map = {e["id"]: e["nombre"] for e in
               supabase_admin.table("empresas").select("id,nombre").in_("id", emp_ids).execute().data or []}
    area_map = {}
    if area_ids:
        area_map = {a["id"]: a["nombre"] for a in
                    supabase_admin.table("areas").select("id,nombre").in_("id", area_ids).execute().data or []}
    result = []
    for r in rows:
        r["_empresa_nombre"] = emp_map.get(r["empresa_id"])
        r["_area_nombre"] = area_map.get(r.get("area_id", ""))
        result.append(_plantilla(r))
    return result


class EvPlantillasRepo:
    def find_all(self, empresa_id: Optional[UUID] = None, solo_activas: bool = True) -> List[PlantillaResponse]:
        """Retorna plantillas con sus criterios, filtradas por empresa."""
        q = supabase_admin.table(_TP).select(f"*, {_TC}(*)").order("nombre")
        if empresa_id:
            q = q.eq("empresa_id", str(empresa_id))
        if solo_activas:
            q = q.eq("activa", True)
        return _enrich(q.execute().data or [])

    def find_by_id(self, id: str, empresa_id: Optional[UUID] = None) -> Optional[PlantillaResponse]:
        q = supabase_admin.table(_TP).select(f"*, {_TC}(*)").eq("id", id)
        if empresa_id:
            q = q.eq("empresa_id", str(empresa_id))
        res = q.maybe_single().execute()
        return _enrich([res.data])[0] if res and res.data else None

    def save(self, data: PlantillaCreate) -> PlantillaResponse:
        """Inserta plantilla y retorna el registro enriquecido."""
        payload = {k: v for k, v in {
            "empresa_id": str(data.empresa_id), "nombre": data.nombre.strip(),
            "descripcion": data.descripcion, "tipo_escala": data.tipo_escala,
            "escala_min": data.escala_min, "escala_max": data.escala_max,
            "opciones_cualitativas": data.opciones_cualitativas,
            "area_id": str(data.area_id) if data.area_id else None,
        }.items() if v is not None}
        res = supabase_admin.table(_TP).insert(payload).execute()
        if not res.data:
            raise AppError("Error al crear la plantilla", "DB_ERROR", 500)
        return self.find_by_id(res.data[0]["id"])  # type: ignore[return-value]

    def update(self, id: str, empresa_id: Optional[UUID], payload: dict) -> Optional[PlantillaResponse]:
        if payload:
            q = supabase_admin.table(_TP).update(payload).eq("id", id)
            if empresa_id:
                q = q.eq("empresa_id", str(empresa_id))
            q.execute()
        return self.find_by_id(id, empresa_id)

    def delete(self, id: str, empresa_id: Optional[UUID] = None) -> bool:
        q = supabase_admin.table(_TP).delete().eq("id", id)
        if empresa_id:
            q = q.eq("empresa_id", str(empresa_id))
        return bool(q.execute().data)

    def has_ciclos(self, id: str) -> bool:
        res = supabase_admin.table("ev_ciclos").select("id").eq("plantilla_id", id).limit(1).execute()
        return bool(res.data)

    # ── Criterios ─────────────────────────────────────────────────────────────

    def find_criterios(self, plantilla_id: str) -> List[CriterioResponse]:
        rows = supabase_admin.table(_TC).select("*").eq("plantilla_id", plantilla_id).order("orden").execute().data or []
        return [_crit(r) for r in rows]

    def add_criterio(self, plantilla_id: str, empresa_id: str, data: CriterioCreate) -> CriterioResponse:
        res = supabase_admin.table(_TC).insert({
            "plantilla_id": plantilla_id, "empresa_id": empresa_id,
            "nombre": data.nombre.strip(), "descripcion": data.descripcion,
            "peso": data.peso, "orden": data.orden,
        }).execute()
        if not res.data:
            raise AppError("Error al crear el criterio", "DB_ERROR", 500)
        return _crit(res.data[0])

    def update_criterio(self, criterio_id: str, empresa_id: str, payload: dict) -> Optional[CriterioResponse]:
        if payload:
            supabase_admin.table(_TC).update(payload).eq("id", criterio_id).eq("empresa_id", empresa_id).execute()
        res = supabase_admin.table(_TC).select("*").eq("id", criterio_id).maybe_single().execute()
        return _crit(res.data) if res and res.data else None

    def delete_criterio(self, criterio_id: str, empresa_id: str) -> bool:
        return bool(supabase_admin.table(_TC).delete().eq("id", criterio_id).eq("empresa_id", empresa_id).execute().data)
