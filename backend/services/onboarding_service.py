"""
Servicio de onboarding. Lógica de negocio del módulo de Onboarding.
Flujo: router → service → repository → DB
"""
from typing import Optional
from uuid import UUID

from repositories.onboarding_repo import OnboardingRepo
from schemas.onboarding import InstanciaDetalleResponse, InstanciaResponse
from utils.errors import AppError
from utils.logger import logger


class OnboardingService:
    def __init__(self, repo: Optional[OnboardingRepo] = None) -> None:
        self._repo = repo or OnboardingRepo()

    def get_onboardings_activos(self) -> list[InstanciaResponse]:
        """
        Retorna todos los onboardings activos (estado != completado/cancelado).

        Returns:
            Lista de InstanciaResponse con progreso calculado por empleado.
        """
        return self._repo.find_instancias_activas()

    def get_onboarding_empleado(self, empleado_id: UUID) -> InstanciaDetalleResponse:
        """
        Retorna el detalle completo del onboarding activo de un empleado, incluidas
        las tareas con su estado de completado, agrupables por semana.

        Args:
            empleado_id: UUID del empleado a consultar.

        Returns:
            InstanciaDetalleResponse con todas las tareas y su progreso.

        Raises:
            AppError: ONBOARDING_NOT_FOUND (404) si no hay onboarding activo para el empleado.
        """
        instancia = self._repo.find_instancia_by_empleado(str(empleado_id))
        if not instancia:
            raise AppError(
                "No hay onboarding activo para este empleado",
                "ONBOARDING_NOT_FOUND",
                404,
            )
        detalle = self._repo.get_progreso(str(instancia.id))
        if not detalle:
            raise AppError("Error al cargar el progreso del onboarding", "ONBOARDING_ERROR", 500)
        return detalle

    def iniciar_onboarding(self, empleado_id: UUID) -> InstanciaResponse:
        """
        Inicia el onboarding para un empleado usando el template activo por defecto.
        Crea la instancia y genera las filas de progreso para cada tarea del template.

        Args:
            empleado_id: UUID del empleado que inicia el onboarding.

        Returns:
            InstanciaResponse con el onboarding recién creado.

        Raises:
            AppError: ONBOARDING_ALREADY_ACTIVE (409) si el empleado ya tiene un onboarding activo.
            AppError: TEMPLATE_NOT_FOUND (404) si no hay template activo configurado.
        """
        existente = self._repo.find_instancia_by_empleado(str(empleado_id))
        if existente:
            raise AppError(
                "El empleado ya tiene un onboarding activo",
                "ONBOARDING_ALREADY_ACTIVE",
                409,
            )
        template = self._repo.get_default_template()
        if not template:
            raise AppError(
                "No hay template de onboarding activo configurado",
                "TEMPLATE_NOT_FOUND",
                404,
            )
        instancia = self._repo.create_instancia(str(empleado_id), str(template.id))
        logger.info(
            "Onboarding iniciado",
            extra={"empleado_id": str(empleado_id), "instancia_id": str(instancia.id)},
        )
        return instancia

    def completar_tarea(self, instancia_id: UUID, tarea_id: UUID) -> bool:
        """
        Marca una tarea de onboarding como completada.

        Args:
            instancia_id: UUID de la instancia de onboarding.
            tarea_id: UUID de la tarea a completar.

        Returns:
            True si la tarea fue marcada como completada.

        Raises:
            AppError: TAREA_NOT_FOUND (404) si la combinación instancia/tarea no existe.
        """
        ok = self._repo.completar_tarea(str(instancia_id), str(tarea_id))
        if not ok:
            raise AppError("Tarea no encontrada en esta instancia", "TAREA_NOT_FOUND", 404)
        logger.info(
            "Tarea de onboarding completada",
            extra={"instancia_id": str(instancia_id), "tarea_id": str(tarea_id)},
        )
        return True
