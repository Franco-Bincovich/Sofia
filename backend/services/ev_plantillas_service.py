"""
Servicio de plantillas y criterios de evaluación de desempeño.
Flujo: router → service → repository → DB
empresa_id es explícito en PlantillaCreate (entidad raíz).
Criterios heredan empresa_id de la plantilla padre.
"""
from typing import List, Optional
from uuid import UUID

from repositories.ev_plantillas_repo import EvPlantillasRepo
from schemas.evaluaciones import (
    CriterioCreate, CriterioResponse, CriterioUpdate,
    PlantillaCreate, PlantillaListResponse, PlantillaResponse, PlantillaUpdate,
)
from utils.errors import AppError
from utils.logger import logger

_ESCALAS = ("numerica", "cualitativa")


class EvPlantillasService:
    def __init__(self, repo: Optional[EvPlantillasRepo] = None) -> None:
        self._repo = repo or EvPlantillasRepo()

    def get_all(self, empresa_id: Optional[UUID] = None, solo_activas: bool = True) -> PlantillaListResponse:
        """Retorna plantillas con criterios, filtradas por empresa."""
        items = self._repo.find_all(empresa_id, solo_activas)
        return PlantillaListResponse(items=items, total=len(items))

    def get_by_id(self, id: UUID, empresa_id: Optional[UUID] = None) -> PlantillaResponse:
        """
        Retorna una plantilla con sus criterios.

        Raises:
            AppError: PLANTILLA_NOT_FOUND (404) si no existe o no pertenece a la empresa.
        """
        row = self._repo.find_by_id(str(id), empresa_id)
        if not row:
            raise AppError("Plantilla no encontrada", "PLANTILLA_NOT_FOUND", 404)
        return row

    def create(self, data: PlantillaCreate) -> PlantillaResponse:
        """
        Crea una plantilla de evaluación.
        Valida tipo_escala y que los campos de escala sean coherentes.

        Raises:
            AppError: TIPO_ESCALA_INVALIDO (422), ESCALA_NUMERICA_INVALIDA (422),
                      OPCIONES_REQUERIDAS (422), NOMBRE_REQUERIDO (422).
        """
        if not data.nombre.strip():
            raise AppError("El nombre es requerido", "NOMBRE_REQUERIDO", 422)
        if data.tipo_escala not in _ESCALAS:
            raise AppError(f"tipo_escala debe ser {_ESCALAS}", "TIPO_ESCALA_INVALIDO", 422)
        if data.tipo_escala == "numerica":
            if data.escala_min is None or data.escala_max is None:
                raise AppError("Escala numérica requiere escala_min y escala_max", "ESCALA_NUMERICA_INVALIDA", 422)
            if data.escala_min >= data.escala_max:
                raise AppError("escala_min debe ser menor que escala_max", "ESCALA_NUMERICA_INVALIDA", 422)
        if data.tipo_escala == "cualitativa" and not data.opciones_cualitativas:
            raise AppError("Escala cualitativa requiere opciones_cualitativas", "OPCIONES_REQUERIDAS", 422)
        row = self._repo.save(data)
        logger.info("Plantilla de evaluación creada", extra={"plantilla_id": str(row.id)})
        return row

    def update(self, id: UUID, data: PlantillaUpdate, empresa_id: Optional[UUID] = None) -> PlantillaResponse:
        """
        Actualiza parcialmente una plantilla.

        Raises:
            AppError: PLANTILLA_NOT_FOUND (404).
        """
        if not self._repo.find_by_id(str(id), empresa_id):
            raise AppError("Plantilla no encontrada", "PLANTILLA_NOT_FOUND", 404)
        payload = {k: v for k, v in data.model_dump(exclude_none=True).items()}
        updated = self._repo.update(str(id), empresa_id, payload)
        logger.info("Plantilla actualizada", extra={"plantilla_id": str(id)})
        return updated  # type: ignore[return-value]

    def delete(self, id: UUID, empresa_id: Optional[UUID] = None) -> None:
        """
        Soft-delete si tiene ciclos asociados; hard-delete si no.

        Raises:
            AppError: PLANTILLA_NOT_FOUND (404).
        """
        if not self._repo.find_by_id(str(id), empresa_id):
            raise AppError("Plantilla no encontrada", "PLANTILLA_NOT_FOUND", 404)
        if self._repo.has_ciclos(str(id)):
            self._repo.update(str(id), empresa_id, {"activa": False})
            logger.info("Plantilla desactivada (tiene ciclos)", extra={"plantilla_id": str(id)})
        else:
            self._repo.delete(str(id), empresa_id)
            logger.info("Plantilla eliminada", extra={"plantilla_id": str(id)})

    # ── Criterios ─────────────────────────────────────────────────────────────

    def add_criterio(self, plantilla_id: UUID, data: CriterioCreate,
                     empresa_id: Optional[UUID] = None) -> CriterioResponse:
        """
        Agrega un criterio a la plantilla. empresa_id heredado de la plantilla.

        Raises:
            AppError: PLANTILLA_NOT_FOUND (404), NOMBRE_REQUERIDO (422).
        """
        plantilla = self._repo.find_by_id(str(plantilla_id), empresa_id)
        if not plantilla:
            raise AppError("Plantilla no encontrada", "PLANTILLA_NOT_FOUND", 404)
        if not data.nombre.strip():
            raise AppError("El nombre del criterio es requerido", "NOMBRE_REQUERIDO", 422)
        criterio = self._repo.add_criterio(str(plantilla_id), str(plantilla.empresa_id), data)
        logger.info("Criterio agregado", extra={"plantilla_id": str(plantilla_id)})
        return criterio

    def update_criterio(self, criterio_id: UUID, data: CriterioUpdate,
                        empresa_id: Optional[UUID] = None) -> CriterioResponse:
        """
        Actualiza un criterio.

        Raises:
            AppError: CRITERIO_NOT_FOUND (404).
        """
        emp_str = str(empresa_id) if empresa_id else ""
        payload = data.model_dump(exclude_none=True)
        updated = self._repo.update_criterio(str(criterio_id), emp_str, payload)
        if not updated:
            raise AppError("Criterio no encontrado", "CRITERIO_NOT_FOUND", 404)
        return updated

    def delete_criterio(self, criterio_id: UUID, empresa_id: Optional[UUID] = None) -> None:
        """
        Elimina un criterio.

        Raises:
            AppError: CRITERIO_NOT_FOUND (404).
        """
        emp_str = str(empresa_id) if empresa_id else ""
        if not self._repo.delete_criterio(str(criterio_id), emp_str):
            raise AppError("Criterio no encontrado", "CRITERIO_NOT_FOUND", 404)
