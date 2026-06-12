"""
Schemas Pydantic para el módulo de empleados.
EmpleadoBase → EmpleadoCreate → EmpleadoUpdate → EmpleadoResponse → EmpleadoListResponse
"""
from datetime import date, datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, field_validator


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
    empresa_id: UUID  # la empresa de pertenencia viaja en el body, no en el header
    telefono: Optional[str] = None
    fecha_nacimiento: Optional[date] = None
    dni: Optional[str] = None
    cuil: Optional[str] = None
    legajo: Optional[str] = None
    rol: Optional[str] = None
    dias_vacaciones_asignados: Optional[int] = None  # default 14 en DB si no se provee


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
    dni: Optional[str] = None
    cuil: Optional[str] = None
    legajo: Optional[str] = None
    estado: Optional[str] = None
    rol: Optional[str] = None
    dias_vacaciones_asignados: Optional[int] = None

    @field_validator("fecha_ingreso", "fecha_nacimiento", mode="before")
    @classmethod
    def empty_str_to_none(cls, v: object) -> object:
        return None if v == "" else v

    @field_validator("dias_vacaciones_asignados", mode="before")
    @classmethod
    def coerce_dias(cls, v: object) -> object:
        """Convierte string numérico a int (el modal del frontend envía strings)."""
        if isinstance(v, str):
            return int(v) if v.strip() else None
        return v


class EmpleadoResponse(BaseModel):
    id: str
    nombre: str
    apellido: str
    email_corporativo: str
    empresa_id: Optional[str] = None
    empresa_nombre: Optional[str] = None
    area_id: str
    area_nombre: Optional[str] = None
    cargo: str
    modalidad_trabajo: str
    tipo_contrato: str
    fecha_ingreso: date
    telefono: Optional[str] = None
    fecha_nacimiento: Optional[date] = None
    cuil: Optional[str] = None
    legajo: Optional[str] = None
    rol: Optional[str] = None
    estado: str
    dias_vacaciones_asignados: int = 14
    created_at: datetime


class EmpleadoListResponse(BaseModel):
    items: List[EmpleadoResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
