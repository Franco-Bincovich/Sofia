"""
Router de costos de personal.
Rutas protegidas por AuthMiddleware (requieren JWT válido).
empresa_id para lecturas: header X-Empresa-Id (get_empresa_id).
empresa_id para escrituras: heredado del empleado/área — NO se pide explícito.
"""
from typing import List

from fastapi import APIRouter, Depends, Query, Request

from schemas.costo import (
    DashboardCostosResponse, NominaCreate, NominaResponse,
    PresupuestoCreate, PresupuestoResponse,
)
from services.costo_service import CostoService
from utils.empresa import get_empresa_id
from utils.permisos import Seccion

router = APIRouter()
SECCION = Seccion.COSTOS


def _service() -> CostoService:
    return CostoService()


@router.get("/dashboard", response_model=DashboardCostosResponse)
async def get_dashboard(
    request: Request,
    mes: int = Query(..., ge=1, le=12),
    anio: int = Query(..., ge=2000, le=2100),
    service: CostoService = Depends(_service),
) -> DashboardCostosResponse:
    return service.get_dashboard_costos(mes, anio, get_empresa_id(request))


@router.get("/nomina", response_model=List[NominaResponse])
async def get_nomina(
    request: Request,
    mes: int = Query(..., ge=1, le=12),
    anio: int = Query(..., ge=2000, le=2100),
    service: CostoService = Depends(_service),
) -> List[NominaResponse]:
    return service.get_nomina_mes(mes, anio, get_empresa_id(request))


@router.post("/nomina", response_model=NominaResponse, status_code=201)
async def post_nomina(
    request: Request,
    body: NominaCreate,
    service: CostoService = Depends(_service),
) -> NominaResponse:
    return service.cargar_nomina(body, get_empresa_id(request))


@router.post("/presupuesto", response_model=PresupuestoResponse, status_code=201)
async def post_presupuesto(
    request: Request,
    body: PresupuestoCreate,
    service: CostoService = Depends(_service),
) -> PresupuestoResponse:
    return service.set_presupuesto_area(body, get_empresa_id(request))
