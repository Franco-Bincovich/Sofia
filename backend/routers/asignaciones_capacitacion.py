"""Router de asignaciones de capacitaciones. Prefijo: /api/capacitaciones/asignaciones.
empresa_id en lecturas: X-Empresa-Id. En escrituras: heredado del empleado.
"""
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, File, Query, Request, UploadFile
from schemas.capacitacion import AsignacionCreate, AsignacionListResponse, AsignacionResponse, AsignacionUpdate
from services.asignacion_service import AsignacionService
from utils.empresa import get_empresa_id
from utils.files import ALLOWED_TYPES_CERTIFICADO, MAX_SIZE_CERTIFICADO, validate_upload

router = APIRouter()
def _svc() -> AsignacionService: return AsignacionService()


@router.get("", response_model=AsignacionListResponse)
async def list_asignaciones(
    request: Request,
    empleado_id: Optional[UUID] = Query(None),
    capacitacion_id: Optional[UUID] = Query(None),
    estado: Optional[str] = Query(None),
    area_id: Optional[UUID] = Query(None),
    service: AsignacionService = Depends(_svc),
) -> AsignacionListResponse:
    return service.get_all(get_empresa_id(request), empleado_id, capacitacion_id, estado, area_id)


@router.post("", response_model=AsignacionResponse, status_code=201)
async def create_asignacion(
    request: Request,
    body: AsignacionCreate,
    service: AsignacionService = Depends(_svc),
) -> AsignacionResponse:
    return service.create(body, request.state.user.get("id", "system"))


@router.put("/{id}", response_model=AsignacionResponse)
async def update_asignacion(
    id: UUID,
    request: Request,
    body: AsignacionUpdate,
    service: AsignacionService = Depends(_svc),
) -> AsignacionResponse:
    return service.update_estado(id, body, get_empresa_id(request))


@router.delete("/{id}", status_code=200)
async def delete_asignacion(
    id: UUID,
    request: Request,
    service: AsignacionService = Depends(_svc),
) -> dict:
    service.delete(id, get_empresa_id(request))
    return {"ok": True}


@router.post("/{id}/certificado", response_model=AsignacionResponse)
async def upload_certificado(
    id: UUID,
    request: Request,
    file: UploadFile = File(...),
    service: AsignacionService = Depends(_svc),
) -> AsignacionResponse:
    content = await file.read()
    validate_upload(content, file.content_type, ALLOWED_TYPES_CERTIFICADO, MAX_SIZE_CERTIFICADO, "certificado")
    return service.upload_certificado(
        str(id), get_empresa_id(request),
        content, file.filename or "certificado", file.content_type or "application/pdf",
    )


@router.get("/{id}/certificado", status_code=200)
async def get_certificado_url(
    id: UUID,
    request: Request,
    service: AsignacionService = Depends(_svc),
) -> dict:
    return {"url": service.get_certificado_signed_url(str(id), get_empresa_id(request))}
