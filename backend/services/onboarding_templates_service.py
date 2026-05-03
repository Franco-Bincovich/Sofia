"""
Servicio de templates de onboarding.
Lógica de negocio para CRUD de templates y sus tareas configurables.
"""
from typing import Optional
from uuid import UUID

from repositories.onboarding_templates_repo import OnboardingTemplatesRepo
from schemas.onboarding import (
    TareaCreate, TareaResponse, TareaUpdate,
    TemplateCreate, TemplateResponse, TemplateUpdate,
)
from utils.errors import AppError
from utils.logger import logger


class OnboardingTemplatesService:
    def __init__(self, repo: Optional[OnboardingTemplatesRepo] = None) -> None:
        self._repo = repo or OnboardingTemplatesRepo()

    def get_templates(self) -> list[TemplateResponse]:
        """Retorna todos los templates activos con conteo de tareas."""
        return self._repo.get_templates()

    def get_template(self, template_id: UUID) -> TemplateResponse:
        """
        Retorna el detalle de un template con sus tareas ordenadas por semana.

        Raises:
            AppError: TEMPLATE_NOT_FOUND (404) si no existe o está inactivo.
        """
        tmpl = self._repo.get_template(str(template_id))
        if not tmpl:
            raise AppError("Template no encontrado", "TEMPLATE_NOT_FOUND", 404)
        return tmpl

    def create_template(self, data: TemplateCreate) -> TemplateResponse:
        """
        Crea un nuevo template de onboarding.

        Returns:
            TemplateResponse del template recién creado.
        """
        tmpl = self._repo.create_template(data.nombre, data.descripcion)
        logger.info("Template creado", extra={"template_id": str(tmpl.id)})
        return tmpl

    def update_template(self, template_id: UUID, data: TemplateUpdate) -> TemplateResponse:
        """
        Actualiza nombre y/o descripción del template.

        Raises:
            AppError: TEMPLATE_NOT_FOUND (404) si no existe.
        """
        payload = {k: v for k, v in data.model_dump().items() if v is not None}
        if not payload:
            return self.get_template(template_id)
        tmpl = self._repo.update_template(str(template_id), payload)
        if not tmpl:
            raise AppError("Template no encontrado", "TEMPLATE_NOT_FOUND", 404)
        logger.info("Template actualizado", extra={"template_id": str(template_id)})
        return tmpl

    def delete_template(self, template_id: UUID) -> bool:
        """
        Elimina el template. Soft delete si tiene instancias asociadas.

        Returns:
            True siempre (la operación se considera exitosa).
        """
        self._repo.delete_template(str(template_id))
        logger.info("Template eliminado", extra={"template_id": str(template_id)})
        return True

    def add_tarea(self, template_id: UUID, data: TareaCreate) -> TareaResponse:
        """
        Agrega una tarea a un template existente.

        Raises:
            AppError: TEMPLATE_NOT_FOUND (404) si el template no existe.
        """
        if not self._repo.get_template(str(template_id)):
            raise AppError("Template no encontrado", "TEMPLATE_NOT_FOUND", 404)
        tarea = self._repo.add_tarea(str(template_id), data.model_dump())
        logger.info("Tarea agregada al template", extra={"template_id": str(template_id), "tarea_id": str(tarea.id)})
        return tarea

    def update_tarea(self, template_id: UUID, tarea_id: UUID, data: TareaUpdate) -> TareaResponse:
        """
        Actualiza campos de una tarea del template.

        Raises:
            AppError: TAREA_NOT_FOUND (404) si la tarea no existe.
        """
        tarea = self._repo.update_tarea(str(tarea_id), data.model_dump(exclude_none=True))
        if not tarea:
            raise AppError("Tarea no encontrada", "TAREA_NOT_FOUND", 404)
        return tarea

    def delete_tarea(self, template_id: UUID, tarea_id: UUID) -> bool:
        """
        Elimina una tarea del template.

        Returns:
            True siempre.
        """
        self._repo.delete_tarea(str(tarea_id))
        logger.info("Tarea eliminada", extra={"template_id": str(template_id), "tarea_id": str(tarea_id)})
        return True
