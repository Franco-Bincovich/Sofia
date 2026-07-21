"""
Schemas de los endpoints de import de evaluaciones (fase 4): preview y confirmar.
Reusan los DTOs del parser/resolutor (evaluacion_import) para no duplicar forma.
El payload de confirmar es AUTOCONTENIDO: confirmar no re-parsea ni re-resuelve, persiste
exactamente lo que el humano aprobó.
"""
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel

from schemas.evaluacion_import import EmpleadoCandidato, FilaProblema, ResultadoParseado


# ── Preview ───────────────────────────────────────────────────────────────────

class EvaluadoPreview(BaseModel):
    apellido_evaluado: str
    nombre_evaluado: str
    apellido_superior: Optional[str] = None
    nombre_superior: Optional[str] = None
    organismo: Optional[str] = None
    gerencia: Optional[str] = None
    sector: Optional[str] = None
    perfil: str
    nota_final: Optional[float] = None
    estado: str                                # resuelto | ambiguo | sin_candidato
    empleado_id: Optional[UUID] = None         # propuesto (solo en resuelto)
    fuente: Optional[str] = None
    motivo: Optional[str] = None
    candidatos: List[EmpleadoCandidato] = []   # para elegir cuando es ambiguo
    resultados: List[ResultadoParseado] = []   # se devuelven para rearmar el confirmar


class PreviewResumen(BaseModel):
    evaluados: int
    resueltos: int
    ambiguos: int
    sin_candidato: int
    resultados: int


class PreviewResponse(BaseModel):
    resumen: PreviewResumen
    evaluados: List[EvaluadoPreview]
    problemas: List[FilaProblema]
    anomalias: List[str]
    periodo_existe: bool
    registros_a_pisar: int    # evaluados del lote previo que se borrarán al confirmar


# ── Confirmar ─────────────────────────────────────────────────────────────────

class ResultadoConfirm(BaseModel):
    tipo_evaluador: str
    competencia: str
    orden: int
    nota: float


class EvaluadoConfirm(BaseModel):
    apellido_evaluado: str
    nombre_evaluado: str
    apellido_superior: Optional[str] = None
    nombre_superior: Optional[str] = None
    organismo: Optional[str] = None
    gerencia: Optional[str] = None
    sector: Optional[str] = None
    perfil: str
    nota_final: Optional[float] = None
    empleado_id: Optional[UUID] = None         # null = sin candidato (se guarda igual)
    guardar_equivalencia: bool = False         # True = el humano confirmó este match a mano
    resultados: List[ResultadoConfirm] = []


class ConfirmarRequest(BaseModel):
    empresa_id: UUID
    periodo: str
    evaluados: List[EvaluadoConfirm]


class ConfirmarResponse(BaseModel):
    lote_id: UUID
    evaluados: int
    resultados: int
    equivalencias: int
    piso_periodo_anterior: bool
