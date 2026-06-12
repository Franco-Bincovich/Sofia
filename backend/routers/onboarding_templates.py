"""
Router de templates de onboarding — CRUD de templates y tareas configurables.
Montado en /api/onboarding/templates.
empresa_id para lecturas/scoping: header X-Empresa-Id (None = todas).
empresa_id para CREATE: viene en el body (root entity, dato explícito).
"""
from uuid import UUID

from fastapi import APIRouter, Depends, Request

from schemas.onboarding import (
    TareaCreate, TareaResponse, TareaUpdate,
    TemplateCreate, TemplateResponse, TemplateUpdate,
)
from services.onboarding_templates_service import OnboardingTemplatesService
from utils.empresa import get_empresa_id

router = APIRouter()
_Svc = Depends(lambda: OnboardingTemplatesService())


@router.get("", response_model=list[TemplateResponse])
async def list_templates(request: Request, svc: OnboardingTemplatesService = _Svc) -> list[TemplateResponse]:
    return svc.get_templates(get_empresa_id(request))


@router.post("", response_model=TemplateResponse, status_code=201)
async def create_template(body: TemplateCreate, svc: OnboardingTemplatesService = _Svc) -> TemplateResponse:
    return svc.create_template(body)


@router.get("/{template_id}", response_model=TemplateResponse)
async def get_template(template_id: UUID, request: Request, svc: OnboardingTemplatesService = _Svc) -> TemplateResponse:
    return svc.get_template(template_id, get_empresa_id(request))


@router.put("/{template_id}", response_model=TemplateResponse)
async def update_template(
    template_id: UUID, body: TemplateUpdate, request: Request, svc: OnboardingTemplatesService = _Svc,
) -> TemplateResponse:
    return svc.update_template(template_id, body, get_empresa_id(request))


@router.delete("/{template_id}", response_model=dict)
async def delete_template(template_id: UUID, svc: OnboardingTemplatesService = _Svc) -> dict:
    svc.delete_template(template_id)
    return {"ok": True}


@router.post("/{template_id}/tareas", response_model=TareaResponse, status_code=201)
async def add_tarea(
    template_id: UUID, body: TareaCreate, request: Request, svc: OnboardingTemplatesService = _Svc,
) -> TareaResponse:
    return svc.add_tarea(template_id, body, get_empresa_id(request))


@router.put("/{template_id}/tareas/{tarea_id}", response_model=TareaResponse)
async def update_tarea(
    template_id: UUID, tarea_id: UUID, body: TareaUpdate, request: Request, svc: OnboardingTemplatesService = _Svc,
) -> TareaResponse:
    return svc.update_tarea(template_id, tarea_id, body, get_empresa_id(request))


@router.delete("/{template_id}/tareas/{tarea_id}", response_model=dict)
async def delete_tarea(
    template_id: UUID, tarea_id: UUID, svc: OnboardingTemplatesService = _Svc,
) -> dict:
    svc.delete_tarea(template_id, tarea_id)
    return {"ok": True}
