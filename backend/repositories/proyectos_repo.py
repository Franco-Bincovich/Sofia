"""Repositorio de proyectos. Acceso a Supabase con supabase_admin."""
from typing import Dict, List, Optional
from uuid import UUID

from integrations.supabase_client import supabase_admin
from schemas.proyectos import CosteoResumen, ProyectoCreate, ProyectoResponse
from utils.errors import AppError

_T = "proyectos"


def _build(rows: List[dict], costo_map: Dict[str, float]) -> List[ProyectoResponse]:
    """Enriquece filas con empresa_nombre y costeo calculado en batch."""
    if not rows:
        return []
    emp_ids = list({r["empresa_id"] for r in rows})
    empresa_map = {
        e["id"]: e["nombre"]
        for e in (supabase_admin.table("empresas").select("id, nombre")
                  .in_("id", emp_ids).execute().data or [])
    }
    result = []
    for r in rows:
        costo = round(costo_map.get(r["id"], 0.0), 2)
        ppto = float(r.get("presupuesto") or 0)
        restante = round(ppto - costo, 2)
        pct = round(costo / ppto * 100, 1) if ppto > 0 else None
        result.append(ProyectoResponse.model_validate({
            **r,
            "empresa_nombre": empresa_map.get(r["empresa_id"]),
            "costeo": CosteoResumen(
                costo_acumulado=costo,
                presupuesto_restante=restante,
                pct_consumido=pct,
            ),
        }))
    return result


class ProyectosRepo:
    def find_all(self, empresa_id: Optional[UUID] = None, estado: Optional[str] = None) -> List[ProyectoResponse]:
        """Proyectos de la empresa dueña (None = todas), con costeo batch."""
        q = supabase_admin.table(_T).select("*").order("created_at", desc=True)
        if empresa_id:
            q = q.eq("empresa_id", str(empresa_id))
        if estado:
            q = q.eq("estado", estado)
        rows = q.execute().data or []
        if not rows:
            return []
        return _build(rows, self._batch_costos([r["id"] for r in rows]))

    def find_by_id(self, id: str, empresa_id: Optional[UUID] = None) -> Optional[ProyectoResponse]:
        q = supabase_admin.table(_T).select("*").eq("id", id)
        if empresa_id:
            q = q.eq("empresa_id", str(empresa_id))
        res = q.maybe_single().execute()
        if not res.data:
            return None
        return _build([res.data], self._batch_costos([res.data["id"]]))[0]

    def find_empresa_for(self, proyecto_id: str) -> Optional[str]:
        """Retorna empresa_id (dueña) del proyecto."""
        res = supabase_admin.table(_T).select("empresa_id").eq("id", proyecto_id).maybe_single().execute()
        return str(res.data["empresa_id"]) if res.data else None

    def save(self, data: ProyectoCreate) -> ProyectoResponse:
        payload = {k: (str(v) if isinstance(v, UUID) else (str(v) if hasattr(v, "isoformat") else v))
                   for k, v in data.model_dump().items() if v is not None}
        res = supabase_admin.table(_T).insert(payload).execute()
        if not res.data:
            raise AppError("Error al crear el proyecto", "DB_ERROR", 500)
        return self.find_by_id(str(res.data[0]["id"]))  # type: ignore[return-value]

    def update(self, id: str, patch: dict, empresa_id: Optional[UUID] = None) -> Optional[ProyectoResponse]:
        if patch:
            q = supabase_admin.table(_T).update(patch).eq("id", id)
            if empresa_id:
                q = q.eq("empresa_id", str(empresa_id))
            q.execute()
        return self.find_by_id(id, empresa_id)

    def delete(self, id: str, empresa_id: Optional[UUID] = None) -> bool:
        q = supabase_admin.table(_T).delete().eq("id", id)
        if empresa_id:
            q = q.eq("empresa_id", str(empresa_id))
        return bool(q.execute().data)

    def has_horas(self, proyecto_id: str) -> bool:
        res = supabase_admin.table("horas_proyecto").select("id").eq("proyecto_id", proyecto_id).limit(1).execute()
        return bool(res.data)

    def _batch_costos(self, proyecto_ids: List[str]) -> Dict[str, float]:
        """SUM(horas × valor_hora_snapshot) por proyecto en una sola query."""
        if not proyecto_ids:
            return {}
        rows = (supabase_admin.table("horas_proyecto")
                .select("proyecto_id, horas, valor_hora_snapshot")
                .in_("proyecto_id", proyecto_ids).execute().data or [])
        costos: Dict[str, float] = {}
        for r in rows:
            pid = r["proyecto_id"]
            costos[pid] = costos.get(pid, 0.0) + float(r["horas"]) * float(r["valor_hora_snapshot"])
        return costos
