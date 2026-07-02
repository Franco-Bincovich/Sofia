"""
Proyección de columnas legibles para el export del catálogo de ítems de inventario.

Mismo molde que los otros exports: no vuelca model_dump() crudo (que incluía UUIDs).
Los headers del Excel son las keys de cada dict (el motor genérico las capitaliza).
No toca el motor de export.
"""
from typing import List

from schemas.inventario import ItemResponse


def _fecha(v) -> str:
    """Formatea date/datetime a dd/mm/aaaa (descarta hora); '' si es None."""
    return v.strftime("%d/%m/%Y") if v else ""


def construir_filas_export(items: List[ItemResponse]) -> List[dict]:
    """Proyecta los ítems del catálogo a columnas legibles (sin UUIDs crudos)."""
    return [
        {
            "Empresa": it.empresa_nombre,
            "Nombre": it.nombre,
            "Tipo": it.tipo,
            "Descripción": it.descripcion,
            "N° serie": it.numero_serie,
            "Estado": it.estado,
            "Costo": it.costo,
            "Asignado a": it.asignado_a,
            "Notas": it.notas,
            "Fecha alta": _fecha(it.fecha_alta),
            "Creada": _fecha(it.created_at),
        }
        for it in items
    ]
