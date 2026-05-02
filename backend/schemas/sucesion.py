"""
Schemas Pydantic para sucesión y planes de carrera.
Cubre: mapa de talento 9-Box, planes de carrera e hitos de desarrollo.
"""
from datetime import date
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class EmpleadoMapaResponse(BaseModel):
    id: UUID
    nombre: str
    apellido: str
    cargo: Optional[str] = None
    area_nombre: Optional[str] = None
    potencial: Literal["alto", "medio", "bajo"]
    desempeno: Literal["alto", "medio", "bajo"]


class PlanCarreraCreate(BaseModel):
    empleado_id: UUID
    cargo_objetivo: str
    fecha_objetivo: Optional[date] = None
    readiness: int = Field(default=0, ge=0, le=100)


class PlanCarreraResponse(BaseModel):
    id: UUID
    empleado_id: UUID
    empleado_nombre: str
    cargo_actual: Optional[str] = None
    cargo_objetivo: str
    fecha_objetivo: Optional[str] = None
    readiness: int
    hitos_completados: int
    hitos_total: int


class HitoCreate(BaseModel):
    plan_id: UUID
    titulo: str
    descripcion: Optional[str] = None
    fecha_objetivo: Optional[date] = None


class HitoResponse(BaseModel):
    id: UUID
    plan_id: UUID
    titulo: str
    descripcion: Optional[str] = None
    completado: bool
    fecha_objetivo: Optional[str] = None
