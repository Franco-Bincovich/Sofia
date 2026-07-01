"""
Schemas Pydantic del módulo de períodos cerrados (bloqueo por período).

PeriodoCreate: alta de un cierre (empresa + módulo opcional + rango de fechas).
PeriodoResponse: fila completa, incluye la traza de cierre/reapertura.
"""
from datetime import date, datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class PeriodoCreate(BaseModel):
    empresa_id: UUID
    modulo: Optional[str] = None
    desde: date
    hasta: date


class PeriodoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    empresa_id: str
    modulo: Optional[str] = None
    desde: date
    hasta: date
    estado: str
    cerrado_por: Optional[str] = None
    cerrado_at: datetime
    reabierto_por: Optional[str] = None
    reabierto_at: Optional[datetime] = None


class PeriodoListResponse(BaseModel):
    items: List[PeriodoResponse]
    total: int
