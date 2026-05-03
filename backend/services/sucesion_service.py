"""
Servicio de sucesión y planes de carrera. Lógica de negocio del módulo.
Flujo: router → service → repository → DB
"""
from typing import Optional
from uuid import UUID

from repositories.sucesion_repo import SucesionRepo
from schemas.sucesion import (
    EmpleadoAnalisisResponse, EmpleadoMapaResponse,
    HitoBodyCreate, HitoResponse,
    PlanCarreraCreate, PlanCarreraResponse,
)
from utils.errors import AppError
from utils.logger import logger


class SucesionService:
    def __init__(self, repo: Optional[SucesionRepo] = None) -> None:
        self._repo = repo or SucesionRepo()

    def get_mapa_talento(self) -> list[EmpleadoMapaResponse]:
        """
        Retorna todos los empleados activos con su potencial y desempeño
        para posicionarlos en el mapa 9-Box.
        """
        return self._repo.get_mapa_talento()

    def get_planes_carrera(self) -> list[PlanCarreraResponse]:
        """
        Retorna todos los planes de carrera activos con conteo de hitos.
        """
        return self._repo.get_planes_carrera()

    def create_plan_carrera(self, data: PlanCarreraCreate) -> PlanCarreraResponse:
        """
        Crea un nuevo plan de carrera para un empleado.
        Valida que el empleado no tenga ya un plan activo antes de crear.

        Raises:
            AppError: PLAN_ALREADY_EXISTS (409) si el empleado ya tiene un plan activo.
        """
        existente = self._repo.get_plan_by_empleado(str(data.empleado_id))
        if existente:
            raise AppError(
                "El empleado ya tiene un plan de carrera activo",
                "PLAN_ALREADY_EXISTS",
                409,
            )
        plan = self._repo.create_plan(data)
        logger.info("Plan de carrera creado",
                    extra={"empleado_id": str(data.empleado_id), "plan_id": str(plan.id)})
        return plan

    def get_hitos(self, plan_id: UUID) -> list[HitoResponse]:
        """
        Retorna todos los hitos de un plan de carrera ordenados por creación.
        """
        return self._repo.get_hitos(str(plan_id))

    def create_hito(self, plan_id: UUID, data: HitoBodyCreate) -> HitoResponse:
        """
        Crea un nuevo hito dentro de un plan de carrera.

        Args:
            plan_id: UUID del plan al que pertenece el hito.
            data: HitoBodyCreate con título, descripción y fecha objetivo opcionales.

        Returns:
            HitoResponse con el hito recién creado.
        """
        hito = self._repo.create_hito(
            str(plan_id), data.titulo, data.descripcion,
            str(data.fecha_objetivo) if data.fecha_objetivo else None,
        )
        logger.info("Hito creado", extra={"plan_id": str(plan_id), "hito_id": str(hito.id)})
        return hito

    def completar_hito(self, hito_id: UUID) -> bool:
        """
        Marca un hito del plan de carrera como completado.

        Raises:
            AppError: HITO_NOT_FOUND (404) si el hito no existe.
        """
        ok = self._repo.completar_hito(str(hito_id))
        if not ok:
            raise AppError("Hito no encontrado", "HITO_NOT_FOUND", 404)
        logger.info("Hito completado", extra={"hito_id": str(hito_id)})
        return True

    def update_readiness(self, plan_id: UUID, readiness: int) -> PlanCarreraResponse:
        """
        Actualiza el readiness de un plan de carrera.

        Raises:
            AppError: PLAN_NOT_FOUND (404) si el plan no existe.
        """
        plan = self._repo.update_readiness(str(plan_id), readiness)
        logger.info("Readiness actualizado",
                    extra={"plan_id": str(plan_id), "readiness": readiness})
        return plan

    def get_analisis_posicion(self, area_id: UUID, posicion: str) -> list[EmpleadoAnalisisResponse]:
        """
        Retorna empleados del área ordenados por su score de assessment.
        Los empleados sin assessment aparecen al final con score None.
        """
        return self._repo.get_analisis_posicion(str(area_id))
