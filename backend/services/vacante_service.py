"""
Servicio de vacantes. Lógica de negocio del módulo de Vacantes y Pipeline.
Flujo: router → service → repository → DB
"""
from typing import List, Optional
from uuid import UUID

from repositories.vacante_repo import VacanteRepo
from schemas.vacante import CandidatoCreate, CandidatoResponse, VacanteCreate, VacanteResponse, VacanteUpdate
from utils.errors import AppError
from utils.logger import logger

_ETAPAS = {"postulado", "assessment", "entrevista_rrhh", "entrevista_tecnica", "oferta"}
_ESTADOS = {"nueva", "en_proceso", "con_candidatos", "cerrada"}


class VacanteService:
    def __init__(self, repo: Optional[VacanteRepo] = None) -> None:
        self._repo = repo or VacanteRepo()

    def get_vacantes(self, estado: Optional[str] = None) -> List[VacanteResponse]:
        """
        Retorna la lista de vacantes, opcionalmente filtrada por estado.

        Args:
            estado: Filtro por estado ('nueva'|'en_proceso'|'con_candidatos'|'cerrada').

        Returns:
            Lista de VacanteResponse ordenada por fecha de creación descendente.
        """
        return self._repo.find_all(estado)

    def get_vacante(self, id: UUID) -> VacanteResponse:
        """
        Retorna el detalle de una vacante por ID.

        Args:
            id: UUID de la vacante a consultar.

        Raises:
            AppError: VACANTE_NOT_FOUND (404) si el ID no existe.
        """
        vacante = self._repo.find_by_id(str(id))
        if not vacante:
            raise AppError("Vacante no encontrada", "VACANTE_NOT_FOUND", 404)
        return vacante

    def create_vacante(self, data: VacanteCreate, created_by: str) -> VacanteResponse:
        """
        Crea una nueva vacante en estado 'nueva'.

        Args:
            data: Datos de la vacante validados por Pydantic.
            created_by: ID del usuario que realiza la operación (trazabilidad).
        """
        vacante = self._repo.save(data)
        logger.info("Vacante creada", extra={"vacante_id": vacante.id, "created_by": created_by})
        return vacante

    def update_vacante(self, id: UUID, data: VacanteUpdate) -> VacanteResponse:
        """
        Actualiza los campos de una vacante existente (actualización parcial).

        Args:
            id: UUID de la vacante a actualizar.
            data: Campos a actualizar — solo los no-None se aplican.

        Raises:
            AppError: ESTADO_INVALIDO (400) si el estado no está en el enum.
            AppError: VACANTE_NOT_FOUND (404) si el ID no existe.
        """
        if data.estado and data.estado not in _ESTADOS:
            raise AppError(
                f"Estado inválido. Permitidos: {', '.join(_ESTADOS)}", "ESTADO_INVALIDO", 400
            )
        vacante = self._repo.update(str(id), data)
        if not vacante:
            raise AppError("Vacante no encontrada", "VACANTE_NOT_FOUND", 404)
        logger.info("Vacante actualizada", extra={"vacante_id": str(id)})
        return vacante

    def get_candidatos(self, vacante_id: UUID) -> List[CandidatoResponse]:
        """
        Retorna todos los candidatos de una vacante ordenados por fecha de postulación.

        Args:
            vacante_id: UUID de la vacante.

        Raises:
            AppError: VACANTE_NOT_FOUND (404) si la vacante no existe.
        """
        if not self._repo.find_by_id(str(vacante_id)):
            raise AppError("Vacante no encontrada", "VACANTE_NOT_FOUND", 404)
        return self._repo.find_candidatos(str(vacante_id))

    def add_candidato(self, vacante_id: UUID, data: CandidatoCreate) -> CandidatoResponse:
        """
        Agrega un candidato a la vacante en etapa 'postulado'.

        Args:
            vacante_id: UUID de la vacante a la que se postula.
            data: Datos del candidato validados por Pydantic.

        Raises:
            AppError: VACANTE_NOT_FOUND (404) si la vacante no existe.
        """
        if not self._repo.find_by_id(str(vacante_id)):
            raise AppError("Vacante no encontrada", "VACANTE_NOT_FOUND", 404)
        candidato = self._repo.save_candidato(str(vacante_id), data)
        logger.info("Candidato agregado", extra={"vacante_id": str(vacante_id), "candidato_id": candidato.id})
        return candidato

    def mover_candidato(self, candidato_id: UUID, etapa: str) -> CandidatoResponse:
        """
        Mueve un candidato a una nueva etapa del pipeline.

        Args:
            candidato_id: UUID del candidato a mover.
            etapa: Nueva etapa del pipeline.

        Raises:
            AppError: ETAPA_INVALIDA (400) si la etapa no está en el enum.
            AppError: CANDIDATO_NOT_FOUND (404) si el candidato no existe.
        """
        if etapa not in _ETAPAS:
            raise AppError(f"Etapa inválida. Permitidas: {', '.join(_ETAPAS)}", "ETAPA_INVALIDA", 400)
        candidato = self._repo.update_etapa_candidato(str(candidato_id), etapa)
        if not candidato:
            raise AppError("Candidato no encontrado", "CANDIDATO_NOT_FOUND", 404)
        logger.info("Candidato movido", extra={"candidato_id": str(candidato_id), "etapa": etapa})
        return candidato
