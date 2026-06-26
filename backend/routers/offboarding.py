"""
Router de offboarding — listado, creación y actualización de activos.
Rutas protegidas por AuthMiddleware.
empresa_id para lecturas: header X-Empresa-Id (filtro de vista, None = todas).
empresa_id para CREATE: heredada del empleado (el service la resuelve internamente).
"""
from uuid import UUID

from fastapi import APIRouter, Depends, Request

from schemas.offboarding import ActivoUpdate, OffboardingCreate, OffboardingResponse
from services.offboarding_service import OffboardingService
from utils.empresa import get_empresa_id
from utils.permisos import Accion, Seccion, require_permission

router = APIRouter()
SECCION = Seccion.OFFBOARDING


def _service() -> OffboardingService:
    return OffboardingService()


@router.get("", response_model=list[OffboardingResponse], dependencies=[Depends(require_permission(SECCION, Accion.READ))])
async def list_offboardings(
    request: Request,
    service: OffboardingService = Depends(_service),
) -> list[OffboardingResponse]:
    empresa_id = get_empresa_id(request)
    return service.get_offboardings_activos(empresa_id)


@router.post("", response_model=OffboardingResponse, status_code=201, dependencies=[Depends(require_permission(SECCION, Accion.WRITE))])
async def crear_offboarding(
    body: OffboardingCreate,
    request: Request,
    service: OffboardingService = Depends(_service),
) -> OffboardingResponse:
    return service.iniciar_offboarding(body, get_empresa_id(request), request.state.user.get("id", "system"))


@router.put(
    "/{instancia_id}/activos/{activo_id}",
    response_model=dict,
    dependencies=[Depends(require_permission(SECCION, Accion.WRITE))],
)
async def actualizar_activo(
    instancia_id: UUID,
    activo_id: UUID,
    body: ActivoUpdate,
    request: Request,
    service: OffboardingService = Depends(_service),
) -> dict:
    service.marcar_activo_devuelto(
        instancia_id, activo_id, body.devuelto,
        request.state.user.get("id", "system"), get_empresa_id(request),
    )
    return {"ok": True}
