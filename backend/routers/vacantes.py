"""
Router de vacantes y pipeline de candidatos.
Rutas protegidas por AuthMiddleware (requieren JWT válido).
"""
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request

from schemas.vacante import CandidatoCreate, CandidatoResponse, EtapaUpdate, VacanteCreate, VacanteResponse, VacanteUpdate
from services.vacante_service import VacanteService

router = APIRouter()
candidatos_router = APIRouter()


def _svc() -> VacanteService:
    return VacanteService()


@router.get("", response_model=List[VacanteResponse])
async def list_vacantes(
    estado: Optional[str] = Query(None), service: VacanteService = Depends(_svc)
) -> List[VacanteResponse]:
    return service.get_vacantes(estado)


@router.get("/{id}", response_model=VacanteResponse)
async def get_vacante(id: UUID, service: VacanteService = Depends(_svc)) -> VacanteResponse:
    return service.get_vacante(id)


@router.post("", response_model=VacanteResponse, status_code=201)
async def create_vacante(
    request: Request, body: VacanteCreate, service: VacanteService = Depends(_svc)
) -> VacanteResponse:
    return service.create_vacante(body, request.state.user.get("id", "system"))


@router.put("/{id}", response_model=VacanteResponse)
async def update_vacante(
    id: UUID, body: VacanteUpdate, service: VacanteService = Depends(_svc)
) -> VacanteResponse:
    return service.update_vacante(id, body)


@router.get("/{id}/candidatos", response_model=List[CandidatoResponse])
async def list_candidatos(id: UUID, service: VacanteService = Depends(_svc)) -> List[CandidatoResponse]:
    return service.get_candidatos(id)


@router.post("/{id}/candidatos", response_model=CandidatoResponse, status_code=201)
async def add_candidato(
    id: UUID, body: CandidatoCreate, service: VacanteService = Depends(_svc)
) -> CandidatoResponse:
    return service.add_candidato(id, body)


@candidatos_router.put("/{id}/etapa", response_model=CandidatoResponse)
async def mover_candidato(
    id: UUID, body: EtapaUpdate, service: VacanteService = Depends(_svc)
) -> CandidatoResponse:
    return service.mover_candidato(id, body.etapa)
