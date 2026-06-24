"""
Router de objetivos. Sección: "objetivos".
empresa_id para lecturas: X-Empresa-Id (get_empresa_id).
empresa_id para crear: explícito en el body.
"""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request

from schemas.objetivo import (
    CambiarEstadoRequest, ObjetivoCreate, ObjetivoListResponse, ObjetivoResponse, ObjetivoUpdate,
)
from services.objetivo_service import ObjetivoService
from utils.empresa import get_empresa_id
from utils.permisos import Accion, Seccion, require_permission

router = APIRouter()
SECCION = Seccion.OBJETIVOS


def _svc() -> ObjetivoService:
    return ObjetivoService()


@router.get("", response_model=ObjetivoListResponse, dependencies=[Depends(require_permission(SECCION, Accion.READ))])
async def list_objetivos(
    request: Request,
    estado:         Optional[str] = Query(None),
    responsable_id: Optional[str] = Query(None),
    prioridad:      Optional[str] = Query(None),
    service: ObjetivoService = Depends(_svc),
) -> ObjetivoListResponse:
    return service.get_all(get_empresa_id(request), estado, responsable_id, prioridad)


@router.post("", response_model=ObjetivoResponse, status_code=201, dependencies=[Depends(require_permission(SECCION, Accion.WRITE))])
async def create_objetivo(
    request: Request, body: ObjetivoCreate,
    service: ObjetivoService = Depends(_svc),
) -> ObjetivoResponse:
    return service.create(body, request.state.user.get("id", "system"))


@router.put("/{id}/estado", response_model=ObjetivoResponse, dependencies=[Depends(require_permission(SECCION, Accion.WRITE))])
async def cambiar_estado(
    id: UUID, request: Request, body: CambiarEstadoRequest,
    service: ObjetivoService = Depends(_svc),
) -> ObjetivoResponse:
    return service.cambiar_estado(id, body, get_empresa_id(request))


@router.put("/{id}", response_model=ObjetivoResponse, dependencies=[Depends(require_permission(SECCION, Accion.WRITE))])
async def update_objetivo(
    id: UUID, request: Request, body: ObjetivoUpdate,
    service: ObjetivoService = Depends(_svc),
) -> ObjetivoResponse:
    return service.update(id, body, get_empresa_id(request))


@router.delete("/{id}", status_code=200, dependencies=[Depends(require_permission(SECCION, Accion.WRITE))])
async def delete_objetivo(
    id: UUID, request: Request,
    service: ObjetivoService = Depends(_svc),
) -> dict:
    service.delete(id, get_empresa_id(request))
    return {"ok": True}
