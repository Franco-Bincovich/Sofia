"""
Repositorio del roster "mi equipo": proyección liviana de empleados (identidad +
empresa legible) por lista de ids. Separado de empleado_ownership_repo (que
resuelve el CRITERIO de ownership) y de empleado_repo (sobre el límite de líneas);
acá vive solo la lectura de proyección que consume equipo_service.
"""
from typing import List, Optional

from integrations.supabase_client import supabase_admin

_TABLE = "empleados"


class EquipoRepo:
    def find_equipo(self, ids: Optional[List[str]]) -> List[dict]:
        """
        Trae empleados con el nombre de empresa resuelto, para el roster "mi equipo".

        Sigue el contrato de ids_empleados_visibles (services.ownership):
            None      → sin restricción: TODOS los empleados (admin_rrhh/gerencia_lectura).
            [ids...]  → solo esos empleados (mando: su registro + subordinados directos).
        El caso [] NO llega acá: el service corta antes y devuelve [] sin consultar.

        Join to-one a empresas(nombre) resuelto en la misma query (sin N+1); ordena por
        apellido, nombre en DB. Aplana la empresa embebida a un string (o None).

        Args:
            ids: lista de empleado_ids a traer, o None para todos.

        Returns:
            Lista de dicts {id, nombre, apellido, empresa}, ordenada por apellido, nombre.
        """
        q = (
            supabase_admin.table(_TABLE)
            .select("id, nombre, apellido, empresas(nombre)")
            .order("apellido")
            .order("nombre")
        )
        if ids is not None:
            q = q.in_("id", ids)
        rows = q.execute().data or []
        return [
            {
                "id": r["id"],
                "nombre": r["nombre"],
                "apellido": r["apellido"],
                "empresa": r["empresas"]["nombre"] if isinstance(r.get("empresas"), dict) else None,
            }
            for r in rows
        ]
