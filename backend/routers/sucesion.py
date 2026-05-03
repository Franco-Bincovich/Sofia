"""
Router de sucesión — mapa de talento y planes de carrera.
Rutas protegidas por AuthMiddleware.
"""
from uuid import UUID

from fastapi import APIRouter, Depends

from schemas.sucesion import (
    EmpleadoAnalisisResponse, EmpleadoMapaResponse,
    HitoBodyCreate, HitoResponse,
    PlanCarreraCreate, PlanCarreraResponse, ReadinessUpdate,
)
from services.sucesion_service import SucesionService

router = APIRouter()


def _svc() -> SucesionService:
    return SucesionService()


@router.get("/mapa", response_model=list[EmpleadoMapaResponse])
async def get_mapa_talento(svc: SucesionService = Depends(_svc)) -> list[EmpleadoMapaResponse]:
    return svc.get_mapa_talento()


@router.get("/analisis", response_model=list[EmpleadoAnalisisResponse])
async def get_analisis_posicion(
    area_id: UUID, posicion: str = "", svc: SucesionService = Depends(_svc),
) -> list[EmpleadoAnalisisResponse]:
    return svc.get_analisis_posicion(area_id, posicion)


@router.get("/planes", response_model=list[PlanCarreraResponse])
async def get_planes_carrera(svc: SucesionService = Depends(_svc)) -> list[PlanCarreraResponse]:
    return svc.get_planes_carrera()


@router.post("/planes", response_model=PlanCarreraResponse, status_code=201)
async def create_plan_carrera(
    data: PlanCarreraCreate, svc: SucesionService = Depends(_svc),
) -> PlanCarreraResponse:
    return svc.create_plan_carrera(data)


@router.get("/planes/{plan_id}/hitos", response_model=list[HitoResponse])
async def get_hitos(
    plan_id: UUID, svc: SucesionService = Depends(_svc),
) -> list[HitoResponse]:
    return svc.get_hitos(plan_id)


@router.post("/planes/{plan_id}/hitos", response_model=HitoResponse, status_code=201)
async def create_hito(
    plan_id: UUID, data: HitoBodyCreate, svc: SucesionService = Depends(_svc),
) -> HitoResponse:
    return svc.create_hito(plan_id, data)


@router.put("/planes/{plan_id}/readiness", response_model=PlanCarreraResponse)
async def update_readiness(
    plan_id: UUID, data: ReadinessUpdate, svc: SucesionService = Depends(_svc),
) -> PlanCarreraResponse:
    return svc.update_readiness(plan_id, data.readiness)


@router.put("/hitos/{hito_id}/completar", response_model=dict)
async def completar_hito(
    hito_id: UUID, svc: SucesionService = Depends(_svc),
) -> dict:
    svc.completar_hito(hito_id)
    return {"ok": True}
