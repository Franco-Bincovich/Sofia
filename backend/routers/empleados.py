"""
Router de empleados — CRUD con paginación y filtros.
Rutas protegidas por AuthMiddleware (requieren JWT válido).
empresa_id para lecturas: header X-Empresa-Id (filtro de vista).
empresa_id para CREATE: body.empresa_id (dato del empleado, no contexto de sesión).
"""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request

from schemas.empleado import (
    EmpleadoCreate, EmpleadoListResponse, EmpleadoResponse, EmpleadoUpdate,
)
from services.empleado_service import EmpleadoService
from utils.empresa import get_empresa_id
from utils.permisos import Accion, Seccion, require_permission

router = APIRouter()
SECCION = Seccion.EMPLEADOS


def _service() -> EmpleadoService:
    return EmpleadoService()


@router.get("", response_model=EmpleadoListResponse, dependencies=[Depends(require_permission(SECCION, Accion.READ))])
async def list_empleados(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    area_id: Optional[str] = Query(None),
    estado: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    service: EmpleadoService = Depends(_service),
) -> EmpleadoListResponse:
    empresa_id = get_empresa_id(request)
    return service.get_empleados(page, page_size, empresa_id, area_id, estado, search)


@router.get("/{id}", response_model=EmpleadoResponse, dependencies=[Depends(require_permission(SECCION, Accion.READ))])
async def get_empleado(
    id: UUID, request: Request, service: EmpleadoService = Depends(_service),
) -> EmpleadoResponse:
    empresa_id = get_empresa_id(request)
    return service.get_empleado(id, empresa_id)


@router.post("", response_model=EmpleadoResponse, status_code=201, dependencies=[Depends(require_permission(SECCION, Accion.WRITE))])
async def create_empleado(
    request: Request,
    body: EmpleadoCreate,
    service: EmpleadoService = Depends(_service),
) -> EmpleadoResponse:
    created_by = request.state.user.get("id", "system")
    # empresa_id viene del body (dato del empleado), no del header X-Empresa-Id
    return service.create_empleado(body, created_by, body.empresa_id)


@router.put("/{id}", response_model=EmpleadoResponse, dependencies=[Depends(require_permission(SECCION, Accion.WRITE))])
async def update_empleado(
    id: UUID,
    request: Request,
    body: EmpleadoUpdate,
    service: EmpleadoService = Depends(_service),
) -> EmpleadoResponse:
    empresa_id = get_empresa_id(request)
    return service.update_empleado(id, body, empresa_id, request.state.user.get("id", "system"))


@router.delete("/{id}", status_code=204, dependencies=[Depends(require_permission(SECCION, Accion.WRITE))])
async def delete_empleado(
    id: UUID,
    request: Request,
    service: EmpleadoService = Depends(_service),
) -> None:
    empresa_id = get_empresa_id(request)
    service.deactivate_empleado(id, empresa_id, request.state.user.get("id", "system"))
