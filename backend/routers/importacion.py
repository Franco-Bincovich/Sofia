"""Router de importación masiva de empleados via CSV. Rutas protegidas por AuthMiddleware."""
from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile

from schemas.empleado import EmpleadoCreate, EmpleadoUpdate
from schemas.importacion import (
    ConfirmarError,
    ImportacionConfirmarRequest,
    ImportacionConfirmarResponse,
    ImportacionPreviewResponse,
)
from services.csv_service import parse_empleados_csv
from services.empleado_service import EmpleadoService
from utils.logger import logger

router = APIRouter()


def _service() -> EmpleadoService:
    return EmpleadoService()


@router.post("/empleados/preview", response_model=ImportacionPreviewResponse)
async def preview_csv(
    empresa_id: str = Form(...),
    file: UploadFile = File(...),
) -> ImportacionPreviewResponse:
    """Parsea y valida el CSV devolviendo vista previa sin guardar nada.
    Filtra áreas por la empresa elegida y marca DNIs ya existentes (es_actualizacion)."""
    content = await file.read()
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    validas, errores = parse_empleados_csv(text, empresa_id)
    return ImportacionPreviewResponse(filas_validas=validas, errores=errores)


@router.post("/empleados/confirmar", response_model=ImportacionConfirmarResponse)
async def confirmar_importacion(
    request: Request,
    body: ImportacionConfirmarRequest,
    service: EmpleadoService = Depends(_service),
) -> ImportacionConfirmarResponse:
    """UPSERT por (empresa_id, dni): INSERT para filas nuevas, UPDATE para DNIs existentes."""
    empresa_id = UUID(body.empresa_id)
    created_by = request.state.user.get("id", "importacion_csv")
    importados = 0
    actualizados = 0
    errores: list[ConfirmarError] = []

    for fila in body.filas:
        try:
            if fila.es_actualizacion:
                upd = EmpleadoUpdate(
                    nombre=fila.nombre, apellido=fila.apellido,
                    email_corporativo=fila.email_corporativo,
                    area_id=UUID(fila.area_id), cargo=fila.cargo,
                    modalidad_trabajo=fila.modalidad_trabajo,
                    tipo_contrato=fila.tipo_contrato,
                    fecha_ingreso=date.fromisoformat(fila.fecha_ingreso),
                    cuil=fila.cuil, legajo=fila.legajo, rol=fila.rol, dni=fila.dni,
                )
                result = service.update_empleado_por_dni(fila.dni, empresa_id, upd, created_by)
                if result:
                    actualizados += 1
                else:
                    errores.append(ConfirmarError(fila=fila.fila, error=f"DNI {fila.dni} ya no existe en la empresa"))
            else:
                data = EmpleadoCreate(
                    nombre=fila.nombre, apellido=fila.apellido,
                    email_corporativo=fila.email_corporativo,
                    area_id=UUID(fila.area_id), empresa_id=empresa_id, cargo=fila.cargo,
                    modalidad_trabajo=fila.modalidad_trabajo,
                    tipo_contrato=fila.tipo_contrato,
                    fecha_ingreso=date.fromisoformat(fila.fecha_ingreso),
                    cuil=fila.cuil, legajo=fila.legajo, rol=fila.rol, dni=fila.dni,
                )
                service.create_empleado(data, created_by, empresa_id)
                importados += 1
        except Exception as exc:
            errores.append(ConfirmarError(fila=fila.fila, error=str(exc)))

    logger.info("Importación CSV confirmada", extra={"importados": importados, "actualizados": actualizados, "errores": len(errores)})
    return ImportacionConfirmarResponse(importados=importados, actualizados=actualizados, errores=errores)
