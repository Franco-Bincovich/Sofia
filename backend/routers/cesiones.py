"""
Router de cesiones (entidad hija de empleado). Montado en /api (rutas anidadas bajo empleado
para crear/listar; top-level /cesiones/{id} para editar/borrar). Gating: Seccion.EMPLEADOS.
"""
from uuid import UUID

from fastapi import APIRouter, Depends, Request

from schemas.cesion import CesionCreate, CesionListResponse, CesionResponse, CesionUpdate
from services.cesion_service import CesionService
from utils.empresa import get_empresa_id
from utils.permisos import Accion, Seccion, require_permission

router = APIRouter()
SECCION = Seccion.EMPLEADOS


def _svc() -> CesionService:
    return CesionService()


@router.get(
    "/empleados/{empleado_id}/cesiones", response_model=CesionListResponse,
    dependencies=[Depends(require_permission(SECCION, Accion.READ))],
)
async def listar_cesiones(
    empleado_id: UUID, request: Request, service: CesionService = Depends(_svc),
) -> CesionListResponse:
    return service.listar(empleado_id, get_empresa_id(request))


@router.post(
    "/empleados/{empleado_id}/cesiones", response_model=CesionResponse, status_code=201,
    dependencies=[Depends(require_permission(SECCION, Accion.WRITE))],
)
async def crear_cesion(
    empleado_id: UUID, body: CesionCreate, request: Request, service: CesionService = Depends(_svc),
) -> CesionResponse:
    return service.crear(empleado_id, body, get_empresa_id(request), request.state.user.get("id", "system"))


@router.put(
    "/cesiones/{id}", response_model=CesionResponse,
    dependencies=[Depends(require_permission(SECCION, Accion.WRITE))],
)
async def editar_cesion(
    id: UUID, body: CesionUpdate, request: Request, service: CesionService = Depends(_svc),
) -> CesionResponse:
    return service.actualizar(id, body, get_empresa_id(request), request.state.user.get("id", "system"))


@router.delete(
    "/cesiones/{id}", status_code=204,
    dependencies=[Depends(require_permission(SECCION, Accion.WRITE))],
)
async def borrar_cesion(
    id: UUID, request: Request, service: CesionService = Depends(_svc),
) -> None:
    service.eliminar(id, get_empresa_id(request), request.state.user.get("id", "system"))
