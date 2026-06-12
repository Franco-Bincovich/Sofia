"""Router de catálogo de capacitaciones. Sección: 'capacitaciones'.
empresa_id en lecturas: X-Empresa-Id. En escrituras: viene explícito en el body.
"""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request

from schemas.capacitacion import (
    CapacitacionCreate, CapacitacionListResponse, CapacitacionResponse, CapacitacionUpdate,
)
from services.capacitacion_service import CapacitacionService
from utils.empresa import get_empresa_id

router = APIRouter()
SECCION = "capacitaciones"


def _svc() -> CapacitacionService:
    return CapacitacionService()


@router.get("", response_model=CapacitacionListResponse)
async def list_capacitaciones(
    request: Request,
    solo_activos: bool = Query(True),
    service: CapacitacionService = Depends(_svc),
) -> CapacitacionListResponse:
    return service.get_all(get_empresa_id(request), solo_activos)


@router.get("/{id}", response_model=CapacitacionResponse)
async def get_capacitacion(
    id: UUID,
    request: Request,
    service: CapacitacionService = Depends(_svc),
) -> CapacitacionResponse:
    return service.get_by_id(id, get_empresa_id(request))


@router.post("", response_model=CapacitacionResponse, status_code=201)
async def create_capacitacion(
    request: Request,
    body: CapacitacionCreate,
    service: CapacitacionService = Depends(_svc),
) -> CapacitacionResponse:
    return service.create(body, request.state.user.get("id", "system"))


@router.put("/{id}", response_model=CapacitacionResponse)
async def update_capacitacion(
    id: UUID,
    request: Request,
    body: CapacitacionUpdate,
    service: CapacitacionService = Depends(_svc),
) -> CapacitacionResponse:
    return service.update(id, body, get_empresa_id(request))


@router.delete("/{id}", status_code=200)
async def delete_capacitacion(
    id: UUID,
    request: Request,
    service: CapacitacionService = Depends(_svc),
) -> dict:
    service.delete(id, get_empresa_id(request))
    return {"ok": True}
