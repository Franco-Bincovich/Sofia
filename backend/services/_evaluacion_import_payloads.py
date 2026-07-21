"""
Builders PUROS del import de evaluaciones (fase 4). Sin I/O ni estado:
- preview_de / resumen_de: parseo + resolución → forma de preview.
- a_evaluado_create / a_resultado_creates / equivalencia_dict: payload confirmado → filas a persistir.
"""
from typing import List, Optional
from uuid import UUID

from schemas.evaluacion_import import EvaluadoParseado, ResolucionIdentidad
from schemas.evaluacion_import_api import EvaluadoConfirm, EvaluadoPreview, PreviewResumen
from schemas.evaluacion_resultados import EvaluadoCreate, ResultadoCreate
from services import _evaluacion_import_transforms as tx


def preview_de(ev: EvaluadoParseado, r: ResolucionIdentidad) -> EvaluadoPreview:
    """Fusiona un evaluado parseado con su resolución de identidad en una fila de preview."""
    return EvaluadoPreview(
        apellido_evaluado=ev.apellido_evaluado, nombre_evaluado=ev.nombre_evaluado,
        apellido_superior=ev.apellido_superior, nombre_superior=ev.nombre_superior,
        organismo=ev.organismo, gerencia=ev.gerencia, sector=ev.sector,
        perfil=ev.perfil, nota_final=ev.nota_final,
        estado=r.estado, empleado_id=r.empleado_id, fuente=r.fuente, motivo=r.motivo,
        candidatos=r.candidatos, resultados=ev.resultados,
    )


def resumen_de(previews: List[EvaluadoPreview]) -> PreviewResumen:
    """Cuenta evaluados por estado + total de resultados a insertar."""
    return PreviewResumen(
        evaluados=len(previews),
        resueltos=sum(1 for p in previews if p.estado == "resuelto"),
        ambiguos=sum(1 for p in previews if p.estado == "ambiguo"),
        sin_candidato=sum(1 for p in previews if p.estado == "sin_candidato"),
        resultados=sum(len(p.resultados) for p in previews),
    )


def a_evaluado_create(ec: EvaluadoConfirm) -> EvaluadoCreate:
    """EvaluadoConfirm (aprobado) → EvaluadoCreate (fila de evaluacion_evaluados)."""
    return EvaluadoCreate(
        empleado_id=ec.empleado_id, nota_final=ec.nota_final, perfil=ec.perfil,
        organismo=ec.organismo, gerencia=ec.gerencia, sector=ec.sector,
        apellido_evaluado=ec.apellido_evaluado, nombre_evaluado=ec.nombre_evaluado,
        apellido_superior=ec.apellido_superior, nombre_superior=ec.nombre_superior,
    )


def a_resultado_creates(ec: EvaluadoConfirm) -> List[ResultadoCreate]:
    """Los resultados de un evaluado confirmado → filas de evaluacion_resultados."""
    return [ResultadoCreate(tipo_evaluador=r.tipo_evaluador, competencia=r.competencia,
                            orden=r.orden, nota=r.nota) for r in ec.resultados]


def equivalencia_dict(empresa_id: str, ec: EvaluadoConfirm, usuario_id: Optional[str]) -> dict:
    """Fila de evaluacion_equivalencias (nombres NORMALIZADos, como los busca el resolutor)."""
    return {
        "empresa_id": empresa_id,
        "apellido_csv": tx.normalizar_campo(ec.apellido_evaluado),
        "nombre_csv": tx.normalizar_campo(ec.nombre_evaluado),
        "empleado_id": str(ec.empleado_id),
        "confirmado_por": usuario_id,
    }
