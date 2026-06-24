"""Router de criterios de evaluación (sub-recurso de plantilla). Sección: 'evaluaciones'."""
from uuid import UUID

from fastapi import APIRouter, Depends, Request

from schemas.evaluaciones import CriterioCreate, CriterioResponse, CriterioUpdate
from services.ev_plantillas_service import EvPlantillasService
from utils.empresa import get_empresa_id
from utils.permisos import Accion, Seccion, require_permission

router = APIRouter()
SECCION = Seccion.EVALUACIONES


def _svc() -> EvPlantillasService:
    return EvPlantillasService()


@router.post("/{id}/criterios", response_model=CriterioResponse, status_code=201, dependencies=[Depends(require_permission(SECCION, Accion.WRITE))])
async def add_criterio(
    id: UUID, body: CriterioCreate, request: Request,
    service: EvPlantillasService = Depends(_svc),
) -> CriterioResponse:
    return service.add_criterio(id, body, get_empresa_id(request))


@router.put("/{id}/criterios/{criterio_id}", response_model=CriterioResponse, dependencies=[Depends(require_permission(SECCION, Accion.WRITE))])
async def update_criterio(
    id: UUID, criterio_id: UUID, body: CriterioUpdate, request: Request,
    service: EvPlantillasService = Depends(_svc),
) -> CriterioResponse:
    return service.update_criterio(criterio_id, body, get_empresa_id(request))


@router.delete("/{id}/criterios/{criterio_id}", status_code=200, dependencies=[Depends(require_permission(SECCION, Accion.WRITE))])
async def delete_criterio(
    id: UUID, criterio_id: UUID, request: Request,
    service: EvPlantillasService = Depends(_svc),
) -> dict:
    service.delete_criterio(criterio_id, get_empresa_id(request))
    return {"ok": True}
