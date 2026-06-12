"""
Router de Organigrama.
GET /api/organigrama          → vista Empresa → Área → Empleado
GET /api/organigrama/proyectos → vistas por proyecto (árbol + cards)
Ruta protegida por AuthMiddleware. empresa_id: header X-Empresa-Id (None = consolidado).
"""
from typing import List

from fastapi import APIRouter, Depends, Request

from schemas.organigrama import EmpresaNodoResponse, OrgProyectosResponse
from services.organigrama_proyectos_service import OrganigramaProyectosService
from services.organigrama_service import OrganigramaService
from utils.empresa import get_empresa_id

router = APIRouter()


def _svc() -> OrganigramaService:
    return OrganigramaService()


def _proy_svc() -> OrganigramaProyectosService:
    return OrganigramaProyectosService()


@router.get("", response_model=List[EmpresaNodoResponse])
async def get_organigrama(
    request: Request,
    service: OrganigramaService = Depends(_svc),
) -> List[EmpresaNodoResponse]:
    return service.get_organigrama_empresa(get_empresa_id(request))


@router.get("/proyectos", response_model=OrgProyectosResponse)
async def get_organigrama_proyectos(
    request: Request,
    service: OrganigramaProyectosService = Depends(_proy_svc),
) -> OrgProyectosResponse:
    return service.get_organigrama_proyectos(get_empresa_id(request))
