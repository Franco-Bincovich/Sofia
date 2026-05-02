"""
Router de sucesión — mapa de talento y planes de carrera.
Rutas protegidas por AuthMiddleware.
"""
from uuid import UUID

from fastapi import APIRouter, Depends

from schemas.sucesion import EmpleadoMapaResponse, PlanCarreraCreate, PlanCarreraResponse
from services.sucesion_service import SucesionService

router = APIRouter()


def _service() -> SucesionService:
    return SucesionService()


@router.get("/mapa", response_model=list[EmpleadoMapaResponse])
async def get_mapa_talento(
    service: SucesionService = Depends(_service),
) -> list[EmpleadoMapaResponse]:
    return service.get_mapa_talento()


@router.get("/planes", response_model=list[PlanCarreraResponse])
async def get_planes_carrera(
    service: SucesionService = Depends(_service),
) -> list[PlanCarreraResponse]:
    return service.get_planes_carrera()


@router.post("/planes", response_model=PlanCarreraResponse, status_code=201)
async def create_plan_carrera(
    data: PlanCarreraCreate,
    service: SucesionService = Depends(_service),
) -> PlanCarreraResponse:
    return service.create_plan_carrera(data)


@router.put("/hitos/{hito_id}/completar", response_model=dict)
async def completar_hito(
    hito_id: UUID,
    service: SucesionService = Depends(_service),
) -> dict:
    service.completar_hito(hito_id)
    return {"ok": True}
