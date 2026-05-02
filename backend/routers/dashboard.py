"""
Router del Dashboard Ejecutivo.
Ruta protegida por AuthMiddleware (requiere JWT válido).
"""
from fastapi import APIRouter, Depends

from schemas.dashboard import DashboardResponse
from services.dashboard_service import DashboardService

router = APIRouter()


def _service() -> DashboardService:
    return DashboardService()


@router.get("", response_model=DashboardResponse)
async def get_dashboard(
    service: DashboardService = Depends(_service),
) -> DashboardResponse:
    return service.get_dashboard()
