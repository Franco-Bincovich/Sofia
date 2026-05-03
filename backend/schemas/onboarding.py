"""
Schemas Pydantic para onboarding — templates, tareas e instancias.
"""
from typing import List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel


class TareaCreate(BaseModel):
    titulo: str
    descripcion: Optional[str] = None
    semana: Literal[1, 2, 3, 4]
    orden: int
    responsable_tipo: Literal["rrhh", "manager", "empleado", "ti", "administracion"] = "rrhh"
    dias_limite: int = 1


class TareaUpdate(BaseModel):
    titulo: Optional[str] = None
    descripcion: Optional[str] = None
    semana: Optional[Literal[1, 2, 3, 4]] = None
    orden: Optional[int] = None


class TareaResponse(BaseModel):
    id: UUID
    template_id: UUID
    titulo: str
    descripcion: Optional[str] = None
    semana: int
    orden: int


class TemplateCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = None


class TemplateUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None


class TemplateResponse(BaseModel):
    id: UUID
    nombre: str
    descripcion: Optional[str] = None
    tareas: List[TareaResponse] = []
    tareas_total: int = 0


class IniciarOnboardingRequest(BaseModel):
    template_id: Optional[UUID] = None


class TareaProgresoResponse(BaseModel):
    progreso_id: UUID
    tarea_id: UUID
    titulo: str
    descripcion: Optional[str] = None
    semana: int
    orden: int
    completada: bool


class InstanciaResponse(BaseModel):
    id: UUID
    empleado_id: UUID
    empleado_nombre: str
    empleado_cargo: Optional[str] = None
    empleado_area: Optional[str] = None
    template_id: UUID
    estado: str
    fecha_inicio: str
    progreso: int
    tareas_completadas: int
    tareas_total: int


class InstanciaDetalleResponse(InstanciaResponse):
    tareas: List[TareaProgresoResponse] = []
