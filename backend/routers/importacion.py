"""Router de importación masiva de empleados via CSV. Rutas protegidas por AuthMiddleware."""
from fastapi import APIRouter, Depends, File, Form, Request, UploadFile

from schemas.importacion import (
    ImportacionConfirmarRequest,
    ImportacionConfirmarResponse,
    ImportacionPreviewResponse,
)
from services.csv_service import parse_empleados_csv
from services.empleado_import_service import EmpleadoImportService
from utils.files import ALLOWED_TYPES_CSV, MAX_SIZE_CSV, validate_upload
from utils.permisos import Accion, Seccion, require_permission

router = APIRouter()
SECCION = Seccion.IMPORTACION


def _service() -> EmpleadoImportService:
    return EmpleadoImportService()


@router.post("/empleados/preview", response_model=ImportacionPreviewResponse, dependencies=[Depends(require_permission(SECCION, Accion.WRITE))])
async def preview_csv(
    empresa_id: str = Form(...),
    file: UploadFile = File(...),
) -> ImportacionPreviewResponse:
    """Parsea y valida el CSV devolviendo vista previa sin guardar nada.
    Filtra áreas por la empresa elegida y marca DNIs ya existentes (es_actualizacion)."""
    content = await file.read()
    validate_upload(content, file.content_type, ALLOWED_TYPES_CSV, MAX_SIZE_CSV, "archivo CSV")
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    validas, errores = parse_empleados_csv(text, empresa_id)
    return ImportacionPreviewResponse(filas_validas=validas, errores=errores)


@router.post("/empleados/confirmar", response_model=ImportacionConfirmarResponse, dependencies=[Depends(require_permission(SECCION, Accion.WRITE))])
async def confirmar_importacion(
    body: ImportacionConfirmarRequest,
    request: Request,
    service: EmpleadoImportService = Depends(_service),
) -> ImportacionConfirmarResponse:
    """UPSERT en batch con re-validación de carrera y errores parciales (orquestado por el service)."""
    return service.confirmar(body.empresa_id, body.filas, request.state.user.get("id", "system"))
