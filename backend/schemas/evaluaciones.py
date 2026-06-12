"""
Schemas Pydantic para el módulo de evaluaciones de desempeño.
Plantilla (root, empresa_id explícito) → Criterio → Ciclo → Instancia → Resultado.
Las entidades hijas NO piden empresa_id: lo heredan del padre en el service.
"""
from datetime import date, datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel


# ── Criterios ──────────────────────────────────────────────────────────────────

class CriterioCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    peso: float = 1.0
    orden: int = 1


class CriterioUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    peso: Optional[float] = None
    orden: Optional[int] = None


class CriterioResponse(BaseModel):
    id: UUID
    plantilla_id: UUID
    empresa_id: UUID
    nombre: str
    descripcion: Optional[str] = None
    peso: float
    orden: int


# ── Plantillas ────────────────────────────────────────────────────────────────

class PlantillaCreate(BaseModel):
    empresa_id: UUID
    nombre: str
    descripcion: Optional[str] = None
    tipo_escala: str
    escala_min: Optional[int] = None
    escala_max: Optional[int] = None
    opciones_cualitativas: Optional[List[str]] = None
    area_id: Optional[UUID] = None


class PlantillaUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    tipo_escala: Optional[str] = None
    escala_min: Optional[int] = None
    escala_max: Optional[int] = None
    opciones_cualitativas: Optional[List[str]] = None
    activa: Optional[bool] = None
    area_id: Optional[UUID] = None


class PlantillaResponse(BaseModel):
    id: UUID
    empresa_id: UUID
    empresa_nombre: Optional[str] = None
    nombre: str
    descripcion: Optional[str] = None
    tipo_escala: str
    escala_min: Optional[int] = None
    escala_max: Optional[int] = None
    opciones_cualitativas: Optional[List[str]] = None
    activa: bool
    area_id: Optional[UUID] = None
    area_nombre: Optional[str] = None
    criterios: List[CriterioResponse] = []
    created_at: Optional[datetime] = None


class PlantillaListResponse(BaseModel):
    items: List[PlantillaResponse]
    total: int


# ── Ciclos ────────────────────────────────────────────────────────────────────

class CicloCreate(BaseModel):
    plantilla_id: UUID
    nombre: str
    fecha_inicio: date
    fecha_fin: date


class CicloUpdate(BaseModel):
    nombre: Optional[str] = None
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None


class CicloResponse(BaseModel):
    id: UUID
    empresa_id: UUID
    empresa_nombre: Optional[str] = None
    plantilla_id: UUID
    plantilla_nombre: Optional[str] = None
    plantilla_tipo_escala: Optional[str] = None
    nombre: str
    fecha_inicio: date
    fecha_fin: date
    estado: str
    total_instancias: int = 0


class CicloListResponse(BaseModel):
    items: List[CicloResponse]
    total: int


# ── Instancias ────────────────────────────────────────────────────────────────

class InstanciaCreate(BaseModel):
    ciclo_id: UUID
    empleado_id: UUID
    evaluador_id: Optional[UUID] = None


class InstanciaUpdate(BaseModel):
    comentario_general: Optional[str] = None
    evaluador_id: Optional[UUID] = None


class ResultadoUpdate(BaseModel):
    puntaje: Optional[float] = None
    valor: Optional[str] = None
    comentario: Optional[str] = None


class ResultadoResponse(BaseModel):
    id: UUID
    criterio_id: UUID
    criterio_nombre: str
    criterio_peso: float
    criterio_orden: int
    puntaje: Optional[float] = None
    valor: Optional[str] = None
    comentario: Optional[str] = None


class InstanciaResponse(BaseModel):
    id: UUID
    empresa_id: UUID
    empresa_nombre: Optional[str] = None
    ciclo_id: UUID
    ciclo_nombre: Optional[str] = None
    empleado_id: UUID
    empleado_nombre: Optional[str] = None
    empleado_area: Optional[str] = None
    evaluador_id: Optional[UUID] = None
    evaluador_nombre: Optional[str] = None
    estado: str
    puntaje_global: Optional[float] = None
    fecha_evaluacion: Optional[date] = None


class InstanciaDetalleResponse(InstanciaResponse):
    comentario_general: Optional[str] = None
    resultados: List[ResultadoResponse] = []
    plantilla_tipo_escala: Optional[str] = None
    plantilla_opciones_cualitativas: Optional[List[str]] = None
    plantilla_escala_min: Optional[int] = None
    plantilla_escala_max: Optional[int] = None


class InstanciaListResponse(BaseModel):
    items: List[InstanciaResponse]
    total: int
