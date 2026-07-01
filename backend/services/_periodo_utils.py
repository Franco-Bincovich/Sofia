"""
Check centralizado de bloqueo por período (capa service).

`verificar_periodo_abierto` es el único punto donde vive la regla de solapamiento; los
services de escritura (ausencias/vacaciones/costos, B3.2) la llaman en 1 línea antes de
crear/editar/borrar. Congelamiento total: si el registro cae en un período cerrado, lanza
AppError PERIODO_CERRADO (409) y la operación no procede.

Precedente de helper fino con repo inyectable: _empleados_utils.py / _vacaciones_utils.py.
Aún NO se llama desde ningún módulo (eso es B3.2); acá solo se define y se testea.
"""
from datetime import date
from typing import Optional
from uuid import UUID

from repositories.periodo_repo import PeriodoRepo
from utils.errors import AppError


def _solapa(desde: date, hasta: date, p_desde: date, p_hasta: date) -> bool:
    """True si el rango [desde, hasta] se solapa con el período [p_desde, p_hasta]."""
    return desde <= p_hasta and hasta >= p_desde


def verificar_periodo_abierto(
    empresa_id: Optional[UUID],
    modulo: Optional[str],
    *,
    fecha: Optional[date] = None,
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
    repo: Optional[PeriodoRepo] = None,
) -> None:
    """
    Verifica que el registro no caiga en un período cerrado de su empresa.

    Se pasa una fecha simple (`fecha`) o un rango (`desde`/`hasta`). Una fecha simple se
    trata como el rango [fecha, fecha]. Si el rango se solapa con algún período cerrado
    (del módulo o global), lanza PERIODO_CERRADO (409). Sin empresa concreta o sin fecha,
    no evalúa (no hay nada que congelar).

    Raises:
        AppError: PERIODO_CERRADO (409) si el registro cae en un período cerrado.
    """
    if empresa_id is None:
        return
    if fecha is not None:
        desde = hasta = fecha
    if desde is None or hasta is None:
        return
    repo = repo or PeriodoRepo()
    for p in repo.find_cerrados(empresa_id, modulo):
        if _solapa(desde, hasta, p.desde, p.hasta):
            raise AppError("No se puede modificar: el período está cerrado", "PERIODO_CERRADO", 409)
