"""Repositorio de horas_proyecto. Acceso a Supabase con supabase_admin."""
from typing import List, Optional, Tuple

from integrations.supabase_client import supabase_admin
from schemas.proyectos import HoraResponse
from utils.errors import AppError

_T = "horas_proyecto"


def _build(rows: List[dict]) -> List[HoraResponse]:
    """Enriquece con empleado_nombre y empresa_nombre del empleado vía la asignación."""
    if not rows:
        return []
    asig_ids = list({r["asignacion_id"] for r in rows})
    asig_data = (supabase_admin.table("proyecto_asignaciones")
                 .select("id, empleado_id, empleado_empresa_id")
                 .in_("id", asig_ids).execute().data or [])
    emp_ids = list({a["empleado_id"] for a in asig_data}) if asig_data else []
    emp_empresa_ids = list({a["empleado_empresa_id"] for a in asig_data}) if asig_data else []
    emp_map = (
        {e["id"]: f"{e['nombre']} {e['apellido']}"
         for e in (supabase_admin.table("empleados").select("id, nombre, apellido")
                   .in_("id", emp_ids).execute().data or [])}
        if emp_ids else {}
    )
    empresa_map = (
        {e["id"]: e["nombre"]
         for e in (supabase_admin.table("empresas").select("id, nombre")
                   .in_("id", emp_empresa_ids).execute().data or [])}
        if emp_empresa_ids else {}
    )
    asig_map = {a["id"]: a for a in asig_data}
    result = []
    for r in rows:
        asig = asig_map.get(r["asignacion_id"], {})
        h = float(r["horas"])
        snap = float(r["valor_hora_snapshot"])
        result.append(HoraResponse.model_validate({
            **r,
            "empleado_nombre": emp_map.get(asig.get("empleado_id", "")),
            "empleado_empresa_nombre": empresa_map.get(asig.get("empleado_empresa_id", "")),
            "costo": round(h * snap, 2),
        }))
    return result


class HorasRepo:
    def find_by_proyecto(self, proyecto_id: str, page: int = 1, page_size: int = 20) -> Tuple[List[HoraResponse], int]:
        """Retorna (página de horas del proyecto, más reciente primero, total real)."""
        res = (supabase_admin.table(_T).select("*", count="exact")
               .eq("proyecto_id", proyecto_id).order("fecha", desc=True)
               .range((page - 1) * page_size, page * page_size - 1).execute())
        return _build(res.data or []), res.count or 0

    def find_by_asignacion(self, asignacion_id: str) -> List[HoraResponse]:
        rows = (supabase_admin.table(_T).select("*")
                .eq("asignacion_id", asignacion_id).order("fecha", desc=True).execute().data or [])
        return _build(rows)

    def save(
        self, asignacion_id: str, proyecto_id: str, empresa_id: str,
        empleado_empresa_id: str, fecha: str, horas: float,
        valor_hora_snapshot: float, descripcion: Optional[str], cargado_por: Optional[str],
    ) -> HoraResponse:
        """Inserta registro inmutable. valor_hora_snapshot ya congelado por el service."""
        payload: dict = {
            "asignacion_id": asignacion_id, "proyecto_id": proyecto_id,
            "empresa_id": empresa_id, "empleado_empresa_id": empleado_empresa_id,
            "fecha": fecha, "horas": horas, "valor_hora_snapshot": valor_hora_snapshot,
        }
        if descripcion:
            payload["descripcion"] = descripcion
        if cargado_por:
            payload["cargado_por"] = cargado_por
        res = supabase_admin.table(_T).insert(payload).execute()
        if not res.data:
            raise AppError("Error al registrar las horas", "DB_ERROR", 500)
        rows = supabase_admin.table(_T).select("*").eq("id", str(res.data[0]["id"])).execute().data or []
        return _build(rows)[0]

    def find_proyecto_id(self, hora_id: str) -> Optional[str]:
        """Retorna proyecto_id del registro de horas. None si no existe."""
        res = supabase_admin.table(_T).select("proyecto_id").eq("id", hora_id).maybe_single().execute()
        return str(res.data["proyecto_id"]) if res.data else None

    def delete(self, id: str) -> bool:
        return bool(supabase_admin.table(_T).delete().eq("id", id).execute().data)
