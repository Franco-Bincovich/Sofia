"""
Repositorio de sucesión — mapa de talento y análisis por posición.
Interfaz: get_mapa_talento · get_analisis_posicion
Planes de carrera e hitos → ver planes_carrera_repo.py
"""
import json
from typing import Optional
from uuid import UUID

from integrations.supabase_client import supabase_admin
from schemas.sucesion import EmpleadoAnalisisResponse, EmpleadoMapaResponse

_EMP = "empleados"
_AREA = "areas!empleados_area_id_fkey(nombre)"


def _with_empresa(q, empresa_id: Optional[UUID]):
    return q.eq("empresa_id", str(empresa_id)) if empresa_id else q


def _mapa_row(r: dict) -> EmpleadoMapaResponse:
    area = r.get("areas") or {}
    empresa = r.get("empresas") or {}
    return EmpleadoMapaResponse(
        id=r["id"], nombre=r["nombre"], apellido=r["apellido"],
        cargo=r.get("cargo"), area_id=r.get("area_id"), area_nombre=area.get("nombre"),
        empresa_id=r.get("empresa_id"), empresa_nombre=empresa.get("nombre"),
        potencial=r.get("potencial", "medio"), desempeno=r.get("desempeno", "medio"),
    )


def _parse_json_field(value):
    """Parsea un campo JSONB que Supabase puede devolver como string en vez de dict/list."""
    if value is None:
        return None
    if isinstance(value, str):
        try:
            return json.loads(value)
        except Exception:
            return None
    return value


class SucesionRepo:
    def get_mapa_talento(self, empresa_id: Optional[UUID] = None) -> list[EmpleadoMapaResponse]:
        q = supabase_admin.table(_EMP).select(
            f"id,empresa_id,nombre,apellido,cargo,area_id,potencial,desempeno,{_AREA},empresas(nombre)"
        ).eq("estado", "activo")
        return [_mapa_row(r) for r in (_with_empresa(q, empresa_id).execute().data or [])]

    def get_analisis_posicion(self, area_id: str, empresa_id: Optional[UUID] = None) -> list[EmpleadoAnalisisResponse]:
        q = supabase_admin.table(_EMP).select(
            "id, nombre, apellido, cargo, potencial, desempeno"
        ).eq("area_id", area_id).neq("estado", "baja")
        emps_res = _with_empresa(q, empresa_id).execute()

        rows: list[EmpleadoAnalisisResponse] = []
        for r in (emps_res.data or []):
            score: Optional[int] = None
            ar = supabase_admin.table("assessment_resultados").select(
                "empleado_id, puntuacion"
            ).eq("empleado_id", r["id"]).order("completado_en", desc=True).limit(1).execute()
            if ar.data:
                puntuacion = _parse_json_field(ar.data[0].get("puntuacion")) or {}
                sg = puntuacion.get("general") or puntuacion.get("total")
                if sg is not None:
                    try:
                        score = int(sg)
                    except (ValueError, TypeError):
                        score = None
            rows.append(EmpleadoAnalisisResponse(
                id=r["id"], nombre=r["nombre"], apellido=r["apellido"],
                cargo=r.get("cargo"), score=score,
                potencial=r.get("potencial"), desempeno=r.get("desempeno"),
            ))
        rows.sort(key=lambda x: (x.score is None, -(x.score or 0)))
        return rows
