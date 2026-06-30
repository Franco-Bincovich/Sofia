"""
Repositorio de lecturas de apoyo de empleados: pools de autocompletado (roles y campos
del legajo) y listas livianas de selección (seleccionables). Vive aparte de empleado_repo.py
(ya en su límite de líneas) para no agravarlo.
"""
from uuid import UUID

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

    def get_valores_conocidos(self, campo: str) -> list[str]:
        """Devuelve los valores ya usados (DISTINCT, ordenados) de una columna de empleados.

        Pool compartido entre empresas (sin filtro). `campo` YA viene validado contra la
        whitelist del service; aun así se pasa al query builder (`.select(campo)`), nunca se
        interpola en SQL crudo, por lo que no hay riesgo de inyección de identificador.
        Se aplana/deduplica en Python (mismo patrón que get_roles_conocidos)."""
        rows = supabase_admin.table(_TABLE).select(campo).execute().data or []
        unicos: set[str] = set()
        for r in rows:
            valor = r.get(campo)
            if valor is not None and str(valor).strip():
                unicos.add(str(valor).strip())
        return sorted(unicos)

    def get_seleccionables(self, empresa_id: UUID) -> list[dict]:
        """Lista liviana (id, nombre, apellido) de empleados ACTIVOS de una empresa.

        Select acotado a 3 columnas (no `*`), filtrado por empresa y estado='activo',
        ordenado por apellido/nombre. Pensado para poblar selects (ej. superior inmediato)."""
        rows = (supabase_admin.table(_TABLE)
                .select("id, nombre, apellido")
                .eq("empresa_id", str(empresa_id))
                .eq("estado", "activo")
                .order("apellido").order("nombre")
                .execute().data)
        return rows or []
