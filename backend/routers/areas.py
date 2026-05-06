"""
Router de áreas — CRUD completo.
Rutas protegidas por AuthMiddleware (requieren JWT válido).
"""
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, Request

from middleware.auth_dependencies import get_admin_user
from schemas.area import AreaCreate, AreaResponse, AreaUpdate
from services.area_service import AreaService

router = APIRouter()


def _service() -> AreaService:
    return AreaService()


@router.get("", response_model=List[AreaResponse])
async def list_areas(
    service: AreaService = Depends(_service),
) -> List[AreaResponse]:
    return service.get_areas()


@router.get("/{id}", response_model=AreaResponse)
async def get_area(
    id: UUID,
    service: AreaService = Depends(_service),
) -> AreaResponse:
    return service.get_area(id)


@router.post("", response_model=AreaResponse, status_code=201)
async def create_area(
    request: Request,
    body: AreaCreate,
    service: AreaService = Depends(_service),
    _: dict = Depends(get_admin_user),
) -> AreaResponse:
    created_by = request.state.user.get("id", "system")
    return service.create_area(body, created_by)


@router.put("/{id}", response_model=AreaResponse)
async def update_area(
    id: UUID,
    body: AreaUpdate,
    service: AreaService = Depends(_service),
) -> AreaResponse:
    return service.update_area(id, body)


@router.delete("/{id}", status_code=204)
async def delete_area(
    id: UUID,
    service: AreaService = Depends(_service),
) -> None:
    service.delete_area(id)
