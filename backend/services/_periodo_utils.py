"""
Check centralizado de bloqueo por período (capa service), SOLO para mandos_medios.

`verificar_periodo_abierto` es el único punto donde vive la regla. Los services de escritura
(vacaciones/ausencias/costos) la llaman en 1 línea antes de crear/editar/borrar, pasando el rol
del usuario. Semántica: un mandos_medios no puede operar mientras HOY caiga dentro de un período
cerrado de la empresa+módulo del registro; admin_rrhh y gerencia_lectura NUNCA se bloquean.
La comparación es contra la fecha de carga (hoy), no contra las fechas del registro.

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


def verificar_periodo_abierto(
    empresa_id: Optional[UUID],
    modulo: Optional[str],
    rol: Optional[str],
    *,
    repo: Optional[PeriodoRepo] = None,
) -> None:
    """
    Bloquea la operación si el usuario es mandos_medios y HOY cae en un período cerrado.

    Solo aplica a `mandos_medios`: para cualquier otro rol (admin_rrhh, gerencia_lectura,
    None/desconocido) retorna sin validar. Para un mando, compara la fecha de HOY contra los
    períodos cerrados de `empresa_id` en `modulo` (más los globales); si hoy cae dentro de
    alguno, lanza PERIODO_CERRADO (409). Sin empresa concreta, no evalúa.

    Raises:
        AppError: PERIODO_CERRADO (409) si hoy cae en un período cerrado.
    """
    if rol != "mandos_medios":
        return
    if empresa_id is None:
        return
    hoy = date.today()
    repo = repo or PeriodoRepo()
    for p in repo.find_cerrados(empresa_id, modulo):
        if p.desde <= hoy <= p.hasta:
            raise AppError(
                f"Del {_fmt(p.desde)} al {_fmt(p.hasta)} no está habilitada la carga de novedades",
                "PERIODO_CERRADO",
                409,
            )
