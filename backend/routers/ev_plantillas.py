"""Router de plantillas y criterios de evaluación de desempeño. Sección: 'evaluaciones'."""
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request

from schemas.evaluaciones import (
    CriterioCreate, CriterioResponse, CriterioUpdate,
    PlantillaCreate, PlantillaListResponse, PlantillaResponse, PlantillaUpdate,
)
from services.ev_plantillas_service import EvPlantillasService
from utils.empresa import get_empresa_id
from utils.permisos import Seccion

router = APIRouter()
SECCION = Seccion.EVALUACIONES


def _svc() -> EvPlantillasService:
    return EvPlantillasService()


@router.get("", response_model=PlantillaListResponse)
async def list_plantillas(
    request: Request,
    solo_activas: bool = Query(True),
    service: EvPlantillasService = Depends(_svc),
) -> PlantillaListResponse:
    return service.get_all(get_empresa_id(request), solo_activas)


@router.get("/{id}", response_model=PlantillaResponse)
async def get_plantilla(
    id: UUID, request: Request,
    service: EvPlantillasService = Depends(_svc),
) -> PlantillaResponse:
    return service.get_by_id(id, get_empresa_id(request))


@router.post("", response_model=PlantillaResponse, status_code=201)
async def create_plantilla(
    body: PlantillaCreate,
    service: EvPlantillasService = Depends(_svc),
) -> PlantillaResponse:
    return service.create(body)


@router.put("/{id}", response_model=PlantillaResponse)
async def update_plantilla(
    id: UUID, body: PlantillaUpdate, request: Request,
    service: EvPlantillasService = Depends(_svc),
) -> PlantillaResponse:
    return service.update(id, body, get_empresa_id(request))


@router.delete("/{id}", status_code=200)
async def delete_plantilla(
    id: UUID, request: Request,
    service: EvPlantillasService = Depends(_svc),
) -> dict:
    service.delete(id, get_empresa_id(request))
    return {"ok": True}


# ── Criterios (sub-recurso de plantilla) ──────────────────────────────────────

@router.post("/{id}/criterios", response_model=CriterioResponse, status_code=201)
async def add_criterio(
    id: UUID, body: CriterioCreate, request: Request,
    service: EvPlantillasService = Depends(_svc),
) -> CriterioResponse:
    return service.add_criterio(id, body, get_empresa_id(request))


@router.put("/{id}/criterios/{criterio_id}", response_model=CriterioResponse)
async def update_criterio(
    id: UUID, criterio_id: UUID, body: CriterioUpdate, request: Request,
    service: EvPlantillasService = Depends(_svc),
) -> CriterioResponse:
    return service.update_criterio(criterio_id, body, get_empresa_id(request))


@router.delete("/{id}/criterios/{criterio_id}", status_code=200)
async def delete_criterio(
    id: UUID, criterio_id: UUID, request: Request,
    service: EvPlantillasService = Depends(_svc),
) -> dict:
    service.delete_criterio(criterio_id, get_empresa_id(request))
    return {"ok": True}
