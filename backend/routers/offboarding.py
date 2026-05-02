"""
Router de offboarding — listado, creación y actualización de activos.
Rutas protegidas por AuthMiddleware.
"""
from uuid import UUID

from fastapi import APIRouter, Depends

from schemas.offboarding import ActivoUpdate, OffboardingCreate, OffboardingResponse
from services.offboarding_service import OffboardingService

router = APIRouter()


def _service() -> OffboardingService:
    return OffboardingService()


@router.get("", response_model=list[OffboardingResponse])
async def list_offboardings(
    service: OffboardingService = Depends(_service),
) -> list[OffboardingResponse]:
    return service.get_offboardings_activos()


@router.post("", response_model=OffboardingResponse, status_code=201)
async def crear_offboarding(
    body: OffboardingCreate,
    service: OffboardingService = Depends(_service),
) -> OffboardingResponse:
    return service.iniciar_offboarding(body)


@router.put(
    "/{instancia_id}/activos/{activo_id}",
    response_model=dict,
)
async def actualizar_activo(
    instancia_id: UUID,
    activo_id: UUID,
    body: ActivoUpdate,
    service: OffboardingService = Depends(_service),
) -> dict:
    service.marcar_activo_devuelto(instancia_id, activo_id, body.devuelto)
    return {"ok": True}
