"""
Schemas Pydantic para el módulo de objetivos.
ObjetivoCreate → Update → Response → ListResponse

responsable_id: FK a users (operadores RRHH), NO empleados.
empresa_id: explícito en Create; heredado por el objeto en lecturas.
estado: no se pide al crear (default 'por_hacer'); se cambia por CambiarEstadoRequest.
"""
from datetime import date, datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel

PRIORIDADES = {"baja", "media", "alta"}
ESTADOS = {"por_hacer", "haciendo", "terminado"}
ORDEN_ESTADOS = ["por_hacer", "haciendo", "terminado"]


class ObjetivoCreate(BaseModel):
    empresa_id:     UUID
    responsable_id: UUID
    titulo:         str
    descripcion:    Optional[str] = None
    prioridad:      str = "media"
    fecha_entrega:  Optional[date] = None


class ObjetivoUpdate(BaseModel):
    responsable_id: Optional[UUID] = None
    titulo:         Optional[str] = None
    descripcion:    Optional[str] = None
    prioridad:      Optional[str] = None
    fecha_entrega:  Optional[date] = None


class CambiarEstadoRequest(BaseModel):
    estado: str


class ObjetivoResponse(BaseModel):
    id:                  str
    empresa_id:          str
    empresa_nombre:      Optional[str] = None
    responsable_id:      str
    responsable_nombre:  Optional[str] = None
    titulo:              str
    descripcion:         Optional[str] = None
    prioridad:           str
    estado:              str
    fecha_entrega:       Optional[date] = None
    created_at:          datetime
    updated_at:          datetime


class ObjetivoListResponse(BaseModel):
    items: List[ObjetivoResponse]
    total: int
