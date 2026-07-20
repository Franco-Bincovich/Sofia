"""
Helper del export de asignaciones de capacitación: proyecta a columnas legibles
(sin UUIDs crudos), con fechas dd/mm/aaaa, estado prettificado y certificado Sí/No.
Los headers del Excel son las keys de cada dict (el motor genérico las capitaliza);
por eso las keys YA son el header legible. Molde _ausencias_export.

Lee SOLO atributos ya resueltos por AsignacionRepo._build (joins en batch); no
dispara ninguna query nueva.
"""
from typing import List

from schemas.capacitacion import AsignacionResponse

# Estado crudo → label RRHH. Fallback al crudo (.get(v, v)): un estado nuevo nunca
# desaparece del archivo en silencio.
_ESTADO_LABEL = {"pendiente": "Pendiente", "en_curso": "En curso", "completado": "Completado"}


def _fecha(v) -> str:
    """Formatea date/datetime a dd/mm/aaaa (descarta hora); '' si es None."""
    return v.strftime("%d/%m/%Y") if v else ""


def construir_filas_export(items: List[AsignacionResponse]) -> List[dict]:
    """Proyecta las asignaciones a las columnas legibles del export (sin UUIDs crudos)."""
    return [
        {
            "Empresa": a.empresa_nombre,
            "Empleado": a.empleado_nombre,
            "Área": a.area_nombre,
            "Capacitación": a.capacitacion_nombre,
            "Estado": _ESTADO_LABEL.get(a.estado, a.estado),
            "Fecha asignación": _fecha(a.fecha_asignacion),
            "Fecha límite": _fecha(a.fecha_limite),
            "Fecha completado": _fecha(a.fecha_completado),
            "Certificado": "Sí" if a.certificado_url else "No",
        }
        for a in items
    ]
