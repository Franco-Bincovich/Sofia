"""
Router del Panel de Procesos.
Ruta protegida por AuthMiddleware (requiere JWT válido).
empresa_id para lectura: header X-Empresa-Id (None = consolidado).
"""
from fastapi import APIRouter, Depends, Request

from schemas.procesos import ProcesosResponse
from services.procesos_service import ProcesosService
from utils.empresa import get_empresa_id
from utils.permisos import Accion, Seccion, require_permission

router = APIRouter()
SECCION = Seccion.PROCESOS


def _service() -> ProcesosService:
    return ProcesosService()


@router.get("", response_model=ProcesosResponse, dependencies=[Depends(require_permission(SECCION, Accion.READ))])
async def get_procesos(
    request: Request,
    service: ProcesosService = Depends(_service),
) -> ProcesosResponse:
    empresa_id = get_empresa_id(request)
    return service.get_procesos(empresa_id)
