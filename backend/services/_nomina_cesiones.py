"""
Helper del import de nómina: crea la cesión de la "Fecha Ingreso Reconocida" del CSV.

Idempotente por (empleado, fecha): si el empleado ya tiene una cesión con esa fecha, no crea
otra ni la toca (nunca pisa la empresa cargada a mano). Best-effort: un fallo NO rompe la carga
del empleado (ya creado), solo loguea. Reusa CesionService (no inserta directo).
"""
from datetime import date
from typing import Optional
from uuid import UUID

from schemas.cesion import CesionCreate
from services.cesion_service import CesionService
from utils.logger import logger

# empresa_cesion es NOT NULL y el CSV no trae la empresa (se carga a mano en la ficha).
# Placeholder explícito para que se vea claramente que falta completar (mejor que "" o null).
PLACEHOLDER_EMPRESA = "Pendiente de completar"


class NominaCesiones:
    def __init__(self, usuario_id: str) -> None:
        self._usuario_id = usuario_id
        self._cesiones = CesionService()

    def crear_si_falta(self, empleado_id: str, empresa_id: str, fecha: Optional[str]) -> None:
        """Crea la cesión de `fecha` (ISO) si el empleado no tiene ya una con esa fecha.
        Match por fecha → no duplica ni pisa lo existente. Best-effort: nunca propaga."""
        if not fecha:
            return
        try:
            existentes = self._cesiones.listar(UUID(empleado_id), UUID(empresa_id)).items
            if any(str(c.fecha) == fecha for c in existentes):
                return  # ya existe una cesión con esa fecha → no duplicar ni pisar
            self._cesiones.crear(
                UUID(empleado_id),
                CesionCreate(fecha=date.fromisoformat(fecha), empresa_cesion=PLACEHOLDER_EMPRESA),
                UUID(empresa_id), self._usuario_id,
            )
        except Exception as exc:  # noqa: BLE001 — no romper la carga del empleado ya creado
            logger.warning("No se pudo crear la cesión de ingreso reconocido",
                           extra={"empleado_id": empleado_id, "fecha": fecha, "error": str(exc)})
