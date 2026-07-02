"""
Repositorio de ownership de empleados. Queries dirigidas que resuelven la
relación usuario→empleado y la jerarquía de subordinados directos.

Vive separado de empleado_repo (que ya está sobre el límite de 100 líneas) y
concentra el acceso a DB que consume la función central de ownership
(services/ownership.py). Solo lecturas dirigidas — nunca full-table.
"""
from typing import List, Optional

from integrations.supabase_client import supabase_admin

_TABLE = "empleados"


class EmpleadoOwnershipRepo:
    def find_by_user_id(self, user_id: str) -> Optional[dict]:
        """
        Resuelve el registro de empleado vinculado a un usuario del sistema.

        Query dirigida por la FK empleados.user_id. Devuelve un dict acotado
        (id, empresa_id, area_id, estado), o None si el usuario no tiene un
        empleado vinculado (caso legítimo: admin/gerencia sin legajo).

        Args:
            user_id: UUID (str) del usuario logueado (request.state.user["id"]).

        Returns:
            dict con {id, empresa_id, area_id, estado} o None si no hay vínculo.
        """
        res = (
            supabase_admin.table(_TABLE)
            .select("id, empresa_id, area_id, estado")
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )
        return res.data if res.data else None

    def ids_subordinados(self, empleado_id: str) -> List[str]:
        """
        Devuelve los ids de empleados cuyo superior inmediato es empleado_id.

        Query dirigida por empleados.manager_id; trae SOLO la columna id
        (no filas completas). Lista vacía si no tiene subordinados directos.

        Args:
            empleado_id: UUID (str) del empleado-jefe.

        Returns:
            Lista de ids (str) de subordinados directos; [] si no hay.
        """
        rows = (
            supabase_admin.table(_TABLE)
            .select("id")
            .eq("manager_id", empleado_id)
            .execute()
            .data
            or []
        )
        return [r["id"] for r in rows]
