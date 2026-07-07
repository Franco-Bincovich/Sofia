"""Router del roster "mi equipo" (GET /api/equipo).

Gateado con la sección VACACIONES en modo READ (mismo patrón que routers/vacaciones.py):
mandos_medios la tiene, y así se expone el universo de ownership SIN abrir la sección
empleados. NO crea una sección de permisos nueva. Sin paginación: lista corta."""
from typing import List

from fastapi import APIRouter, Depends, Request

from schemas.equipo import EquipoMiembroResponse
from services.equipo_service import EquipoService
from utils.permisos import Accion, Seccion, require_permission

router = APIRouter()

SECCION = Seccion.VACACIONES


def _svc() -> EquipoService:
    return EquipoService()


@router.get("", response_model=List[EquipoMiembroResponse], dependencies=[Depends(require_permission(SECCION, Accion.READ))])
async def list_equipo(request: Request, service: EquipoService = Depends(_svc)) -> List[EquipoMiembroResponse]:
    u = request.state.user
    return service.get_equipo(u.get("id"), u.get("rol"))
