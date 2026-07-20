"""Router del catálogo global de tipos de ausencia. Se registra en /api/ausencias ANTES
del router de ausencias (rutas estáticas /tipos vs /{id}). Los tipos son globales: no
pertenecen a ninguna empresa."""
from fastapi import APIRouter, Depends

from schemas.ausencias import (
    TipoAusenciaCreate, TipoAusenciaListResponse, TipoAusenciaResponse,
)
from services.tipos_ausencia_service import TiposAusenciaService
from utils.permisos import Accion, Seccion, require_permission

router = APIRouter()
SECCION = Seccion.AUSENCIAS


def _tipos_svc() -> TiposAusenciaService: return TiposAusenciaService()


@router.get("/tipos", response_model=TipoAusenciaListResponse, dependencies=[Depends(require_permission(SECCION, Accion.READ))])
async def list_tipos(service: TiposAusenciaService = Depends(_tipos_svc)) -> TipoAusenciaListResponse:
    return service.get_tipos()


@router.post("/tipos", response_model=TipoAusenciaResponse, status_code=201, dependencies=[Depends(require_permission(SECCION, Accion.WRITE))])
async def create_tipo(body: TipoAusenciaCreate, service: TiposAusenciaService = Depends(_tipos_svc)) -> TipoAusenciaResponse:
    return service.create_tipo(body)
