"""
Schemas Pydantic para el módulo de Costos de Personal.
NominaCreate → NominaResponse · PresupuestoCreate → PresupuestoResponse · DashboardCostosResponse
"""
from typing import List, Optional

from pydantic import BaseModel, Field


class NominaCreate(BaseModel):
    empleado_id: str
    mes: int = Field(..., ge=1, le=12)
    anio: int = Field(..., ge=2000, le=2100)
    monto_bruto: float = Field(..., ge=0)
    monto_neto: float = Field(..., ge=0)


class NominaResponse(BaseModel):
    id: str
    empleado_id: str
    empleado_nombre: str
    area_nombre: str
    mes: int
    anio: int
    monto_bruto: float
    monto_neto: float
    total: float


class PresupuestoCreate(BaseModel):
    area_id: str
    mes: int = Field(..., ge=1, le=12)
    anio: int = Field(..., ge=2000, le=2100)
    presupuesto: float = Field(..., ge=0)


class PresupuestoResponse(BaseModel):
    id: str
    area_id: str
    area_nombre: str
    mes: int
    anio: int
    presupuesto: float


class CostoArea(BaseModel):
    area_nombre: str
    empleados: int
    costo_mensual: float
    presupuesto: float


class EvolucionMes(BaseModel):
    mes: int
    anio: int
    total: float


class DashboardCostosResponse(BaseModel):
    total_nomina: float
    costo_promedio: float
    variacion_porcentual: Optional[float]
    costos_por_area: List[CostoArea]
    evolucion_mensual: List[EvolucionMes]
