"""Schema de salida del dashboard de mando (GET /api/dashboard-equipo)."""
from pydantic import BaseModel


class DashboardEquipoResponse(BaseModel):
    """Tres conteos del equipo del usuario (o org-wide para admin/gerencia)."""

    empleados_a_cargo: int
    vacaciones_mes: int
    ausencias_mes: int
