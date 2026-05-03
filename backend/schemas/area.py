"""
Schemas Pydantic para el módulo de áreas.
AreaCreate → AreaUpdate → AreaResponse
"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class AreaCreate(BaseModel):
    nombre: str = Field(..., max_length=100)
    descripcion: Optional[str] = None
    responsable_id: Optional[str] = None


class AreaUpdate(BaseModel):
    nombre: Optional[str] = Field(None, max_length=100)
    descripcion: Optional[str] = None
    responsable_id: Optional[str] = None


class AreaResponse(BaseModel):
    id: str
    nombre: str
    descripcion: Optional[str] = None
    responsable_id: Optional[str] = None
    responsable_nombre: Optional[str] = None
    cantidad_empleados: int
    created_at: datetime
