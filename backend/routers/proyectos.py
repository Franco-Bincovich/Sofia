"""
Router de proyectos. Montado en /api/proyectos.
empresa_id para lecturas: header X-Empresa-Id (empresa dueña). None = consolidado.
Para crear: empresa_id explícito en el body (el usuario selecciona la empresa dueña).
"""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request

from schemas.proyectos import (
    ProyectoCreate, ProyectoListResponse, ProyectoResponse, ProyectoUpdate,
)
from services.proyectos_service import ProyectosService
from utils.empresa import get_empresa_id
from utils.permisos import Seccion

router = APIRouter()
SECCION = Seccion.PROYECTOS


def _svc() -> ProyectosService:
    return ProyectosService()


@router.get("", response_model=ProyectoListResponse)
async def list_proyectos(
    request: Request,
    estado: Optional[str] = Query(None),
    service: ProyectosService = Depends(_svc),
) -> ProyectoListResponse:
    return service.get_all(get_empresa_id(request), estado)


@router.get("/{id}", response_model=ProyectoResponse)
async def get_proyecto(
    id: UUID, request: Request,
    service: ProyectosService = Depends(_svc),
) -> ProyectoResponse:
    return service.get_by_id(id, get_empresa_id(request))


@router.post("", response_model=ProyectoResponse, status_code=201)
async def create_proyecto(
    body: ProyectoCreate,
    service: ProyectosService = Depends(_svc),
) -> ProyectoResponse:
    return service.create(body)


@router.put("/{id}", response_model=ProyectoResponse)
async def update_proyecto(
    id: UUID, request: Request, body: ProyectoUpdate,
    service: ProyectosService = Depends(_svc),
) -> ProyectoResponse:
    return service.update(id, body, get_empresa_id(request))


@router.delete("/{id}", status_code=200)
async def delete_proyecto(
    id: UUID, request: Request,
    service: ProyectosService = Depends(_svc),
) -> dict:
    service.delete(id, get_empresa_id(request))
    return {"ok": True}
