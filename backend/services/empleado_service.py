"""
Servicio de empleados. Lógica de negocio del módulo de Empleados.
Flujo: router → service → repository → DB
"""
import math
from typing import Optional
from uuid import UUID

from repositories.empleado_repo import EmpleadoRepo
from schemas.empleado import (
    EmpleadoCreate,
    EmpleadoListResponse,
    EmpleadoResponse,
    EmpleadoUpdate,
)
from utils.errors import AppError
from utils.logger import logger


class EmpleadoService:
    def __init__(self, repo: Optional[EmpleadoRepo] = None) -> None:
        self._repo = repo or EmpleadoRepo()

    def create_empleado(self, data: EmpleadoCreate, created_by: str) -> EmpleadoResponse:
        """
        Crea un nuevo empleado en el sistema.

        Args:
            data: Datos del empleado a crear (validados por Pydantic).
            created_by: ID del usuario que realiza la operación (para trazabilidad).

        Returns:
            EmpleadoResponse con los datos del empleado creado, incluyendo su ID generado.
        """
        empleado = self._repo.save(data)
        logger.info("Empleado creado", extra={"empleado_id": empleado.id, "created_by": created_by})
        return empleado

    def update_empleado(self, id: UUID, data: EmpleadoUpdate) -> EmpleadoResponse:
        """
        Actualiza los datos de un empleado existente (actualización parcial).

        Args:
            id: UUID del empleado a actualizar.
            data: Campos a actualizar — solo los no-None se aplican.

        Returns:
            EmpleadoResponse con los datos actualizados.

        Raises:
            AppError: EMPLEADO_NOT_FOUND (404) si el ID no existe.
        """
        empleado = self._repo.update(str(id), data)
        if not empleado:
            raise AppError("Empleado no encontrado", "EMPLEADO_NOT_FOUND", 404)
        logger.info("Empleado actualizado", extra={"empleado_id": str(id)})
        return empleado

    def deactivate_empleado(self, id: UUID) -> bool:
        """
        Da de baja lógica al empleado (soft delete). No elimina el registro.

        Args:
            id: UUID del empleado a desactivar.

        Returns:
            True si la operación fue exitosa.

        Raises:
            AppError: EMPLEADO_NOT_FOUND (404) si el ID no existe.
        """
        if not self._repo.soft_delete(str(id)):
            raise AppError("Empleado no encontrado", "EMPLEADO_NOT_FOUND", 404)
        logger.info("Empleado dado de baja", extra={"empleado_id": str(id)})
        return True

    def get_empleados(
        self,
        page: int,
        page_size: int,
        area_id: Optional[str] = None,
        estado: Optional[str] = None,
        search: Optional[str] = None,
    ) -> EmpleadoListResponse:
        """
        Retorna la lista paginada de empleados con filtros opcionales.

        Args:
            page: Número de página (1-indexed).
            page_size: Cantidad de registros por página.
            area_id: Filtro por ID de área (UUID como string).
            estado: Filtro por estado (activo | baja | licencia).
            search: Búsqueda por nombre o apellido (case-insensitive).

        Returns:
            EmpleadoListResponse con items, total y metadatos de paginación.
        """
        items, total = self._repo.find_all(page, page_size, area_id, estado, search)
        total_pages = math.ceil(total / page_size) if page_size > 0 else 0
        return EmpleadoListResponse(items=items, total=total, page=page, page_size=page_size, total_pages=total_pages)

    def get_empleado(self, id: UUID) -> EmpleadoResponse:
        """
        Retorna el detalle completo de un empleado por ID.

        Args:
            id: UUID del empleado a consultar.

        Returns:
            EmpleadoResponse con todos los campos del empleado.

        Raises:
            AppError: EMPLEADO_NOT_FOUND (404) si el ID no existe.
        """
        empleado = self._repo.find_by_id(str(id))
        if not empleado:
            raise AppError("Empleado no encontrado", "EMPLEADO_NOT_FOUND", 404)
        return empleado
