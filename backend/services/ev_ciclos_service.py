"""
Servicio de ciclos de evaluación de desempeño.
Flujo: router → service → repository → DB
empresa_id se hereda de la plantilla al crear. No se pide en el body.
"""
from typing import Optional
from uuid import UUID

from repositories.ev_ciclos_repo import EvCiclosRepo
from repositories.ev_plantillas_repo import EvPlantillasRepo
from schemas.evaluaciones import CicloCreate, CicloListResponse, CicloResponse, CicloUpdate
from utils.errors import AppError
from utils.logger import logger


class EvCiclosService:
    def __init__(
        self,
        repo: Optional[EvCiclosRepo] = None,
        plantillas_repo: Optional[EvPlantillasRepo] = None,
    ) -> None:
        self._repo = repo or EvCiclosRepo()
        self._plantillas_repo = plantillas_repo or EvPlantillasRepo()

    def get_all(self, empresa_id: Optional[UUID] = None) -> CicloListResponse:
        """Retorna ciclos filtrados por empresa con conteo de instancias."""
        items = self._repo.find_all(empresa_id)
        return CicloListResponse(items=items, total=len(items))

    def get_by_id(self, id: UUID, empresa_id: Optional[UUID] = None) -> CicloResponse:
        """
        Retorna un ciclo por ID.

        Raises:
            AppError: CICLO_NOT_FOUND (404).
        """
        row = self._repo.find_by_id(str(id), empresa_id)
        if not row:
            raise AppError("Ciclo no encontrado", "CICLO_NOT_FOUND", 404)
        return row

    def create(self, data: CicloCreate) -> CicloResponse:
        """
        Crea un ciclo heredando empresa_id de la plantilla.
        Valida que la plantilla exista y esté activa.

        Raises:
            AppError: PLANTILLA_NOT_FOUND (404), PLANTILLA_INACTIVA (422),
                      FECHA_INVALIDA (422), NOMBRE_REQUERIDO (422).
        """
        if not data.nombre.strip():
            raise AppError("El nombre es requerido", "NOMBRE_REQUERIDO", 422)
        if data.fecha_inicio > data.fecha_fin:
            raise AppError("fecha_inicio debe ser anterior a fecha_fin", "FECHA_INVALIDA", 422)
        plantilla = self._plantillas_repo.find_by_id(str(data.plantilla_id))
        if not plantilla:
            raise AppError("Plantilla no encontrada", "PLANTILLA_NOT_FOUND", 404)
        if not plantilla.activa:
            raise AppError("La plantilla está inactiva", "PLANTILLA_INACTIVA", 422)
        row = self._repo.save(data, str(plantilla.empresa_id))
        logger.info("Ciclo de evaluación creado", extra={"ciclo_id": str(row.id), "plantilla_id": str(data.plantilla_id)})
        return row

    def update(self, id: UUID, data: CicloUpdate, empresa_id: Optional[UUID] = None) -> CicloResponse:
        """
        Actualiza nombre y fechas del ciclo (no permite cambiar plantilla).

        Raises:
            AppError: CICLO_NOT_FOUND (404), CICLO_CERRADO (422), FECHA_INVALIDA (422).
        """
        ciclo = self._repo.find_by_id(str(id), empresa_id)
        if not ciclo:
            raise AppError("Ciclo no encontrado", "CICLO_NOT_FOUND", 404)
        if ciclo.estado == "cerrado":
            raise AppError("No se puede modificar un ciclo cerrado", "CICLO_CERRADO", 422)
        payload = data.model_dump(exclude_none=True)
        fi = payload.get("fecha_inicio", ciclo.fecha_inicio)
        ff = payload.get("fecha_fin", ciclo.fecha_fin)
        if fi > ff:
            raise AppError("fecha_inicio debe ser anterior a fecha_fin", "FECHA_INVALIDA", 422)
        if "fecha_inicio" in payload:
            payload["fecha_inicio"] = str(payload["fecha_inicio"])
        if "fecha_fin" in payload:
            payload["fecha_fin"] = str(payload["fecha_fin"])
        updated = self._repo.update(str(id), empresa_id, payload)
        logger.info("Ciclo actualizado", extra={"ciclo_id": str(id)})
        return updated  # type: ignore[return-value]

    def cerrar_ciclo(self, id: UUID, empresa_id: Optional[UUID] = None) -> CicloResponse:
        """
        Cierra un ciclo. Operación irreversible.

        Raises:
            AppError: CICLO_NOT_FOUND (404), CICLO_YA_CERRADO (409).
        """
        ciclo = self._repo.find_by_id(str(id), empresa_id)
        if not ciclo:
            raise AppError("Ciclo no encontrado", "CICLO_NOT_FOUND", 404)
        if ciclo.estado == "cerrado":
            raise AppError("El ciclo ya está cerrado", "CICLO_YA_CERRADO", 409)
        self._repo.cerrar(str(id), empresa_id)
        logger.info("Ciclo cerrado", extra={"ciclo_id": str(id)})
        return self._repo.find_by_id(str(id), empresa_id)  # type: ignore[return-value]
