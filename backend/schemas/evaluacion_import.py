"""
DTOs del PARSEO de los dos CSV de evaluaciones (fase 2). Estructuras en memoria, no de DB:
el matcheo a empleado_id y la persistencia (evaluacion_lotes/_evaluados/_resultados) son
fase 3. Un EvaluadoParseado se mapea 1:1 a EvaluadoCreate una vez resuelto el empleado.
"""
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel


class ResultadoParseado(BaseModel):
    tipo_evaluador: str      # ya normalizado a los valores del CHECK de la 078
    competencia: str
    orden: int               # posición de la columna en el archivo (1..15)
    nota: float


class EvaluadoParseado(BaseModel):
    apellido_evaluado: str
    nombre_evaluado: str
    apellido_superior: Optional[str] = None
    nombre_superior: Optional[str] = None
    organismo: Optional[str] = None
    gerencia: Optional[str] = None
    sector: Optional[str] = None          # dato crudo: puede traer basura conocida (ej. gerencia)
    perfil: str                            # 'lider' | 'general', derivado de los tipos vistos
    nota_final: Optional[float] = None     # None = sin fila en notas finales (no es error)
    resultados: List[ResultadoParseado] = []


class FilaProblema(BaseModel):
    archivo: str    # 'notas_finales' | 'desglose'
    fila: int       # nº de fila del archivo (0 = cabecera / archivo entero)
    motivo: str


class ResultadoParseo(BaseModel):
    evaluados: List[EvaluadoParseado]
    problemas: List[FilaProblema]
    anomalias: List[str]   # cruce: identidad en notas finales que no aparece en el desglose


# ── Matcheo identidad → empleado (fase 3) ────────────────────────────────────

class EmpleadoCandidato(BaseModel):
    empleado_id: UUID
    apellido: str
    nombre: str
    gerencia: Optional[str] = None
    manager_id: Optional[UUID] = None
    manager_apellido: Optional[str] = None   # lo completa el resolutor desde el mismo lote
    manager_nombre: Optional[str] = None
    superior_coincide: Optional[bool] = None  # True/False/None(no evaluable) — lo completa el resolutor


class ResolucionIdentidad(BaseModel):
    apellido_csv: str
    nombre_csv: str
    estado: str                              # 'resuelto' | 'ambiguo' | 'sin_candidato'
    empleado_id: Optional[UUID] = None       # solo en 'resuelto'
    fuente: Optional[str] = None             # 'equivalencia' | 'nombre+superior' (en 'resuelto')
    candidatos: List[EmpleadoCandidato] = []  # para revisión humana en 'ambiguo'
    motivo: Optional[str] = None
