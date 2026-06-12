"""Helpers internos del módulo de vacaciones. No importar desde fuera de repositories/."""
from typing import List

from integrations.supabase_client import supabase_admin
from schemas.vacaciones import SolicitudVacacionesResponse


def build_responses(rows: List[dict]) -> List[SolicitudVacacionesResponse]:
    """Enriquece filas con empresa_nombre, empleado_nombre, area_id y area_nombre via batch queries."""
    if not rows:
        return []

    empresa_ids = list({r["empresa_id"] for r in rows})
    empresa_map = {
        e["id"]: e["nombre"]
        for e in (supabase_admin.table("empresas").select("id, nombre").in_("id", empresa_ids).execute().data or [])
    }

    emp_ids = list({r["empleado_id"] for r in rows})
    emp_data = supabase_admin.table("empleados").select("id, nombre, apellido, area_id").in_("id", emp_ids).execute().data or []
    emp_map = {e["id"]: {"nombre": f"{e['nombre']} {e['apellido']}", "area_id": e.get("area_id")} for e in emp_data}

    area_ids = list({e["area_id"] for e in emp_data if e.get("area_id")})
    area_map: dict = {}
    if area_ids:
        area_map = {
            a["id"]: a["nombre"]
            for a in (supabase_admin.table("areas").select("id, nombre").in_("id", area_ids).execute().data or [])
        }

    result = []
    for r in rows:
        emp = emp_map.get(r["empleado_id"]) or {}
        aid = emp.get("area_id")
        result.append(SolicitudVacacionesResponse.model_validate({
            **r,
            "empresa_nombre": empresa_map.get(r["empresa_id"]),
            "empleado_nombre": emp.get("nombre"),
            "area_id": aid,
            "area_nombre": area_map.get(aid) if aid else None,
            "estado": "",
        }))
    return result
