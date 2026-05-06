"""
Router de Assessment Engine.
Rutas protegidas requieren AuthMiddleware; evaluacion/* son públicas.
"""
from uuid import UUID

from fastapi import APIRouter, Depends, Request

from schemas.assessment import (
    CampanaCreate, CampanaResponse, LinkCreate, LinkResponse,
    ResultadoResponse, RespuestaCreate,
)
from services.assessment_service import AssessmentService
from utils.rate_limiter import limiter

router = APIRouter()


def _svc() -> AssessmentService:
    return AssessmentService()


@router.get("/campanas", response_model=list[CampanaResponse])
async def get_campanas(svc: AssessmentService = Depends(_svc)) -> list[CampanaResponse]:
    return svc.get_campanas()


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


@router.get("/evaluacion/{token}", response_model=LinkResponse)
async def get_evaluacion(token: str, svc: AssessmentService = Depends(_svc)) -> LinkResponse:
    return svc.get_evaluacion(token)


@router.post("/evaluacion/{token}/submit", response_model=ResultadoResponse, status_code=201)
@limiter.limit("5/minute")
async def submit_evaluacion(
    request: Request,
    token: str,
    data: RespuestaCreate,
    svc: AssessmentService = Depends(_svc),
) -> ResultadoResponse:
    return svc.submit_evaluacion(token, data)


@router.get("/resultados", response_model=list[ResultadoResponse])
async def get_resultados(svc: AssessmentService = Depends(_svc)) -> list[ResultadoResponse]:
    return svc.get_resultados()


@router.get("/resultados/{resultado_id}", response_model=ResultadoResponse)
async def get_resultado(
    resultado_id: UUID,
    svc: AssessmentService = Depends(_svc),
) -> ResultadoResponse:
    return svc.get_resultado(resultado_id)
