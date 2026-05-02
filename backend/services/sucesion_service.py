"""
Servicio de sucesión y planes de carrera. Lógica de negocio del módulo.
Flujo: router → service → repository → DB
"""
from typing import Optional
from uuid import UUID

from repositories.sucesion_repo import SucesionRepo
from schemas.sucesion import EmpleadoMapaResponse, PlanCarreraCreate, PlanCarreraResponse
from utils.errors import AppError
from utils.logger import logger


class SucesionService:
    def __init__(self, repo: Optional[SucesionRepo] = None) -> None:
        self._repo = repo or SucesionRepo()

    def get_mapa_talento(self) -> list[EmpleadoMapaResponse]:
        """
        Retorna todos los empleados activos con su potencial y desempeño
        para posicionarlos en el mapa 9-Box.

        Returns:
            Lista de EmpleadoMapaResponse con campos potencial y desempeno
            para calcular fila/columna en el 9-Box del frontend.
        """
        return self._repo.get_mapa_talento()

    def get_planes_carrera(self) -> list[PlanCarreraResponse]:
        """
        Retorna todos los planes de carrera activos con conteo de hitos.

        Returns:
            Lista de PlanCarreraResponse incluyendo hitos_completados e hitos_total
            calculados a partir de los hitos registrados en cada plan.
        """
        return self._repo.get_planes_carrera()

    def create_plan_carrera(self, data: PlanCarreraCreate) -> PlanCarreraResponse:
        """
        Crea un nuevo plan de carrera para un empleado.
        Valida que el empleado no tenga ya un plan activo antes de crear.

        Args:
            data: PlanCarreraCreate con empleado_id, cargo_objetivo, readiness y fecha_objetivo.

        Returns:
            PlanCarreraResponse con el plan recién creado y sus hitos (vacíos al inicio).

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
        logger.info(
            "Plan de carrera creado",
            extra={"empleado_id": str(data.empleado_id), "plan_id": str(plan.id)},
        )
        return plan

    def completar_hito(self, hito_id: UUID) -> bool:
        """
        Marca un hito del plan de carrera como completado.

        Args:
            hito_id: UUID del hito a completar.

        Returns:
            True si el hito fue marcado como completado.

        Raises:
            AppError: HITO_NOT_FOUND (404) si el hito no existe.
        """
        ok = self._repo.completar_hito(str(hito_id))
        if not ok:
            raise AppError("Hito no encontrado", "HITO_NOT_FOUND", 404)
        logger.info("Hito de plan de carrera completado", extra={"hito_id": str(hito_id)})
        return True
