"""
Router de Assessment Engine.
Rutas protegidas requieren AuthMiddleware; evaluacion/* son públicas (sin X-Empresa-Id).
empresa_id para lecturas autenticadas: header X-Empresa-Id.
empresa_id para CREATE campaña: viene en el body (root entity).
empresa_id para resultados de evaluación pública: heredada de la campaña por el service.
"""
from uuid import UUID

from fastapi import APIRouter, Depends, Request

from schemas.assessment import (
    CampanaCreate, CampanaResponse, LinkCreate, LinkResponse,
    ResultadoResponse, RespuestaCreate,
)
from services.assessment_service import AssessmentService
from utils.empresa import get_empresa_id

router = APIRouter()


def _svc() -> AssessmentService:
    return AssessmentService()


@router.get("/campanas", response_model=list[CampanaResponse])
async def get_campanas(request: Request, svc: AssessmentService = Depends(_svc)) -> list[CampanaResponse]:
    return svc.get_campanas(get_empresa_id(request))


@router.post("/campanas", response_model=CampanaResponse, status_code=201)
async def create_campana(
    data: CampanaCreate,
    svc: AssessmentService = Depends(_svc),
) -> CampanaResponse:
    return svc.create_campana(data)


@router.post("/campanas/{campana_id}/links", response_model=LinkResponse, status_code=201)
async def create_link(
    campana_id: UUID,
    data: LinkCreate,
    svc: AssessmentService = Depends(_svc),
) -> LinkResponse:
    data.campana_id = campana_id
    return svc.create_link(data)


# ── Rutas públicas — sin AuthMiddleware, sin X-Empresa-Id ────────────────────
# La empresa se resuelve internamente desde la campaña asociada al token.

@router.get("/evaluacion/{token}", response_model=LinkResponse)
async def get_evaluacion(token: str, svc: AssessmentService = Depends(_svc)) -> LinkResponse:
    return svc.get_evaluacion(token)


@router.post("/evaluacion/{token}/submit", response_model=ResultadoResponse, status_code=201)
async def submit_evaluacion(
    token: str,
    data: RespuestaCreate,
    svc: AssessmentService = Depends(_svc),
) -> ResultadoResponse:
    return svc.submit_evaluacion(token, data)


# ── Resultados (autenticados) ─────────────────────────────────────────────────

@router.get("/resultados", response_model=list[ResultadoResponse])
async def get_resultados(request: Request, svc: AssessmentService = Depends(_svc)) -> list[ResultadoResponse]:
    return svc.get_resultados(get_empresa_id(request))


@router.get("/resultados/{resultado_id}", response_model=ResultadoResponse)
async def get_resultado(
    resultado_id: UUID,
    svc: AssessmentService = Depends(_svc),
) -> ResultadoResponse:
    return svc.get_resultado(resultado_id)
