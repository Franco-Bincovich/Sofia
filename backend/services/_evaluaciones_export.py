"""
Proyección de columnas legibles para el export de instancias de evaluación de desempeño.

Extraído del service para no volcar model_dump() crudo (que incluía UUIDs). Los
headers del Excel son las keys de cada dict (el motor genérico las capitaliza).
No toca el motor de export.
"""
from typing import List

from schemas.evaluaciones import InstanciaResponse


def _fecha(v) -> str:
    """Formatea date/datetime a dd/mm/aaaa (descarta hora); '' si es None."""
    return v.strftime("%d/%m/%Y") if v else ""


def construir_filas_export(items: List[InstanciaResponse]) -> List[dict]:
    """Proyecta las instancias de evaluación a columnas legibles (sin UUIDs crudos)."""
    return [
        {
            "Empresa": i.empresa_nombre,
            "Empleado": i.empleado_nombre,
            "Área": i.empleado_area,
            "Ciclo": i.ciclo_nombre,
            "Evaluador": i.evaluador_nombre,
            "Estado": i.estado,
            "Puntaje": i.puntaje_global,
            "Fecha evaluación": _fecha(i.fecha_evaluacion),
        }
        for i in items
    ]
