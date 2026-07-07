"""Router del dashboard de mando (GET /api/dashboard-equipo).

Gateado con la sección VACACIONES en modo READ (mismo patrón que routers/equipo.py y
routers/vacaciones.py): mandos_medios la tiene. NO crea sección de permisos nueva."""
from fastapi import APIRouter, Depends, Request

from schemas.dashboard_equipo import DashboardEquipoResponse
from services.dashboard_equipo_service import DashboardEquipoService
from utils.permisos import Accion, Seccion, require_permission

router = APIRouter()

SECCION = Seccion.VACACIONES


def _svc() -> DashboardEquipoService:
    return DashboardEquipoService()


@router.get("", response_model=DashboardEquipoResponse, dependencies=[Depends(require_permission(SECCION, Accion.READ))])
async def get_dashboard_equipo(request: Request, service: DashboardEquipoService = Depends(_svc)) -> DashboardEquipoResponse:
    u = request.state.user
    return service.get_dashboard(u.get("id"), u.get("rol"))
