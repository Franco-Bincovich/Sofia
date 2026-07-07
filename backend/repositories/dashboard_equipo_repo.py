"""
Repositorio de conteos del dashboard de mando. SOLO COUNT en DB: reusa el patrón
count="exact" de vacaciones_repo/ausencias_repo y lee .count. (NO se usa head=True:
en postgrest 0.17.2 zeroea el .count — request HEAD → body vacío → JSONDecodeError.)
"""
from datetime import date
from typing import List, Optional

from integrations.supabase_client import supabase_admin

_VAC, _AUS, _EMP = "solicitudes_vacaciones", "solicitudes_ausencia", "empleados"


class DashboardEquipoRepo:
    def count_empleados(self, empleado_ids: Optional[List[str]]) -> int:
        """
        Cuenta empleados. empleado_ids=None → todos (org-wide, caso admin/gerencia);
        [ids] → solo esos. Devuelve el total exacto vía count="exact".
        """
        q = supabase_admin.table(_EMP).select("id", count="exact")
        if empleado_ids is not None:
            q = q.in_("id", empleado_ids)
        return q.execute().count or 0

    def count_vacaciones_mes(self, empleado_ids: Optional[List[str]], inicio_mes: date, fin_mes: date) -> int:
        """
        Cuenta vacaciones NO canceladas que intersectan el mes. Excluye cancelada=True
        (una vacación cancelada no es una vacación activa; misma convención que
        vacaciones_repo.find_overlapping).
        """
        return self._q_solapando(_VAC, empleado_ids, inicio_mes, fin_mes).eq("cancelada", False).execute().count or 0

    def count_ausencias_mes(self, empleado_ids: Optional[List[str]], inicio_mes: date, fin_mes: date) -> int:
        """Cuenta ausencias que intersectan el mes (la tabla de ausencias no tiene estado cancelada)."""
        return self._q_solapando(_AUS, empleado_ids, inicio_mes, fin_mes).execute().count or 0

    def _q_solapando(self, tabla: str, empleado_ids: Optional[List[str]], inicio_mes: date, fin_mes: date):
        """
        Query base de COUNT con intersección de rango: fecha_desde <= fin_mes AND
        fecha_hasta >= inicio_mes. Esta condición (NO un BETWEEN sobre fecha_desde)
        cuenta también un registro que empezó ANTES del mes y sigue activo dentro de
        él, o que lo abarca entero — un BETWEEN sobre fecha_desde perdería esos casos.
        empleado_ids=None → sin filtro por empleado (org-wide); [ids] → solo esos.
        """
        q = (
            supabase_admin.table(tabla).select("id", count="exact")
            .lte("fecha_desde", str(fin_mes)).gte("fecha_hasta", str(inicio_mes))
        )
        if empleado_ids is not None:
            q = q.in_("empleado_id", empleado_ids)
        return q
