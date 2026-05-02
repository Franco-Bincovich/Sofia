"""
Schemas de respuesta para el módulo de Organigrama.
"""
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel


class EmpleadoNodoResponse(BaseModel):
    id: UUID
    nombre: str
    apellido: str
    cargo: Optional[str] = None
    avatar_url: Optional[str] = None


class AreaNodoResponse(BaseModel):
    id: UUID
    nombre: str
    responsable: Optional[EmpleadoNodoResponse] = None
    empleados: List[EmpleadoNodoResponse] = []
    total_empleados: int
