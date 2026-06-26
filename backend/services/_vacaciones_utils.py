"""
Helpers internos del módulo de vacaciones (capa service).

`derive_estado` se extrajo de `VacacionesService._derive_estado` (T18.4b) para
descargar líneas del service y permitir su instrumentación de audit bajo el límite
de 150. Función pura, sin IO; comportamiento idéntico al método original.
"""
from datetime import date

from schemas.vacaciones import SolicitudVacacionesResponse


def derive_estado(row: SolicitudVacacionesResponse, today: date) -> SolicitudVacacionesResponse:
    """Calcula el estado derivado (cancelada/planificada/tomada) y devuelve una copia del response."""
    if row.cancelada:
        estado = "cancelada"
    elif today < row.fecha_desde:
        estado = "planificada"
    else:
        estado = "tomada"
    return row.model_copy(update={"estado": estado})
