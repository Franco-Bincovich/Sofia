"""
Repositorio de lectura del pool de roles conocidos (autocompletado del campo roles).
Vive aparte de empleado_repo.py (ya en su límite de líneas) para no agravarlo.
"""
from integrations.supabase_client import supabase_admin

_TABLE = "empleados"


class EmpleadoRolesRepo:
    def get_roles_conocidos(self) -> list[str]:
        """Devuelve el conjunto ordenado de roles ya usados en TODAS las empresas.

        Pool compartido (sin filtro de empresa). El `unnest` no es expresable vía
        PostgREST, así que se traen las listas `roles` y se aplanan/deduplican en
        Python — aceptable por el volumen actual (un puñado de empleados)."""
        rows = supabase_admin.table(_TABLE).select("roles").execute().data or []
        unicos: set[str] = set()
        for r in rows:
            for rol in (r.get("roles") or []):
                if rol:
                    unicos.add(rol)
        return sorted(unicos)
