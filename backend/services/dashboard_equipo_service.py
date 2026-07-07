"""
Service del dashboard de mando (GET /api/dashboard-equipo).

Arma 3 conteos del equipo del usuario, todos calculados en DB (COUNT). Resuelve el
universo de ownership UNA sola vez (ids_empleados_visibles) y lo reusa para las 3.

Métricas:
  - empleados_a_cargo: SUBORDINADOS del mando, SIN incluirlo a él. ids_empleados_visibles
    devuelve [empleado_id_del_mando, *subordinados] (el mando es siempre el primer id),
    así que el conteo es len(ids) - 1. Para admin/gerencia (sin restricción) se cuenta
    el total de empleados de la organización.
  - vacaciones_mes: vacaciones NO canceladas de esa gente que intersectan el mes en curso.
  - ausencias_mes: ausencias de esa gente que intersectan el mes en curso.

Comportamiento por rol (contrato de ids_empleados_visibles):
  - None (admin/gerencia): dashboard-equipo es una vista de MANDO; para no romper, se
    devuelven conteos ORG-WIDE (todos los empleados / vacaciones / ausencias del mes).
  - [ids]: los 3 conteos acotados a esa gente.
  - [] (mando sin empleado vinculado / fail-closed): {0, 0, 0} sin tocar la DB.
"""
from calendar import monthrange
from datetime import date
from typing import Optional, Tuple

from repositories.dashboard_equipo_repo import DashboardEquipoRepo
from repositories.empleado_ownership_repo import EmpleadoOwnershipRepo
from schemas.dashboard_equipo import DashboardEquipoResponse
from services.ownership import ids_empleados_visibles


class DashboardEquipoService:
    def __init__(
        self,
        repo: Optional[DashboardEquipoRepo] = None,
        ownership_repo: Optional[EmpleadoOwnershipRepo] = None,
    ) -> None:
        self._repo = repo or DashboardEquipoRepo()
        self._ownership = ownership_repo or EmpleadoOwnershipRepo()

    def get_dashboard(self, user_id: str, rol: str) -> DashboardEquipoResponse:
        """
        Resuelve ownership una vez y devuelve los 3 conteos del mes en curso.

        Ver el docstring del módulo para la definición de cada métrica, la decisión de
        excluir al propio mando de empleados_a_cargo, y el comportamiento org-wide para
        admin/gerencia. [] → {0,0,0} sin consultar la DB (fail-closed).

        Args:
            user_id: UUID (str) del usuario logueado (request.state.user["id"]).
            rol: rol canónico del usuario (ver ROLES_VALIDOS en utils.permisos).
        """
        ids = ids_empleados_visibles(user_id, rol, self._ownership)  # None | [] | [ids]
        if ids == []:
            return DashboardEquipoResponse(empleados_a_cargo=0, vacaciones_mes=0, ausencias_mes=0)

        inicio_mes, fin_mes = self._rango_mes_actual()

        # empleados_a_cargo excluye al propio mando (ids[0]); admin (None) → org entera.
        a_cargo = self._repo.count_empleados(None) if ids is None else len(ids) - 1

        return DashboardEquipoResponse(
            empleados_a_cargo=a_cargo,
            vacaciones_mes=self._repo.count_vacaciones_mes(ids, inicio_mes, fin_mes),
            ausencias_mes=self._repo.count_ausencias_mes(ids, inicio_mes, fin_mes),
        )

    @staticmethod
    def _rango_mes_actual() -> Tuple[date, date]:
        """Primer y último día del mes actual (timezone del server). Se calcula acá, no
        en el repo, para que la query reciba fechas ya resueltas."""
        hoy = date.today()
        return hoy.replace(day=1), hoy.replace(day=monthrange(hoy.year, hoy.month)[1])
