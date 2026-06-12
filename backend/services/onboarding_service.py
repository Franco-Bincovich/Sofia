"""
Servicio de onboarding. Lógica de negocio del módulo de Onboarding.
Flujo: router → service → repository → DB
"""
from typing import Optional
from uuid import UUID

from repositories.empleado_repo import EmpleadoRepo
from repositories.onboarding_repo import OnboardingRepo
from repositories.onboarding_templates_repo import OnboardingTemplatesRepo
from schemas.onboarding import InstanciaDetalleResponse, InstanciaResponse
from utils.errors import AppError
from utils.logger import logger


class OnboardingService:
    def __init__(
        self,
        repo: Optional[OnboardingRepo] = None,
        templates_repo: Optional[OnboardingTemplatesRepo] = None,
        empleado_repo: Optional[EmpleadoRepo] = None,
    ) -> None:
        self._repo = repo or OnboardingRepo()
        self._templates_repo = templates_repo or OnboardingTemplatesRepo()
        self._empleado_repo = empleado_repo or EmpleadoRepo()

    def get_onboardings_activos(self, empresa_id: Optional[UUID] = None) -> list[InstanciaResponse]:
        """
        Retorna todos los onboardings activos filtrados por empresa (None = todas).

        Returns:
            Lista de InstanciaResponse con progreso calculado por empleado.
        """
        return self._repo.find_instancias_activas(empresa_id)

    def get_onboarding_empleado(self, empleado_id: UUID, empresa_id: Optional[UUID] = None) -> InstanciaDetalleResponse:
        """
        Retorna el detalle completo del onboarding activo de un empleado, incluidas
        las tareas con su estado de completado, agrupables por semana.

        Args:
            empleado_id: UUID del empleado a consultar.
            empresa_id: filtro de empresa opcional (None = sin restricción).

        Returns:
            InstanciaDetalleResponse con todas las tareas y su progreso.

        Raises:
            AppError: ONBOARDING_NOT_FOUND (404) si no hay onboarding activo para el empleado.
        """
        instancia = self._repo.find_instancia_by_empleado(str(empleado_id), empresa_id)
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

    def iniciar_onboarding(
        self,
        empleado_id: UUID,
        template_id: Optional[UUID] = None,
    ) -> InstanciaResponse:
        """
        Inicia el onboarding para un empleado.
        Valida que el empleado y el template pertenezcan a la misma empresa.
        Si no se provee template_id, usa el template activo por defecto de la empresa del empleado.

        Args:
            empleado_id: UUID del empleado que inicia el onboarding.
            template_id: UUID del template a usar. Opcional; si None usa el por defecto.

        Returns:
            InstanciaResponse con el onboarding recién creado.

        Raises:
            AppError: ONBOARDING_ALREADY_ACTIVE (409) si el empleado ya tiene un onboarding activo.
            AppError: EMPLEADO_NOT_FOUND (404) si el empleado no existe.
            AppError: TEMPLATE_NOT_FOUND (404) si el template especificado o el por defecto no existe.
            AppError: EMPRESA_MISMATCH (422) si el empleado y el template son de distintas empresas.
        """
        existente = self._repo.find_instancia_by_empleado(str(empleado_id))
        if existente:
            raise AppError(
                "El empleado ya tiene un onboarding activo",
                "ONBOARDING_ALREADY_ACTIVE",
                409,
            )

        empleado = self._empleado_repo.find_by_id(str(empleado_id))
        if not empleado:
            raise AppError("Empleado no encontrado", "EMPLEADO_NOT_FOUND", 404)

        emp_empresa_uuid = UUID(empleado.empresa_id) if empleado.empresa_id else None

        if template_id:
            template = self._templates_repo.get_template(str(template_id))
            if not template:
                raise AppError("Template no encontrado", "TEMPLATE_NOT_FOUND", 404)
        else:
            template = self._repo.get_default_template(emp_empresa_uuid)
            if not template:
                raise AppError(
                    "No hay template de onboarding activo configurado para esta empresa",
                    "TEMPLATE_NOT_FOUND",
                    404,
                )

        if template.empresa_id and empleado.empresa_id and str(template.empresa_id) != empleado.empresa_id:
            raise AppError(
                "El empleado y el template deben pertenecer a la misma empresa",
                "EMPRESA_MISMATCH",
                422,
            )

        empresa_id_str = empleado.empresa_id or str(template.empresa_id or "")
        instancia = self._repo.create_instancia(str(empleado_id), str(template.id), empresa_id_str)
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
