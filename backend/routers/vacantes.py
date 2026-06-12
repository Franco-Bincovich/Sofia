"""
Router de vacantes y pipeline de candidatos.
Rutas protegidas por AuthMiddleware (requieren JWT válido).
empresa_id para lecturas: header X-Empresa-Id (get_empresa_id).
empresa_id para CREATE de vacante: body.empresa_id (dato explícito, igual que empleados).
empresa_id para candidatos: se hereda de la vacante — no se solicita al usuario.
"""
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request

from schemas.vacante import CandidatoCreate, CandidatoResponse, CandidatoDesdeEmailRequest, EmailCandidatoResponse, PublicarLinkedinRequest, PublicarLinkedinResponse, VacanteCreate, VacanteResponse, VacanteUpdate
from services.gmail_service import GmailService
from services.vacante_service import VacanteService
from services.zernio_service import ZernioService
from utils.empresa import get_empresa_id

router = APIRouter()


def _svc() -> VacanteService:
    return VacanteService()


@router.get("", response_model=List[VacanteResponse])
async def list_vacantes(
    request: Request, estado: Optional[str] = Query(None), service: VacanteService = Depends(_svc)
) -> List[VacanteResponse]:
    return service.get_vacantes(estado, get_empresa_id(request))


@router.get("/{id}", response_model=VacanteResponse)
async def get_vacante(id: UUID, request: Request, service: VacanteService = Depends(_svc)) -> VacanteResponse:
    return service.get_vacante(id, get_empresa_id(request))


@router.post("", response_model=VacanteResponse, status_code=201)
async def create_vacante(
    request: Request, body: VacanteCreate, service: VacanteService = Depends(_svc)
) -> VacanteResponse:
    return service.create_vacante(body, request.state.user.get("id", "system"))


@router.put("/{id}", response_model=VacanteResponse)
async def update_vacante(
    id: UUID, body: VacanteUpdate, request: Request, service: VacanteService = Depends(_svc)
) -> VacanteResponse:
    return service.update_vacante(id, body, get_empresa_id(request))


@router.get("/{id}/candidatos", response_model=List[CandidatoResponse])
async def list_candidatos(id: UUID, request: Request, service: VacanteService = Depends(_svc)) -> List[CandidatoResponse]:
    return service.get_candidatos(id, get_empresa_id(request))


@router.post("/{id}/candidatos", response_model=CandidatoResponse, status_code=201)
async def add_candidato(
    id: UUID, body: CandidatoCreate, request: Request, service: VacanteService = Depends(_svc)
) -> CandidatoResponse:
    return service.add_candidato(id, body, get_empresa_id(request))


@router.post("/{id}/publicar-linkedin", response_model=PublicarLinkedinResponse)
async def publicar_linkedin(id: UUID, body: PublicarLinkedinRequest, request: Request) -> PublicarLinkedinResponse:
    return ZernioService().publicar_en_vacante(str(id), body.email_contacto, request.state.user["id"])


@router.get("/{id}/emails-candidatos", response_model=List[EmailCandidatoResponse])
async def get_emails_candidatos(id: UUID, request: Request) -> List[EmailCandidatoResponse]:
    return GmailService().get_emails_candidatos(str(id), request.state.user["id"])


@router.post("/{id}/candidatos-desde-email", response_model=CandidatoResponse, status_code=201)
async def candidato_desde_email(id: UUID, body: CandidatoDesdeEmailRequest, request: Request) -> CandidatoResponse:
    return GmailService().crear_candidato_desde_email(str(id), body.email_id, request.state.user["id"])
