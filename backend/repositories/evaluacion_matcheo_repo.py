"""
Repositorio del matcheo de evaluaciones (service_key; control app-level). Dos accesos:
la tabla de equivalencias confirmadas (evaluacion_equivalencias) y el lookup de candidatos
en `empleados` SIEMPRE acotado a una empresa (invariante del matcheo: nunca global).
Patrón defensivo (res and res.data), como cesion_repo. Un repo más a portar a asyncpg.
"""
from typing import List, Optional

from integrations.supabase_client import supabase_admin
from schemas.evaluacion_import import EmpleadoCandidato

_EQUIV = "evaluacion_equivalencias"
_EMP_SELECT = "id,apellido,nombre,gerencia,manager_id"


class EvaluacionMatcheoRepo:
    def find_equivalencia(self, empresa_id: str, apellido_csv: str, nombre_csv: str) -> Optional[str]:
        """empleado_id de una equivalencia confirmada (nombres YA normalizados). None si no hay."""
        res = (supabase_admin.table(_EQUIV).select("empleado_id")
               .eq("empresa_id", empresa_id).eq("apellido_csv", apellido_csv)
               .eq("nombre_csv", nombre_csv).maybe_single().execute())
        return res.data["empleado_id"] if res and res.data else None

    def crear_equivalencia(self, datos: dict) -> Optional[dict]:
        """Upsert de una equivalencia confirmada por (empresa, apellido, nombre): reconfirmar pisa.
        La dispara la confirmación de import (fase 4), nunca el resolutor."""
        res = supabase_admin.table(_EQUIV).upsert(
            datos, on_conflict="empresa_id,apellido_csv,nombre_csv").execute()
        return res.data[0] if res and res.data else None

    def find_empleados_empresa(self, empresa_id: str) -> List[EmpleadoCandidato]:
        """Todos los empleados de la empresa (candidatos posibles). El nombre del manager lo
        resuelve el service desde esta misma lista (evita el self-join de PostgREST)."""
        res = supabase_admin.table("empleados").select(_EMP_SELECT).eq("empresa_id", empresa_id).execute()
        return [
            EmpleadoCandidato(
                empleado_id=r["id"], apellido=r.get("apellido") or "", nombre=r.get("nombre") or "",
                gerencia=r.get("gerencia"), manager_id=r.get("manager_id"),
            )
            for r in (res.data or [])
        ] if res else []
