"""
Payloads de auditoría de evaluaciones de desempeño (scoring de una instancia).

Módulo propio (no se agrega a _audit_payloads_rrhh.py, que ya está cerca del límite).
Entidad "evaluacion" (misma que usan los adjuntos de evaluación) con registro_id = id de
la instancia: agrupa todo el historial de una evaluación (scoring + finalización) bajo el
mismo registro. El diff se reusa de AuditService._diff (mismo patrón que empleados).

_subset se duplica acá (3 líneas triviales) en vez de importarlo helper→helper.
"""
from typing import Optional

from services.audit_service import AuditService, _jsonable

# Campos del scoring de un criterio (columnas reales de ev_resultados).
_CAMPOS_RESULTADO = ("puntaje", "valor", "comentario")


def _subset(obj: object, campos: tuple) -> dict:
    """Extrae `campos` de un modelo Pydantic (o dict) como dict JSON-serializable."""
    data = obj.model_dump() if hasattr(obj, "model_dump") else dict(obj)  # type: ignore[arg-type]
    return {k: _jsonable(data.get(k)) for k in campos}


def _resultado_de(instancia, criterio_id: str):
    """Resultado (fila de scoring) de un criterio dentro de una instancia, o None."""
    return next(
        (r for r in instancia.resultados if str(r.criterio_id) == str(criterio_id)), None
    )


def payload_carga_resultado_evaluacion(prior, nueva, criterio_id, usuario_id: Optional[str]) -> dict:
    """Evento UPDATE del scoring de un criterio: puntaje/valor/comentario viejo→nuevo.

    `prior`/`nueva` son la instancia antes y después de la escritura. registro_id = id de
    la instancia; se incluye el nombre del criterio para saber a cuál corresponde la nota."""
    r_prev = _resultado_de(prior, str(criterio_id))
    r_new = _resultado_de(nueva, str(criterio_id))
    antes, despues = AuditService._diff(
        _subset(r_prev, _CAMPOS_RESULTADO) if r_prev else {},
        _subset(r_new, _CAMPOS_RESULTADO) if r_new else {},
    )
    criterio = (r_new or r_prev).criterio_nombre if (r_new or r_prev) else None
    antes["criterio"] = criterio
    despues["criterio"] = criterio
    return {
        "usuario_id": usuario_id, "entidad": "evaluacion", "registro_id": str(nueva.id),
        "accion": "UPDATE", "evento": "carga_resultado_evaluacion",
        "empresa_id": str(nueva.empresa_id),
        "datos_anteriores": antes, "datos_nuevos": despues,
    }


def payload_finalizar_evaluacion(instancia_id, prior, puntaje_global, empresa_id, usuario_id: Optional[str]) -> dict:
    """Evento UPDATE de finalización: estado borrador→finalizada + puntaje_global resultante."""
    return {
        "usuario_id": usuario_id, "entidad": "evaluacion", "registro_id": str(instancia_id),
        "accion": "UPDATE", "evento": "finalizar_evaluacion", "empresa_id": empresa_id,
        "datos_anteriores": {"estado": prior.estado},
        "datos_nuevos": {"estado": "finalizada", "puntaje_global": _jsonable(puntaje_global)},
    }


def payload_importacion_evaluaciones(lote_id: str, periodo: str, empresa_id: str, evaluados: int,
                                     resultados: int, equivalencias: int, piso: bool,
                                     usuario_id: Optional[str]) -> dict:
    """Evento de auditoría de un LOTE de import de resultados de evaluaciones (UN evento por lote,
    nunca fila por fila). registro_id = UUID del lote (la columna es uuid; un sentinel de texto como
    'lote_evaluaciones' rompe el insert y AuditService lo traga → evento perdido en silencio).
    A diferencia de nómina, el lote es de UNA empresa (la del import), así que empresa_id va seteada."""
    return {
        "usuario_id": usuario_id, "entidad": "evaluacion", "registro_id": lote_id,
        "accion": "INSERT", "evento": "importacion_evaluaciones", "empresa_id": empresa_id,
        "datos_anteriores": None,
        "datos_nuevos": {
            "periodo": periodo, "evaluados": evaluados, "resultados": resultados,
            "equivalencias_confirmadas": equivalencias, "piso_periodo_anterior": piso,
        },
    }
