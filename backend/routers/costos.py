"""
Router de costos de personal.
Rutas protegidas por AuthMiddleware (requieren JWT válido).
"""
from typing import List

from fastapi import APIRouter, Depends, Query

from schemas.costo import (
    DashboardCostosResponse, NominaCreate, NominaResponse,
    PresupuestoCreate, PresupuestoResponse,
)
from services.costo_service import CostoService

router = APIRouter()


def _service() -> CostoService:
    return CostoService()


@router.get("/dashboard", response_model=DashboardCostosResponse)
async def get_dashboard(
    mes: int = Query(..., ge=1, le=12),
    anio: int = Query(..., ge=2000, le=2100),
    service: CostoService = Depends(_service),
) -> DashboardCostosResponse:
    return service.get_dashboard_costos(mes, anio)


@router.get("/nomina", response_model=List[NominaResponse])
async def get_nomina(
    mes: int = Query(..., ge=1, le=12),
    anio: int = Query(..., ge=2000, le=2100),
    service: CostoService = Depends(_service),
) -> List[NominaResponse]:
    return service.get_nomina_mes(mes, anio)


@router.post("/nomina", response_model=NominaResponse, status_code=201)
async def post_nomina(
    body: NominaCreate,
    service: CostoService = Depends(_service),
) -> NominaResponse:
    return service.cargar_nomina(body)


@router.post("/presupuesto", response_model=PresupuestoResponse, status_code=201)
async def post_presupuesto(
    body: PresupuestoCreate,
    service: CostoService = Depends(_service),
) -> PresupuestoResponse:
    return service.set_presupuesto_area(body)
