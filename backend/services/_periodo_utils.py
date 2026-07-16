"""
Check centralizado de bloqueo por período (capa service), SOLO para mandos_medios.

`verificar_periodo_abierto` es el único punto donde vive la regla. Los services de escritura
(vacaciones/ausencias/costos) la llaman en 1 línea antes de crear/editar/borrar, pasando el rol
del usuario y las fechas del registro. Semántica: un mandos_medios no puede operar sobre un
registro cuyo RANGO DE FECHAS se solapa con un período cerrado de la empresa+módulo;
admin_rrhh y gerencia_lectura NUNCA se bloquean.
La comparación es contra las fechas del registro (overlap), no contra la fecha de carga (hoy).

Precedente de helper fino con repo inyectable: _empleados_utils.py / _vacaciones_utils.py.
"""
from datetime import date
from typing import Optional
from uuid import UUID

from repositories.periodo_repo import PeriodoRepo
from utils.errors import AppError


def _fmt(d: date) -> str:
    """Formatea una fecha como DD/MM/YYYY para el mensaje al usuario."""
    return d.strftime("%d/%m/%Y")


def _solapa(desde: date, hasta: date, p_desde: date, p_hasta: date) -> bool:
    """True si el rango [desde, hasta] se solapa con el período [p_desde, p_hasta]."""
    return desde <= p_hasta and hasta >= p_desde


def verificar_periodo_abierto(
    empresa_id: Optional[UUID],
    modulo: Optional[str],
    rol: Optional[str],
    *,
    fecha: Optional[date] = None,
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
    repo: Optional[PeriodoRepo] = None,
) -> None:
    """
    Bloquea la operación si el usuario es mandos_medios y el registro cae en un período cerrado.

    Solo aplica a `mandos_medios`: para cualquier otro rol (admin_rrhh, gerencia_lectura,
    None/desconocido) retorna sin validar. Para un mando, compara el RANGO DE FECHAS DEL
    REGISTRO contra los períodos cerrados de `empresa_id` en `modulo` (más los globales);
    si el rango se solapa con alguno, lanza PERIODO_CERRADO (409). La comparación es por
    solapamiento con las fechas del registro, NO contra la fecha de carga (hoy).

    Se pasa una fecha simple (`fecha`) o un rango (`desde`/`hasta`). Una fecha simple se
    trata como el rango [fecha, fecha]. Sin empresa concreta o sin fecha, no evalúa
    (no hay nada que congelar).

    Raises:
        AppError: PERIODO_CERRADO (409) si el rango del registro cae en un período cerrado.
    """
    if rol != "mandos_medios":
        return
    if empresa_id is None:
        return
    if fecha is not None:
        desde = hasta = fecha
    if desde is None or hasta is None:
        return
    repo = repo or PeriodoRepo()
    for p in repo.find_cerrados(empresa_id, modulo):
        if _solapa(desde, hasta, p.desde, p.hasta):
            raise AppError(
                f"Del {_fmt(p.desde)} al {_fmt(p.hasta)} no está habilitada la carga de novedades",
                "PERIODO_CERRADO",
                409,
            )
