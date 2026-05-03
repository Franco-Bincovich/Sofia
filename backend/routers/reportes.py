"""
Router de Reportes — generación y consulta del historial.
Rutas protegidas por AuthMiddleware (requieren JWT válido).
"""
from typing import List

from fastapi import APIRouter, Depends, Request

from schemas.reporte import HistorialItem, ReporteGenerarRequest, ReporteResponse
from services.reporte_service import ReporteService

router = APIRouter()


def _service() -> ReporteService:
    return ReporteService()


@router.post("/generar", response_model=ReporteResponse, status_code=201)
async def generar_reporte(
    request: Request,
    body: ReporteGenerarRequest,
    service: ReporteService = Depends(_service),
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
