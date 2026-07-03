"""
Proyección de columnas legibles para el export de objetivos.

Extraído del service para no volcar model_dump() crudo (que incluía UUIDs). Los
headers del Excel son las keys de cada dict (el motor genérico las capitaliza).
No toca el motor de export.
"""
from typing import List

from schemas.objetivo import ObjetivoResponse


def _fecha(v) -> str:
    """Formatea date/datetime a dd/mm/aaaa (descarta hora); '' si es None."""
    return v.strftime("%d/%m/%Y") if v else ""


def construir_filas_export(items: List[ObjetivoResponse]) -> List[dict]:
    """Proyecta los objetivos a columnas legibles (sin UUIDs crudos)."""
    return [
        {
            "Empresa": o.empresa_nombre,
            "Responsable": o.responsable_nombre,
            "Título": o.titulo,
            "Descripción": o.descripcion,
            "Prioridad": o.prioridad,
            "Estado": o.estado,
            "Fecha entrega": _fecha(o.fecha_entrega),
            "Creada": _fecha(o.created_at),
            "Actualizada": _fecha(o.updated_at),
        }
        for o in items
    ]
