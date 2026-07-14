"""
Schemas Pydantic para el módulo de importación masiva de NÓMINA de sueldos (costos_nomina).
El import de empleados (roster) vive en schemas/importacion_nomina_empleados.py.
"""
from typing import List

from pydantic import BaseModel


# ─── Comunes ─────────────────────────────────────────────────────────────────

class FilaError(BaseModel):
    fila: int
    campo: str
    error: str


class ConfirmarError(BaseModel):
    fila: int
    error: str


# ─── Nómina (sueldos → costos_nomina) ────────────────────────────────────────

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
