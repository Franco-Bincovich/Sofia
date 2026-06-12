"""
Schemas Pydantic para el módulo de proyectos.
Proyectos: empresa_id explícito en Create (empresa dueña).
Asignaciones: empleado_empresa_id NO en Create — el service lo deriva de empleados.empresa_id.
Horas: valor_hora_snapshot NO en Create — el service lo copia de la asignación al insertar.
"""
from datetime import date, datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ── Costeo ─────────────────────────────────────────────────────────────────────

class CosteoResumen(BaseModel):
    costo_acumulado: float
    presupuesto_restante: float
    pct_consumido: Optional[float] = None   # None si presupuesto == 0


# ── Proyectos ──────────────────────────────────────────────────────────────────

class ProyectoCreate(BaseModel):
    empresa_id: UUID
    nombre: str
    descripcion: Optional[str] = None
    estado: str = "activo"
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None
    presupuesto: float = Field(default=0.0, ge=0)


class ProyectoUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    estado: Optional[str] = None
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None
    presupuesto: Optional[float] = Field(default=None, ge=0)


class ProyectoResponse(BaseModel):
    id: UUID
    empresa_id: UUID
    empresa_nombre: Optional[str] = None
    nombre: str
    descripcion: Optional[str] = None
    estado: str
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None
    presupuesto: float
    costeo: CosteoResumen
    created_at: datetime
    updated_at: Optional[datetime] = None


class ProyectoListResponse(BaseModel):
    items: List[ProyectoResponse]
    total: int


# ── Asignaciones ───────────────────────────────────────────────────────────────

class AsignacionCreate(BaseModel):
    empleado_id: UUID
    rol: str
    valor_hora: float = Field(default=0.0, ge=0)
    fecha_desde: Optional[date] = None
    fecha_hasta: Optional[date] = None


class AsignacionUpdate(BaseModel):
    rol: Optional[str] = None
    valor_hora: Optional[float] = Field(default=None, ge=0)
    fecha_desde: Optional[date] = None
    fecha_hasta: Optional[date] = None
    activo: Optional[bool] = None


class AsignacionResponse(BaseModel):
    id: UUID
    proyecto_id: UUID
    empleado_id: UUID
    empleado_nombre: Optional[str] = None
    empleado_empresa_id: UUID
    empleado_empresa_nombre: Optional[str] = None
    rol: str
    valor_hora: float
    fecha_desde: Optional[date] = None
    fecha_hasta: Optional[date] = None
    activo: bool
    created_at: datetime


class AsignacionListResponse(BaseModel):
    items: List[AsignacionResponse]
    total: int


# ── Horas ──────────────────────────────────────────────────────────────────────

class HoraCreate(BaseModel):
    asignacion_id: UUID
    fecha: date
    horas: float = Field(..., gt=0)
    descripcion: Optional[str] = None


class HoraResponse(BaseModel):
    id: UUID
    asignacion_id: UUID
    proyecto_id: UUID
    empleado_nombre: Optional[str] = None
    empleado_empresa_nombre: Optional[str] = None
    fecha: date
    horas: float
    valor_hora_snapshot: float
    costo: float           # horas × valor_hora_snapshot, calculado en _build()
    descripcion: Optional[str] = None
    created_at: datetime


class HoraListResponse(BaseModel):
    items: List[HoraResponse]
    total: int
