"""
Schemas Pydantic para Assessment Engine.
Cubre: campañas, links de evaluación, resultados y envío de respuestas.
"""
from datetime import datetime
from typing import Any, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field

TipoEval = Literal["completo", "conductual", "cognitivo"]


class CampanaCreate(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=150)
    tipo: TipoEval
    empresa_id: UUID  # root entity — empresa explícita obligatoria
    area_id: Optional[str] = None
    posicion_objetivo: Optional[str] = Field(default=None, max_length=200)


class CampanaResponse(BaseModel):
    id: UUID
    nombre: str
    tipo: str
    estado: str
    links_enviados: int
    completados: int
    created_at: datetime
    empresa_id: Optional[UUID] = None
    empresa_nombre: Optional[str] = None
    area_id: Optional[UUID] = None
    area_nombre: Optional[str] = None
    posicion_objetivo: Optional[str] = None


class LinkCreate(BaseModel):
    campana_id: UUID
    evaluado_nombre: str = Field(..., min_length=1, max_length=200)
    evaluado_email: str = Field(..., min_length=1, max_length=255)
    empleado_id: Optional[str] = None


class LinkResponse(BaseModel):
    id: UUID
    campana_id: UUID
    token: str
    evaluado_nombre: str
    evaluado_email: str
    completado: bool
    created_at: datetime


class ResultadoResponse(BaseModel):
    id: UUID
    link_id: UUID
    empresa_id: Optional[UUID] = None
    empresa_nombre: Optional[str] = None
    evaluado_nombre: str
    tipo: str
    fecha_completado: Optional[str] = None
    perfil_dominante: Optional[str] = None
    score_general: Optional[int] = None
    scores: Optional[dict[str, Any]] = None
    area_nombre: Optional[str] = None
    posicion_objetivo: Optional[str] = None


class RespuestaCreate(BaseModel):
    respuestas: list[dict[str, Any]]
