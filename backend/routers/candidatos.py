"""
Router de candidatos — operaciones del pipeline.
Rutas protegidas por AuthMiddleware (requieren JWT válido).
"""
from uuid import UUID

from fastapi import APIRouter, Depends, Request

from schemas.vacante import CandidatoResponse, EtapaUpdate
from services.vacante_service import VacanteService
from utils.empresa import get_empresa_id
from utils.permisos import Accion, Seccion, require_permission

router = APIRouter()
SECCION = Seccion.CANDIDATOS


def _svc() -> VacanteService:
    return VacanteService()


@router.put("/{id}/etapa", response_model=CandidatoResponse, dependencies=[Depends(require_permission(SECCION, Accion.WRITE))])
async def mover_candidato(
    id: UUID, body: EtapaUpdate, request: Request, service: VacanteService = Depends(_svc)
) -> CandidatoResponse:
    return service.mover_candidato(id, body.etapa, get_empresa_id(request))
