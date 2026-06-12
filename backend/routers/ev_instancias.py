"""Router de instancias y resultados de evaluación de desempeño."""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request

from schemas.evaluaciones import (
    InstanciaCreate, InstanciaDetalleResponse, InstanciaListResponse, ResultadoUpdate,
)
from services.ev_instancias_service import EvInstanciasService
from utils.empresa import get_empresa_id

router = APIRouter()


def _svc() -> EvInstanciasService:
    return EvInstanciasService()


@router.get("", response_model=InstanciaListResponse)
async def list_instancias(
    request: Request,
    ciclo_id: Optional[UUID] = Query(None),
    estado: Optional[str] = Query(None),
    service: EvInstanciasService = Depends(_svc),
) -> InstanciaListResponse:
    return service.get_all(get_empresa_id(request), ciclo_id, estado)


@router.get("/{id}", response_model=InstanciaDetalleResponse)
async def get_instancia(
    id: UUID, request: Request,
    service: EvInstanciasService = Depends(_svc),
) -> InstanciaDetalleResponse:
    return service.get_by_id(id, get_empresa_id(request))


@router.post("", response_model=InstanciaDetalleResponse, status_code=201)
async def create_instancia(
    body: InstanciaCreate,
    service: EvInstanciasService = Depends(_svc),
) -> InstanciaDetalleResponse:
    return service.create(body)


@router.put("/{id}/resultados/{criterio_id}", response_model=InstanciaDetalleResponse)
async def update_resultado(
    id: UUID, criterio_id: UUID, body: ResultadoUpdate, request: Request,
    service: EvInstanciasService = Depends(_svc),
) -> InstanciaDetalleResponse:
    return service.update_resultado(id, criterio_id, body, get_empresa_id(request))


@router.post("/{id}/finalizar", response_model=InstanciaDetalleResponse)
async def finalizar_instancia(
    id: UUID, request: Request,
    service: EvInstanciasService = Depends(_svc),
) -> InstanciaDetalleResponse:
    return service.finalizar(id, get_empresa_id(request))
