"""
Helpers privados del listado/export de vacaciones (extraídos para mantener el
service ≤150 líneas).

- resolver_empleado_ids: combina el filtro de ownership+área (REUSA
  _ownership_filter.resolver_filtro_empleados) con un empleado_id puntual,
  aplicando la MISMA intersección — un mando medio que pide un empleado fuera
  de su alcance recibe vacío, nunca los datos (fail-closed).
- construir_filas_export: proyecta las solicitudes a las columnas legibles del
  export (sin los UUIDs crudos), con fechas dd/mm/aaaa y cancelada Sí/No. Los
  headers del Excel son las keys de cada dict (el motor genérico las capitaliza);
  por eso las keys YA son el header legible.
"""
from typing import List, Optional, Tuple

from schemas.vacaciones import SolicitudVacacionesResponse
from services._ownership_filter import resolver_filtro_empleados


def resolver_empleado_ids(
    user_id: str, rol: str, empresa_id, area_id, empleado_id, repo,
) -> Tuple[Optional[List[str]], bool]:
    """
    Resuelve la lista final de empleado_ids combinando ownership+área con un empleado_id puntual.

    Retorna (empleado_ids, vacio) con el mismo contrato que resolver_filtro_empleados
    (None = sin restricción, [ids] = solo esos, vacio=True = vacío sin consultar).
    Si empleado_id se provee, estrecha el resultado a ese único empleado SOLO si cae
    dentro del alcance de ownership; si no, devuelve vacío (un mando no exporta ajenos).
    """
    empleado_ids, vacio = resolver_filtro_empleados(user_id, rol, empresa_id, area_id, repo)
    if empleado_id and not vacio:
        eid = str(empleado_id)
        if empleado_ids is None or eid in empleado_ids:
            empleado_ids = [eid]              # dentro del alcance → acotar a ese empleado
        else:
            empleado_ids, vacio = None, True  # fuera del alcance del mando → vacío
    return empleado_ids, vacio


def _fecha(v) -> str:
    """Formatea date/datetime a dd/mm/aaaa (descarta hora); '' si es None."""
    return v.strftime("%d/%m/%Y") if v else ""


def construir_filas_export(items: List[SolicitudVacacionesResponse]) -> List[dict]:
    """Proyecta las solicitudes a las columnas legibles del export (sin UUIDs crudos)."""
    return [
        {
            "Empresa": s.empresa_nombre,
            "Empleado": s.empleado_nombre,
            "Área": s.area_nombre,
            "Fecha desde": _fecha(s.fecha_desde),
            "Fecha hasta": _fecha(s.fecha_hasta),
            "Días": s.dias,
            "Tipo": s.tipo,
            "Comentario": s.comentario,
            "Estado": s.estado,
            "Cancelada": "Sí" if s.cancelada else "No",
            "Creada": _fecha(s.created_at),
        }
        for s in items
    ]
