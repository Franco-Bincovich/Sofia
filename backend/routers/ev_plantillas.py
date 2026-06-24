"""Router de plantillas y criterios de evaluación de desempeño. Sección: 'evaluaciones'."""
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request

from schemas.evaluaciones import (
    PlantillaCreate, PlantillaListResponse, PlantillaResponse, PlantillaUpdate,
)
from services.ev_plantillas_service import EvPlantillasService
from utils.empresa import get_empresa_id
from utils.permisos import Accion, Seccion, require_permission

router = APIRouter()
SECCION = Seccion.EVALUACIONES


def _svc() -> EvPlantillasService:
    return EvPlantillasService()


@router.get("", response_model=PlantillaListResponse, dependencies=[Depends(require_permission(SECCION, Accion.READ))])
async def list_plantillas(
    request: Request,
    solo_activas: bool = Query(True),
    service: EvPlantillasService = Depends(_svc),
) -> PlantillaListResponse:
    return service.get_all(get_empresa_id(request), solo_activas)


@router.get("/{id}", response_model=PlantillaResponse, dependencies=[Depends(require_permission(SECCION, Accion.READ))])
async def get_plantilla(
    id: UUID, request: Request,
    service: EvPlantillasService = Depends(_svc),
) -> PlantillaResponse:
    return service.get_by_id(id, get_empresa_id(request))


@router.post("", response_model=PlantillaResponse, status_code=201, dependencies=[Depends(require_permission(SECCION, Accion.WRITE))])
async def create_plantilla(
    body: PlantillaCreate,
    service: EvPlantillasService = Depends(_svc),
) -> PlantillaResponse:
    return service.create(body)


@router.put("/{id}", response_model=PlantillaResponse, dependencies=[Depends(require_permission(SECCION, Accion.WRITE))])
async def update_plantilla(
    id: UUID, body: PlantillaUpdate, request: Request,
    service: EvPlantillasService = Depends(_svc),
) -> PlantillaResponse:
    return service.update(id, body, get_empresa_id(request))


@router.delete("/{id}", status_code=200, dependencies=[Depends(require_permission(SECCION, Accion.WRITE))])
async def delete_plantilla(
    id: UUID, request: Request,
    service: EvPlantillasService = Depends(_svc),
) -> dict:
    service.delete(id, get_empresa_id(request))
    return {"ok": True}
