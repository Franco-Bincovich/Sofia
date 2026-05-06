"""
Router de importación masiva de empleados via CSV.
Rutas protegidas por AuthMiddleware (requieren JWT válido).
"""
from fastapi import APIRouter, Depends, File, Request, UploadFile

from middleware.auth_dependencies import get_admin_user
from schemas.empleado import EmpleadoCreate
from schemas.importacion import (
    ConfirmarError,
    ImportacionConfirmarRequest,
    ImportacionConfirmarResponse,
    ImportacionPreviewResponse,
)
from services.csv_service import parse_empleados_csv
from services.empleado_service import EmpleadoService
from utils.logger import logger
from utils.rate_limiter import limiter

router = APIRouter()


def _service() -> EmpleadoService:
    return EmpleadoService()


@router.post("/empleados/preview", response_model=ImportacionPreviewResponse)
@limiter.limit("5/minute")
async def preview_csv(
    request: Request,
    file: UploadFile = File(...),
) -> ImportacionPreviewResponse:
    """Parsea y valida el CSV devolviendo una vista previa sin guardar nada."""
    content = await file.read()
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    validas, errores = parse_empleados_csv(text)
    return ImportacionPreviewResponse(filas_validas=validas, errores=errores)


@router.post("/empleados/confirmar", response_model=ImportacionConfirmarResponse)
@limiter.limit("3/minute")
async def confirmar_importacion(
    request: Request,
    body: ImportacionConfirmarRequest,
    service: EmpleadoService = Depends(_service),
    _: dict = Depends(get_admin_user),
) -> ImportacionConfirmarResponse:
    """Inserta las filas válidas confirmadas como nuevos empleados en Supabase."""
    created_by = request.state.user.get("id", "importacion_csv")
    importados = 0
    errores: list[ConfirmarError] = []

    for fila in body.filas:
        try:
            data = EmpleadoCreate(
                nombre=fila.nombre,
                apellido=fila.apellido,
                email_corporativo=fila.email_corporativo,
                area_id=fila.area_id,
                cargo=fila.cargo,
                modalidad_trabajo=fila.modalidad_trabajo,
                tipo_contrato=fila.tipo_contrato,
                fecha_ingreso=fila.fecha_ingreso,
                cuil=fila.cuil,
                legajo=fila.legajo,
                rol=fila.rol,
            )
            service.create_empleado(data, created_by)
            importados += 1
        except Exception as exc:
            errores.append(ConfirmarError(fila=fila.fila, error=str(exc)))

    logger.info(
        "Importación CSV confirmada",
        extra={"importados": importados, "errores": len(errores)},
    )
    return ImportacionConfirmarResponse(importados=importados, errores=errores)
