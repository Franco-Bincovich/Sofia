"""
Router de empleados — CRUD con paginación y filtros.
Rutas protegidas por AuthMiddleware (requieren JWT válido).
"""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request

from schemas.empleado import (
    EmpleadoCreate,
    EmpleadoListResponse,
    EmpleadoResponse,
    EmpleadoUpdate,
)
from services.empleado_service import EmpleadoService

router = APIRouter()


def _service() -> EmpleadoService:
    return EmpleadoService()


@router.get("", response_model=EmpleadoListResponse)
async def list_empleados(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    area_id: Optional[str] = Query(None),
    estado: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    service: EmpleadoService = Depends(_service),
) -> EmpleadoListResponse:
    return service.get_empleados(page, page_size, area_id, estado, search)


@router.get("/{id}", response_model=EmpleadoResponse)
async def get_empleado(
    id: UUID,
    service: EmpleadoService = Depends(_service),
) -> EmpleadoResponse:
    return service.get_empleado(id)


@router.post("", response_model=EmpleadoResponse, status_code=201)
async def create_empleado(
    request: Request,
    body: EmpleadoCreate,
    service: EmpleadoService = Depends(_service),
) -> EmpleadoResponse:
    created_by = request.state.user.get("id", "system")
    return service.create_empleado(body, created_by)


@router.put("/{id}", response_model=EmpleadoResponse)
async def update_empleado(
    id: UUID,
    body: EmpleadoUpdate,
    service: EmpleadoService = Depends(_service),
) -> EmpleadoResponse:
    return service.update_empleado(id, body)


@router.delete("/{id}", status_code=204)
async def delete_empleado(
    id: UUID,
    service: EmpleadoService = Depends(_service),
) -> None:
    service.deactivate_empleado(id)
