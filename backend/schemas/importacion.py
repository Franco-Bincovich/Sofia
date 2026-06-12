"""
Schemas Pydantic para el módulo de importación masiva via CSV.
Cubre empleados (FilaPreview) y nómina (FilaNominaPreview).
"""
from typing import List, Optional

from pydantic import BaseModel


# ─── Empleados ───────────────────────────────────────────────────────────────

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
    dni: str
    cuil: Optional[str] = None
    legajo: Optional[str] = None
    es_actualizacion: bool = False


class FilaError(BaseModel):
    fila: int
    campo: str
    error: str


class ImportacionPreviewResponse(BaseModel):
    filas_validas: List[FilaPreview]
    errores: List[FilaError]


class ImportacionConfirmarRequest(BaseModel):
    empresa_id: str  # empresa elegida en el modal; determina UPSERT y filtrado de áreas
    filas: List[FilaPreview]


class ConfirmarError(BaseModel):
    fila: int
    error: str


class ImportacionConfirmarResponse(BaseModel):
    importados: int
    actualizados: int
    errores: List[ConfirmarError]


# ─── Nómina ───────────────────────────────────────────────────────────────────

class FilaNominaPreview(BaseModel):
    fila: int
    dni: str
    nombre_empleado: str   # resuelto via DNI→empleado en el preview
    empleado_id: str       # UUID del empleado, necesario para el confirmar
    anio: int
    mes: int
    salario_bruto: float
    neto: float
    es_actualizacion: bool = False  # True si ya existe nómina para (empleado_id, anio, mes)


class ImportacionNominaPreviewResponse(BaseModel):
    filas_validas: List[FilaNominaPreview]
    errores: List[FilaError]


class ImportacionNominaConfirmarRequest(BaseModel):
    empresa_id: str  # solo para trazabilidad; empresa_id real se hereda del empleado en el repo
    filas: List[FilaNominaPreview]


class ImportacionNominaConfirmarResponse(BaseModel):
    importados: int
    actualizados: int
    errores: List[ConfirmarError]
