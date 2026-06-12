"""Router de ciclos de evaluación de desempeño."""
from uuid import UUID

from fastapi import APIRouter, Depends, Request

from schemas.evaluaciones import CicloCreate, CicloListResponse, CicloResponse, CicloUpdate
from services.ev_ciclos_service import EvCiclosService
from utils.empresa import get_empresa_id

router = APIRouter()


def _svc() -> EvCiclosService:
    return EvCiclosService()


@router.get("", response_model=CicloListResponse)
async def list_ciclos(
    request: Request,
    service: EvCiclosService = Depends(_svc),
) -> CicloListResponse:
    return service.get_all(get_empresa_id(request))


@router.get("/{id}", response_model=CicloResponse)
async def get_ciclo(
    id: UUID, request: Request,
    service: EvCiclosService = Depends(_svc),
) -> CicloResponse:
    return service.get_by_id(id, get_empresa_id(request))


@router.post("", response_model=CicloResponse, status_code=201)
async def create_ciclo(
    body: CicloCreate,
    service: EvCiclosService = Depends(_svc),
) -> CicloResponse:
    return service.create(body)


@router.put("/{id}", response_model=CicloResponse)
async def update_ciclo(
    id: UUID, body: CicloUpdate, request: Request,
    service: EvCiclosService = Depends(_svc),
) -> CicloResponse:
    return service.update(id, body, get_empresa_id(request))


@router.post("/{id}/cerrar", response_model=CicloResponse)
async def cerrar_ciclo(
    id: UUID, request: Request,
    service: EvCiclosService = Depends(_svc),
) -> CicloResponse:
    return service.cerrar_ciclo(id, get_empresa_id(request))
