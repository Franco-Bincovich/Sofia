"""
Schemas Pydantic para el módulo de importación masiva de empleados via CSV.
"""
from typing import List, Optional

from pydantic import BaseModel


class FilaPreview(BaseModel):
    fila: int
    nombre: str
    apellido: str
    email_corporativo: str
    cargo: str
    rol: Optional[str] = None
    area_id: str
    area_nombre: str
    tipo_contrato: str
    modalidad_trabajo: str
    fecha_ingreso: str
    cuil: Optional[str] = None
    legajo: Optional[str] = None


class FilaError(BaseModel):
    fila: int
    campo: str
    error: str


class ImportacionPreviewResponse(BaseModel):
    filas_validas: List[FilaPreview]
    errores: List[FilaError]


class ImportacionConfirmarRequest(BaseModel):
    filas: List[FilaPreview]


class ConfirmarError(BaseModel):
    fila: int
    error: str


class ImportacionConfirmarResponse(BaseModel):
    importados: int
    errores: List[ConfirmarError]
