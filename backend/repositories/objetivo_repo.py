"""Repositorio de objetivos. Acceso a Supabase con supabase_admin."""
from typing import List, Optional
from uuid import UUID

from integrations.supabase_client import supabase_admin
from schemas.objetivo import ObjetivoCreate, ObjetivoResponse, ObjetivoUpdate
from utils.errors import AppError
from utils.logger import logger

_T = "objetivos"


def _build(rows: List[dict]) -> List[ObjetivoResponse]:
    """Enriquece filas con empresa_nombre y responsable_nombre (desde users)."""
    if not rows:
        return []
    empresa_map = {
        e["id"]: e["nombre"]
        for e in (supabase_admin.table("empresas").select("id, nombre")
                  .in_("id", list({r["empresa_id"] for r in rows})).execute().data or [])
    }
    user_map = {
        u["id"]: f"{u['nombre']} {u['apellido']}"
        for u in (supabase_admin.table("users").select("id, nombre, apellido")
                  .in_("id", list({r["responsable_id"] for r in rows})).execute().data or [])
    }
    return [
        ObjetivoResponse.model_validate({
            **r,
            "empresa_nombre":    empresa_map.get(r["empresa_id"]),
            "responsable_nombre": user_map.get(r["responsable_id"]),
        })
        for r in rows
    ]


class ObjetivoRepo:
    def find_all(
        self,
        empresa_id:     Optional[UUID] = None,
        estado:         Optional[str]  = None,
        responsable_id: Optional[str]  = None,
        prioridad:      Optional[str]  = None,
    ) -> List[ObjetivoResponse]:
        """Retorna objetivos con filtros opcionales, ordenados por fecha_entrega (nulos al final)."""
        q = supabase_admin.table(_T).select("*").order("fecha_entrega", desc=False)
        if empresa_id:     q = q.eq("empresa_id",     str(empresa_id))
        if estado:         q = q.eq("estado",         estado)
        if responsable_id: q = q.eq("responsable_id", responsable_id)
        if prioridad:      q = q.eq("prioridad",      prioridad)
        return _build(q.execute().data or [])

    def find_by_id(self, id: str, empresa_id: Optional[UUID] = None) -> Optional[ObjetivoResponse]:
        q = supabase_admin.table(_T).select("*").eq("id", id)
        if empresa_id:
            q = q.eq("empresa_id", str(empresa_id))
        res = q.maybe_single().execute()
        return _build([res.data])[0] if res.data else None

    def save(self, data: ObjetivoCreate) -> ObjetivoResponse:
        """Inserta un objetivo y retorna el registro enriquecido."""
        payload: dict = {
            "empresa_id":     str(data.empresa_id),
            "responsable_id": str(data.responsable_id),
            "titulo":         data.titulo.strip(),
            "prioridad":      data.prioridad,
        }
        if data.descripcion:   payload["descripcion"]   = data.descripcion
        if data.fecha_entrega: payload["fecha_entrega"] = str(data.fecha_entrega)
        res = supabase_admin.table(_T).insert(payload).execute()
        if not res.data:
            logger.error("Supabase insert vacío en objetivos")
            raise AppError("Error al crear el objetivo", "DB_ERROR", 500)
        return self.find_by_id(str(res.data[0]["id"]))  # type: ignore[return-value]

    def update(self, id: str, data: ObjetivoUpdate, empresa_id: Optional[UUID] = None) -> Optional[ObjetivoResponse]:
        patch: dict = {}
        for k, v in data.model_dump(exclude_none=True).items():
            patch[k] = str(v) if k in ("responsable_id", "fecha_entrega") else v
        if patch:
            q = supabase_admin.table(_T).update(patch).eq("id", id)
            if empresa_id:
                q = q.eq("empresa_id", str(empresa_id))
            q.execute()
        return self.find_by_id(id, empresa_id)

    def set_estado(self, id: str, estado: str, empresa_id: Optional[UUID] = None) -> Optional[ObjetivoResponse]:
        """Actualiza solo el estado (alimenta el movimiento kanban)."""
        q = supabase_admin.table(_T).update({"estado": estado}).eq("id", id)
        if empresa_id:
            q = q.eq("empresa_id", str(empresa_id))
        q.execute()
        return self.find_by_id(id, empresa_id)

    def delete(self, id: str, empresa_id: Optional[UUID] = None) -> bool:
        q = supabase_admin.table(_T).delete().eq("id", id)
        if empresa_id:
            q = q.eq("empresa_id", str(empresa_id))
        return bool(q.execute().data)
