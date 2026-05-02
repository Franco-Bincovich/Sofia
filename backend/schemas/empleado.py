"""
Schemas Pydantic para el módulo de empleados.
EmpleadoBase → EmpleadoCreate → EmpleadoUpdate → EmpleadoResponse → EmpleadoListResponse
"""
from datetime import date, datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel


class EmpleadoBase(BaseModel):
    nombre: str
    apellido: str
    email_corporativo: str
    area_id: UUID
    cargo: str
    modalidad_trabajo: str  # presencial | remoto | hibrido
    tipo_contrato: str      # indefinido | plazo_fijo | honorarios
    fecha_ingreso: date


class EmpleadoCreate(EmpleadoBase):
    telefono: Optional[str] = None
    fecha_nacimiento: Optional[date] = None
    cuil: Optional[str] = None
    legajo: Optional[str] = None


class EmpleadoUpdate(BaseModel):
    nombre: Optional[str] = None
    apellido: Optional[str] = None
    email_corporativo: Optional[str] = None
    area_id: Optional[UUID] = None
    cargo: Optional[str] = None
    modalidad_trabajo: Optional[str] = None
    tipo_contrato: Optional[str] = None
    fecha_ingreso: Optional[date] = None
    telefono: Optional[str] = None
    fecha_nacimiento: Optional[date] = None
    cuil: Optional[str] = None
    legajo: Optional[str] = None
    estado: Optional[str] = None


class EmpleadoResponse(BaseModel):
    id: str
    nombre: str
    apellido: str
    email_corporativo: str
    area_id: str
    cargo: str
    modalidad_trabajo: str
    tipo_contrato: str
    fecha_ingreso: date
    telefono: Optional[str] = None
    fecha_nacimiento: Optional[date] = None
    cuil: Optional[str] = None
    legajo: Optional[str] = None
    estado: str
    created_at: datetime


class EmpleadoListResponse(BaseModel):
    items: List[EmpleadoResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
