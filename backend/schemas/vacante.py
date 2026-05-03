"""
Schemas Pydantic para el módulo de vacantes y candidatos.
VacanteCreate → VacanteUpdate → VacanteResponse
CandidatoCreate → CandidatoResponse
"""
from datetime import date, datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel


class VacanteCreate(BaseModel):
    titulo: str
    area_id: UUID
    descripcion: Optional[str] = None
    requisitos: List[str] = []
    tipo_contrato: str  # efectivo | plazo_fijo | contratado | pasantia


class VacanteUpdate(BaseModel):
    titulo: Optional[str] = None
    area_id: Optional[UUID] = None
    descripcion: Optional[str] = None
    requisitos: Optional[List[str]] = None
    tipo_contrato: Optional[str] = None
    estado: Optional[str] = None


class VacanteResponse(BaseModel):
    id: str
    titulo: str
    area_id: str
    area_nombre: Optional[str] = None
    descripcion: Optional[str] = None
    requisitos: List[str] = []
    tipo_contrato: Optional[str] = None
    estado: str
    fecha_apertura: Optional[date] = None
    created_at: datetime
    linkedin_post_id: Optional[str] = None
    linkedin_url: Optional[str] = None
    email_contacto: Optional[str] = None


class CandidatoCreate(BaseModel):
    nombre: str
    apellido: str
    email: str
    cargo_anterior: Optional[str] = None
    empresa_anterior: Optional[str] = None
    cv_url: Optional[str] = None


class CandidatoResponse(BaseModel):
    id: str
    vacante_id: str
    nombre: str
    apellido: str
    email: str
    cargo_anterior: Optional[str] = None
    empresa_anterior: Optional[str] = None
    etapa_pipeline: str
    score_ia: Optional[float] = None
    created_at: datetime


class EtapaUpdate(BaseModel):
    etapa: str


class PublicarLinkedinRequest(BaseModel):
    email_contacto: str


class PublicarLinkedinResponse(BaseModel):
    post_id: str
    url: str
    publicado_en: datetime


class EmailCandidatoResponse(BaseModel):
    email_id: str
    remitente: str
    asunto: str
    fecha: str
    cuerpo_preview: str


class CandidatoDesdeEmailRequest(BaseModel):
    email_id: str
