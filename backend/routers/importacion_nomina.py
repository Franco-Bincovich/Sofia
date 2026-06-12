"""Router de importación masiva de nómina via CSV. Rutas protegidas por AuthMiddleware."""
from fastapi import APIRouter, Depends, File, Form, UploadFile

from repositories.nomina_repo import NominaRepo
from schemas.costo import NominaCreate
from schemas.importacion import (
    ConfirmarError,
    ImportacionNominaConfirmarRequest,
    ImportacionNominaConfirmarResponse,
    ImportacionNominaPreviewResponse,
)
from services.nomina_csv_service import parse_nomina_csv
from utils.logger import logger

router = APIRouter()


def _repo() -> NominaRepo:
    return NominaRepo()


@router.post("/nomina/preview", response_model=ImportacionNominaPreviewResponse)
async def preview_nomina(
    empresa_id: str = Form(...),
    file: UploadFile = File(...),
) -> ImportacionNominaPreviewResponse:
    """Parsea el CSV de nómina: resuelve DNI→empleado y marca duplicados (anio, mes)."""
    content = await file.read()
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = content.decode("latin-1")
    validas, errores = parse_nomina_csv(text, empresa_id)
    return ImportacionNominaPreviewResponse(filas_validas=validas, errores=errores)


@router.post("/nomina/confirmar", response_model=ImportacionNominaConfirmarResponse)
async def confirmar_nomina(
    body: ImportacionNominaConfirmarRequest,
    repo: NominaRepo = Depends(_repo),
) -> ImportacionNominaConfirmarResponse:
    """UPSERT por (empleado_id, anio, mes) vía save_nomina. empresa_id se hereda del empleado."""
    importados = 0
    actualizados = 0
    errores: list[ConfirmarError] = []

    for fila in body.filas:
        try:
            data = NominaCreate(
                empleado_id=fila.empleado_id, mes=fila.mes, anio=fila.anio,
                monto_bruto=fila.salario_bruto, monto_neto=fila.neto,
            )
            repo.save_nomina(data)
            if fila.es_actualizacion:
                actualizados += 1
            else:
                importados += 1
        except Exception as exc:
            errores.append(ConfirmarError(fila=fila.fila, error=str(exc)))

    logger.info("Importación nómina confirmada", extra={"importados": importados, "actualizados": actualizados, "errores": len(errores)})
    return ImportacionNominaConfirmarResponse(importados=importados, actualizados=actualizados, errores=errores)
