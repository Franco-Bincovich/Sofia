"""Router de importación masiva de empleados via CSV. Rutas protegidas por AuthMiddleware."""
from fastapi import APIRouter, Depends, File, Form, UploadFile

from repositories.empleado_import_repo import EmpleadoImportRepo
from schemas.importacion import (
    ConfirmarError,
    ImportacionConfirmarRequest,
    ImportacionConfirmarResponse,
    ImportacionPreviewResponse,
)
from services.csv_service import parse_empleados_csv
from utils.files import ALLOWED_TYPES_CSV, MAX_SIZE_CSV, validate_upload
from utils.logger import logger
from utils.permisos import Accion, Seccion, require_permission

router = APIRouter()
SECCION = Seccion.IMPORTACION


def _repo() -> EmpleadoImportRepo:
    return EmpleadoImportRepo()


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
    repo: EmpleadoImportRepo = Depends(_repo),
) -> ImportacionConfirmarResponse:
    """UPSERT en batch: INSERT para filas nuevas, UPDATE por PK para DNIs existentes."""
    filas = [{**f.model_dump(), "empresa_id": body.empresa_id} for f in body.filas]
    aplicados = {r.get("dni") for r in repo.batch_upsert_empleados(filas)}

    importados = sum(1 for f in body.filas if not f.es_actualizacion and f.dni in aplicados)
    actualizados = sum(1 for f in body.filas if f.es_actualizacion and f.dni in aplicados)
    errores = [
        ConfirmarError(fila=f.fila, error=f"DNI {f.dni} ya no existe en la empresa")
        for f in body.filas
        if f.es_actualizacion and f.dni not in aplicados
    ]

    logger.info(
        "Importación CSV confirmada",
        extra={"importados": importados, "actualizados": actualizados, "errores": len(errores)},
    )
    return ImportacionConfirmarResponse(importados=importados, actualizados=actualizados, errores=errores)
