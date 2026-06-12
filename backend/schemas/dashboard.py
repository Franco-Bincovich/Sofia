"""
Schemas de respuesta para el módulo de Dashboard Ejecutivo.
"""
from typing import List, Literal

from pydantic import BaseModel


class KPIResponse(BaseModel):
    empleados_activos: int
    ingresos_mes: int
    bajas_mes: int
    costo_nomina: float
    onboardings_activos: int
    vacantes_activas: int


class AlertaResponse(BaseModel):
    tipo: str
    mensaje: str
    nivel: Literal["info", "warning", "error"]


class HeadcountAreaResponse(BaseModel):
    area_id: str
    area: str
    total: int


class DashboardResponse(BaseModel):
    kpis: KPIResponse
    headcount_por_area: List[HeadcountAreaResponse]
    alertas: List[AlertaResponse]
