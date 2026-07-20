"""
Servicio de sucesión y planes de carrera. Lógica de negocio del módulo.
Flujo: router → service → repository → DB
"""
from typing import Optional
from uuid import UUID

from repositories.empleado_repo import EmpleadoRepo
from repositories.planes_carrera_repo import PlanesCarreraRepo
from repositories.sucesion_repo import SucesionRepo
from schemas.sucesion import (
    EmpleadoAnalisisResponse, EmpleadoMapaResponse,
    HitoBodyCreate, HitoResponse,
    PlanCarreraCreate, PlanCarreraResponse,
)
from utils.errors import AppError
from utils.logger import logger


class SucesionService:
    def __init__(
        self,
        repo: Optional[SucesionRepo] = None,
        planes_repo: Optional[PlanesCarreraRepo] = None,
        empleado_repo: Optional[EmpleadoRepo] = None,
    ) -> None:
        self._repo = repo or SucesionRepo()
        self._planes_repo = planes_repo or PlanesCarreraRepo()
        self._empleado_repo = empleado_repo or EmpleadoRepo()

    def get_mapa_talento(self, empresa_id: Optional[UUID] = None) -> list[EmpleadoMapaResponse]:
        """
        Retorna todos los empleados activos con su potencial y desempeño
        para posicionarlos en el mapa 9-Box, filtrado por empresa.
        """
        return self._repo.get_mapa_talento(empresa_id)

    def get_planes_carrera(self, empresa_id: Optional[UUID] = None) -> list[PlanCarreraResponse]:
        """
        Retorna todos los planes de carrera activos filtrados por empresa (None = todas).
        """
        return self._planes_repo.get_planes_carrera(empresa_id)

    def create_plan_carrera(self, data: PlanCarreraCreate) -> PlanCarreraResponse:
        """
        Crea un nuevo plan de carrera para un empleado.
        La empresa se hereda del empleado — no se pide explícitamente.
        Valida que el empleado no tenga ya un plan activo antes de crear.

        Raises:
            AppError: EMPLEADO_NOT_FOUND (404) si el empleado no existe.
            AppError: PLAN_ALREADY_EXISTS (409) si el empleado ya tiene un plan activo.
        """
        empleado = self._empleado_repo.find_by_id(str(data.empleado_id))
        if not empleado:
            raise AppError("Empleado no encontrado", "EMPLEADO_NOT_FOUND", 404)
        existente = self._planes_repo.get_plan_by_empleado(str(data.empleado_id))
        if existente:
            raise AppError(
                "El empleado ya tiene un plan de carrera activo",
                "PLAN_ALREADY_EXISTS",
                409,
            )
        empresa_id_str = empleado.empresa_id or ""
        plan = self._planes_repo.create_plan(data, empresa_id_str)
        logger.info("Plan de carrera creado",
                    extra={"empleado_id": str(data.empleado_id), "plan_id": str(plan.id)})
        return plan

    def get_hitos(self, plan_id: UUID) -> list[HitoResponse]:
        """
        Retorna todos los hitos de un plan de carrera ordenados por creación.
        """
        return self._planes_repo.get_hitos(str(plan_id))

    def create_hito(self, plan_id: UUID, data: HitoBodyCreate) -> HitoResponse:
        """
        Crea un nuevo hito dentro de un plan de carrera.
        La empresa se hereda del plan (que la heredó del empleado).

        Args:
            plan_id: UUID del plan al que pertenece el hito.
            data: HitoBodyCreate con título, descripción y fecha objetivo opcionales.

        Returns:
            HitoResponse con el hito recién creado.
        """
        plan = self._planes_repo.get_plan_by_id(str(plan_id))
        empresa_id_str = str(plan.empresa_id) if plan and plan.empresa_id else ""
        hito = self._planes_repo.create_hito(
            str(plan_id), data.titulo, data.descripcion,
            str(data.fecha_objetivo) if data.fecha_objetivo else None,
            empresa_id_str,
        )
        logger.info("Hito creado", extra={"plan_id": str(plan_id), "hito_id": str(hito.id)})
        return hito

    def completar_hito(self, hito_id: UUID) -> bool:
        """
        Marca un hito del plan de carrera como completado.

        Raises:
            AppError: HITO_NOT_FOUND (404) si el hito no existe.
        """
        ok = self._planes_repo.completar_hito(str(hito_id))
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
        plan = self._planes_repo.update_readiness(str(plan_id), readiness)
        logger.info("Readiness actualizado",
                    extra={"plan_id": str(plan_id), "readiness": readiness})
        return plan

    def get_analisis_posicion(self, area_id: UUID, empresa_id: Optional[UUID] = None) -> list[EmpleadoAnalisisResponse]:
        """
        Retorna empleados del área ordenados por su score de assessment.
        Los empleados sin assessment aparecen al final con score None.
        """
        return self._repo.get_analisis_posicion(str(area_id), empresa_id)
