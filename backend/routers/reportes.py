"""
Router de Reportes — generación, consulta del historial y exportación.
Rutas protegidas por AuthMiddleware (requieren JWT válido).
"""
import re
from typing import List, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import Response

from middleware.auth_dependencies import get_admin_user
from schemas.reporte import HistorialItem, ReporteGenerarRequest, ReporteResponse
from services.reporte_export_service import ReporteExportService
from services.reporte_service import ReporteService
from utils.rate_limiter import limiter

router = APIRouter()

_SAFE_NAME_RE = re.compile(r"[^\w\s\-áéíóúüñÁÉÍÓÚÜÑ]")


def _service() -> ReporteService:
    return ReporteService()


def _export_service() -> ReporteExportService:
    return ReporteExportService()


@router.post("/generar", response_model=ReporteResponse, status_code=201)
@limiter.limit("10/minute")
async def generar_reporte(
    request: Request,
    body: ReporteGenerarRequest,
    service: ReporteService = Depends(_service),
    _: dict = Depends(get_admin_user),
) -> ReporteResponse:
    generado_por = getattr(request.state, "user", {}).get("email", "Sistema")
    return service.generar(
        tipo=body.tipo,
        mes=body.mes,
        anio=body.anio,
        prompt=body.prompt,
        generado_por=generado_por,
    )


@router.get("/historial", response_model=List[HistorialItem])
async def get_historial(
    service: ReporteService = Depends(_service),
) -> List[HistorialItem]:
    return service.get_historial()


@router.get("/{reporte_id}/exportar")
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
