"""Repositorio de ciclos de evaluación de desempeño."""
from datetime import date
from typing import List, Optional
from uuid import UUID

from integrations.supabase_client import supabase_admin
from schemas.evaluaciones import CicloCreate, CicloResponse
from utils.errors import AppError

_TC = "ev_ciclos"


def _build(r: dict, total_inst: int = 0) -> CicloResponse:
    plantilla = r.get("ev_plantillas") or {}
    empresa = r.get("empresas") or {}
    return CicloResponse(
        id=r["id"], empresa_id=r["empresa_id"],
        empresa_nombre=empresa.get("nombre") or r.get("_empresa_nombre"),
        plantilla_id=r["plantilla_id"],
        plantilla_nombre=plantilla.get("nombre") or r.get("_plantilla_nombre"),
        plantilla_tipo_escala=plantilla.get("tipo_escala") or r.get("_tipo_escala"),
        nombre=r["nombre"],
        fecha_inicio=r["fecha_inicio"], fecha_fin=r["fecha_fin"],
        estado=r["estado"], total_instancias=total_inst,
    )


_SEL = "*, ev_plantillas(nombre, tipo_escala), empresas(nombre)"


class EvCiclosRepo:
    def find_all(self, empresa_id: Optional[UUID] = None) -> List[CicloResponse]:
        """Retorna ciclos con nombre de plantilla y empresa, filtrados por empresa."""
        q = supabase_admin.table(_TC).select(_SEL).order("fecha_inicio", desc=True)
        if empresa_id:
            q = q.eq("empresa_id", str(empresa_id))
        rows = q.execute().data or []
        ids = [r["id"] for r in rows]
        counts: dict[str, int] = {}
        if ids:
            cnt_rows = supabase_admin.table("ev_instancias").select("ciclo_id").in_("ciclo_id", ids).execute().data or []
            for c in cnt_rows:
                counts[c["ciclo_id"]] = counts.get(c["ciclo_id"], 0) + 1
        return [_build(r, counts.get(r["id"], 0)) for r in rows]

    def find_by_id(self, id: str, empresa_id: Optional[UUID] = None) -> Optional[CicloResponse]:
        q = supabase_admin.table(_TC).select(_SEL).eq("id", id)
        if empresa_id:
            q = q.eq("empresa_id", str(empresa_id))
        res = q.maybe_single().execute()
        if not (res and res.data):
            return None
        cnt = supabase_admin.table("ev_instancias").select("id").eq("ciclo_id", id).execute().data or []
        return _build(res.data, len(cnt))

    def save(self, data: CicloCreate, empresa_id: str) -> CicloResponse:
        """Inserta ciclo heredando empresa_id de la plantilla."""
        res = supabase_admin.table(_TC).insert({
            "empresa_id": empresa_id, "plantilla_id": str(data.plantilla_id),
            "nombre": data.nombre.strip(),
            "fecha_inicio": str(data.fecha_inicio), "fecha_fin": str(data.fecha_fin),
        }).execute()
        if not res.data:
            raise AppError("Error al crear el ciclo", "DB_ERROR", 500)
        return self.find_by_id(res.data[0]["id"])  # type: ignore[return-value]

    def update(self, id: str, empresa_id: Optional[UUID], payload: dict) -> Optional[CicloResponse]:
        if payload:
            q = supabase_admin.table(_TC).update(payload).eq("id", id)
            if empresa_id:
                q = q.eq("empresa_id", str(empresa_id))
            q.execute()
        return self.find_by_id(id, empresa_id)

    def cerrar(self, id: str, empresa_id: Optional[UUID] = None) -> bool:
        q = supabase_admin.table(_TC).update({"estado": "cerrado"}).eq("id", id)
        if empresa_id:
            q = q.eq("empresa_id", str(empresa_id))
        return bool(q.execute().data)

    def get_empresa_id(self, id: str) -> Optional[str]:
        """Retorna empresa_id del ciclo para herencia al crear instancias."""
        res = supabase_admin.table(_TC).select("empresa_id").eq("id", id).maybe_single().execute()
        return str(res.data["empresa_id"]) if res and res.data else None
