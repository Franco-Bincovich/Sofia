"""Router de ausencias. Sección: "ausencias". empresa_id en lecturas: X-Empresa-Id; en escrituras: heredado del empleado. Tipos: catálogo global."""
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query, Request

from schemas.ausencias import (
    AusenciaCreate, AusenciaListResponse, AusenciaResponse, AusenciaUpdate,
    TipoAusenciaCreate, TipoAusenciaListResponse, TipoAusenciaResponse,
)
from services.ausencias_service import AusenciasService
from utils.empresa import get_empresa_id
from utils.permisos import Seccion

router = APIRouter()
SECCION = Seccion.AUSENCIAS


def _svc() -> AusenciasService:
    return AusenciasService()


# ── Tipos de ausencia (catálogo global) ────────────────────────────────────────

@router.get("/tipos", response_model=TipoAusenciaListResponse)
async def list_tipos(service: AusenciasService = Depends(_svc)) -> TipoAusenciaListResponse:
    return service.get_tipos()


@router.post("/tipos", response_model=TipoAusenciaResponse, status_code=201)
async def create_tipo(body: TipoAusenciaCreate, service: AusenciasService = Depends(_svc)) -> TipoAusenciaResponse:
    return service.create_tipo(body)


# ── Ausencias ──────────────────────────────────────────────────────────────────

@router.get("", response_model=AusenciaListResponse)
async def list_ausencias(
    request: Request,
    area_id: Optional[UUID] = Query(None),
    tipo_id: Optional[UUID] = Query(None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    service: AusenciasService = Depends(_svc),
) -> AusenciaListResponse:
    return service.get_all(get_empresa_id(request), area_id, tipo_id, page, page_size)


@router.get("/{id}", response_model=AusenciaResponse)
async def get_ausencia(
    id: UUID,
    request: Request,
    service: AusenciasService = Depends(_svc),
) -> AusenciaResponse:
    return service.get_by_id(id, get_empresa_id(request))


@router.post("", response_model=AusenciaResponse, status_code=201)
async def create_ausencia(
    request: Request,
    body: AusenciaCreate,
    service: AusenciasService = Depends(_svc),
) -> AusenciaResponse:
    return service.create(body, request.state.user.get("id", "system"))


@router.put("/{id}", response_model=AusenciaResponse)
async def update_ausencia(
    id: UUID,
    request: Request,
    body: AusenciaUpdate,
    service: AusenciasService = Depends(_svc),
) -> AusenciaResponse:
    return service.update(id, body, get_empresa_id(request))


@router.delete("/{id}", status_code=200)
async def delete_ausencia(
    id: UUID,
    request: Request,
    service: AusenciasService = Depends(_svc),
) -> dict:
    service.delete(id, get_empresa_id(request))
    return {"ok": True}
