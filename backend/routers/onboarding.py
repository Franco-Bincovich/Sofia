"""
Router de onboarding — instancias activas y completado de tareas.
Rutas protegidas por AuthMiddleware.
"""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends

from schemas.onboarding import IniciarOnboardingRequest, InstanciaDetalleResponse, InstanciaResponse
from services.onboarding_service import OnboardingService

router = APIRouter()


def _service() -> OnboardingService:
    return OnboardingService()


@router.get("", response_model=list[InstanciaResponse])
async def list_onboardings(
    service: OnboardingService = Depends(_service),
) -> list[InstanciaResponse]:
    return service.get_onboardings_activos()


@router.get("/{empleado_id}", response_model=InstanciaDetalleResponse)
async def get_onboarding_empleado(
    empleado_id: UUID,
    service: OnboardingService = Depends(_service),
) -> InstanciaDetalleResponse:
    return service.get_onboarding_empleado(empleado_id)


@router.post("/{empleado_id}/iniciar", response_model=InstanciaResponse, status_code=201)
async def iniciar_onboarding(
    empleado_id: UUID,
    body: Optional[IniciarOnboardingRequest] = None,
    service: OnboardingService = Depends(_service),
) -> InstanciaResponse:
    template_id = body.template_id if body else None
    return service.iniciar_onboarding(empleado_id, template_id)


@router.put(
    "/{instancia_id}/tareas/{tarea_id}/completar",
    response_model=dict,
)
async def completar_tarea(
    instancia_id: UUID,
    tarea_id: UUID,
    service: OnboardingService = Depends(_service),
) -> dict:
    service.completar_tarea(instancia_id, tarea_id)
    return {"ok": True}
