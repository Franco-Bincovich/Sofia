"""
Schemas Pydantic del módulo de cesiones (entidad hija de empleado).
CesionCreate (entrada del alta) → CesionUpdate (parcial) → CesionResponse → CesionListResponse.
"""
from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel


class CesionCreate(BaseModel):
    fecha: date
    empresa_cesion: str


class CesionUpdate(BaseModel):
    fecha: Optional[date] = None
    empresa_cesion: Optional[str] = None


class CesionResponse(BaseModel):
    id: str
    empleado_id: str
    empresa_id: str
    fecha: date
    empresa_cesion: str
    created_at: datetime
    updated_at: Optional[datetime] = None


class CesionListResponse(BaseModel):
    items: List[CesionResponse]
    total: int
