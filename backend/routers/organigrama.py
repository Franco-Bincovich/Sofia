"""
Router de Organigrama — estructura jerárquica por área.
Ruta protegida por AuthMiddleware (requiere JWT válido).
"""
from typing import List

from fastapi import APIRouter, Depends

from schemas.organigrama import AreaNodoResponse
from services.organigrama_service import OrganigramaService

router = APIRouter()


def _service() -> OrganigramaService:
    return OrganigramaService()


@router.get("", response_model=List[AreaNodoResponse])
async def get_organigrama(
    service: OrganigramaService = Depends(_service),
) -> List[AreaNodoResponse]:
    return service.get_organigrama()
