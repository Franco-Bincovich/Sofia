"""
Router de vacaciones.
Sección: "vacaciones" (identificador estable para la futura capa de permisos).
empresa_id para lecturas: header X-Empresa-Id (get_empresa_id).
empresa_id para escrituras: se hereda del empleado en el service — no se solicita al usuario.
"""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request

from schemas.vacaciones import (
    SaldoVacacionesResponse,
    SolicitudVacacionesCreate,
    SolicitudVacacionesListResponse,
    SolicitudVacacionesResponse,
)
from services.vacaciones_service import VacacionesService
from utils.empresa import get_empresa_id

router = APIRouter()

SECCION = "vacaciones"


def _svc() -> VacacionesService:
    return VacacionesService()


@router.get("", response_model=SolicitudVacacionesListResponse)
async def list_vacaciones(
    request: Request,
    area_id: Optional[UUID] = Query(None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    service: VacacionesService = Depends(_svc),
) -> SolicitudVacacionesListResponse:
    return service.get_all(get_empresa_id(request), area_id, page, page_size)


# /saldo/{id} debe ir ANTES de /{id} para evitar colisión de rutas
@router.get("/saldo/{empleado_id}", response_model=SaldoVacacionesResponse)
async def get_saldo(
    empleado_id: UUID,
    service: VacacionesService = Depends(_svc),
) -> SaldoVacacionesResponse:
    return service.get_saldo(empleado_id)


@router.get("/{id}", response_model=SolicitudVacacionesResponse)
async def get_vacacion(
    id: UUID,
    request: Request,
    service: VacacionesService = Depends(_svc),
) -> SolicitudVacacionesResponse:
    return service.get_by_id(id, get_empresa_id(request))


@router.post("", response_model=SolicitudVacacionesResponse, status_code=201)
async def create_vacacion(
    request: Request,
    body: SolicitudVacacionesCreate,
    service: VacacionesService = Depends(_svc),
) -> SolicitudVacacionesResponse:
    return service.create(body, request.state.user.get("id", "system"))


@router.put("/{id}/cancelar", response_model=SolicitudVacacionesResponse)
async def cancel_vacacion(
    id: UUID,
    request: Request,
    service: VacacionesService = Depends(_svc),
) -> SolicitudVacacionesResponse:
    return service.cancel(id, get_empresa_id(request))
