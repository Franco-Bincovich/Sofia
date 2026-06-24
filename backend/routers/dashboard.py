"""
Router del Dashboard Ejecutivo.
Ruta protegida por AuthMiddleware (requiere JWT válido).
empresa_id para lectura: header X-Empresa-Id (filtro de vista, None = consolidado).
"""
from fastapi import APIRouter, Depends, Request

from schemas.dashboard import DashboardResponse
from services.dashboard_service import DashboardService
from utils.empresa import get_empresa_id
from utils.permisos import Accion, Seccion, require_permission

router = APIRouter()
SECCION = Seccion.DASHBOARD


def _service() -> DashboardService:
    return DashboardService()


@router.get("", response_model=DashboardResponse, dependencies=[Depends(require_permission(SECCION, Accion.READ))])
async def get_dashboard(
    request: Request,
    service: DashboardService = Depends(_service),
) -> DashboardResponse:
    empresa_id = get_empresa_id(request)
    return service.get_dashboard(empresa_id)
