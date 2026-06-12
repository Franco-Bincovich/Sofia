"""Router de importación masiva de nómina via CSV. Rutas protegidas por AuthMiddleware."""
from fastapi import APIRouter, Depends, File, Form, UploadFile

from repositories.nomina_import_repo import NominaImportRepo
from schemas.importacion import (
    ImportacionNominaConfirmarRequest,
    ImportacionNominaConfirmarResponse,
    ImportacionNominaPreviewResponse,
)
from services.nomina_csv_service import parse_nomina_csv
from utils.logger import logger

router = APIRouter()


def _repo() -> NominaImportRepo:
    return NominaImportRepo()


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
    repo: NominaImportRepo = Depends(_repo),
) -> ImportacionNominaConfirmarResponse:
    """UPSERT en batch por (empleado_id, anio, mes). empresa_id se toma del request (uniforme)."""
    filas = [
        {
            "empleado_id": f.empleado_id, "anio": f.anio, "mes": f.mes,
            "salario_bruto": f.salario_bruto,
            "cargas_sociales": max(0.0, f.salario_bruto - f.neto),
            "empresa_id": body.empresa_id,
        }
        for f in body.filas
    ]
    repo.batch_upsert_nomina(filas)

    importados = sum(1 for f in body.filas if not f.es_actualizacion)
    actualizados = sum(1 for f in body.filas if f.es_actualizacion)
    logger.info(
        "Importación nómina confirmada",
        extra={"importados": importados, "actualizados": actualizados, "errores": 0},
    )
    return ImportacionNominaConfirmarResponse(importados=importados, actualizados=actualizados, errores=[])
