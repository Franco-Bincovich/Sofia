"""
Schemas Pydantic para el módulo de inventario.
Items: catálogo por empresa — empresa_id explícito en Create.
Asignaciones: empresa_id heredado del ítem al crear (no lo provee el usuario).
"""
from datetime import date, datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel


# ── Ítems de inventario ────────────────────────────────────────────────────────

class ItemCreate(BaseModel):
    empresa_id: UUID
    nombre: str
    tipo: str
    descripcion: Optional[str] = None
    numero_serie: Optional[str] = None
    fecha_alta: Optional[date] = None
    costo: Optional[float] = None
    notas: Optional[str] = None


class ItemUpdate(BaseModel):
    nombre: Optional[str] = None
    tipo: Optional[str] = None
    descripcion: Optional[str] = None
    numero_serie: Optional[str] = None
    costo: Optional[float] = None
    notas: Optional[str] = None
    estado: Optional[str] = None


class ItemResponse(BaseModel):
    id: str
    empresa_id: str
    empresa_nombre: Optional[str] = None
    nombre: str
    tipo: str
    descripcion: Optional[str] = None
    numero_serie: Optional[str] = None
    estado: str
    fecha_alta: date
    costo: Optional[float] = None
    notas: Optional[str] = None
    asignado_a: Optional[str] = None  # nombre del empleado que lo tiene actualmente
    created_at: datetime


class ItemListResponse(BaseModel):
    items: List[ItemResponse]
    total: int


# ── Asignaciones ───────────────────────────────────────────────────────────────

class AsignacionCreate(BaseModel):
    item_id: UUID
    empleado_id: UUID


class DevolucionRequest(BaseModel):
    estado_devolucion: str  # "ok" | "con_daño"
    notas: Optional[str] = None


class AsignacionResponse(BaseModel):
    id: str
    empresa_id: str
    empresa_nombre: Optional[str] = None
    item_id: str
    item_nombre: Optional[str] = None
    item_tipo: Optional[str] = None
    item_numero_serie: Optional[str] = None
    empleado_id: str
    empleado_nombre: Optional[str] = None
    fecha_asignacion: date
    fecha_devolucion: Optional[date] = None
    estado_devolucion: Optional[str] = None
    notas: Optional[str] = None
    created_at: datetime


class AsignacionListResponse(BaseModel):
    items: List[AsignacionResponse]
    total: int
