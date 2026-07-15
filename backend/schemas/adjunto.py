"""
Schemas Pydantic del módulo de adjuntos genéricos (polimórficos).

Adjunto: modelo interno completo (incluye storage_path/bucket/estado) para uso backend.
AdjuntoResponse: vista pública — NO expone storage_path (la descarga va por /url firmada).
"""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class Adjunto(BaseModel):
    """Fila completa de public.adjuntos. Uso interno (repo/service)."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    entidad: str
    entidad_id: str
    empresa_id: Optional[str] = None
    bucket: str
    storage_path: str
    nombre_archivo: str
    mime_type: Optional[str] = None
    tamano_bytes: Optional[int] = None
    categoria: Optional[str] = None
    descripcion: Optional[str] = None
    estado: str
    es_principal: Optional[bool] = False
    subido_por: Optional[str] = None
    created_at: datetime


class AdjuntoResponse(BaseModel):
    """Vista expuesta al cliente. Omite storage_path/bucket/estado (internos)."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    entidad: str
    entidad_id: str
    nombre_archivo: str
    mime_type: Optional[str] = None
    tamano_bytes: Optional[int] = None
    categoria: Optional[str] = None
    descripcion: Optional[str] = None
    es_principal: Optional[bool] = False
    subido_por: Optional[str] = None
    created_at: datetime


class AdjuntoListResponse(BaseModel):
    items: List[AdjuntoResponse]
    total: int
