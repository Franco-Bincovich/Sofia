"""Schemas para el Panel de Procesos (solo lectura)."""
from typing import List
from pydantic import BaseModel


class EstadoConteo(BaseModel):
    estado: str
    label: str
    total: int


class ProcesoResumen(BaseModel):
    proceso: str
    label: str
    tabla: str
    estados: List[EstadoConteo]
    total: int


class ProcesosResponse(BaseModel):
    procesos: List[ProcesoResumen]
