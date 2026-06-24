"""
Router de Reportes — generación, consulta del historial y exportación.
Rutas protegidas por AuthMiddleware (requieren JWT válido).
empresa_id: header X-Empresa-Id.
  - generar: si hay empresa activa, el reporte queda atado a ella; si es "Todas" → consolidado (null).
  - historial: empresa activa muestra sus reportes + consolidados; "Todas" muestra todo.
"""
import re
from typing import List, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import Response

from schemas.reporte import HistorialItem, ReporteGenerarRequest, ReporteResponse
from services.reporte_export_service import ReporteExportService
from services.reporte_service import ReporteService
from utils.empresa import get_empresa_id
from utils.permisos import Accion, Seccion, require_permission

router = APIRouter()
SECCION = Seccion.REPORTES

_SAFE_NAME_RE = re.compile(r"[^\w\s\-áéíóúüñÁÉÍÓÚÜÑ]")


def _service() -> ReporteService:
    return ReporteService()


def _export_service() -> ReporteExportService:
    return ReporteExportService()


@router.post("/generar", response_model=ReporteResponse, status_code=201, dependencies=[Depends(require_permission(SECCION, Accion.WRITE))])
async def generar_reporte(
    request: Request,
    body: ReporteGenerarRequest,
    service: ReporteService = Depends(_service),
) -> ReporteResponse:
    generado_por = getattr(request.state, "user", {}).get("email", "Sistema")
    empresa_id = get_empresa_id(request)
    return service.generar(
        tipo=body.tipo,
        mes=body.mes,
        anio=body.anio,
        prompt=body.prompt,
        generado_por=generado_por,
        empresa_id=empresa_id,
    )


@router.get("/historial", response_model=List[HistorialItem], dependencies=[Depends(require_permission(SECCION, Accion.READ))])
async def get_historial(
    request: Request,
    service: ReporteService = Depends(_service),
) -> List[HistorialItem]:
    empresa_id = get_empresa_id(request)
    return service.get_historial(empresa_id)


@router.get("/{reporte_id}/exportar", dependencies=[Depends(require_permission(SECCION, Accion.READ))])
async def exportar_reporte(
    reporte_id: UUID,
    formato: Literal["pdf", "excel"] = Query(...),
    svc: ReporteExportService = Depends(_export_service),
) -> Response:
    if formato == "pdf":
        data = svc.export_pdf(reporte_id)
        media_type = "application/pdf"
        ext = "pdf"
    else:
        data = svc.export_excel(reporte_id)
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ext = "xlsx"

    safe = _SAFE_NAME_RE.sub("", str(reporte_id))[:40]
    filename = f"reporte_{safe}.{ext}"
    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
    return Response(content=data, media_type=media_type, headers=headers)
