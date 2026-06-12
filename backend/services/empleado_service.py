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

    def create_empleado(self, data: EmpleadoCreate, created_by: str, empresa_id: UUID) -> EmpleadoResponse:
        """
        Crea un nuevo empleado en el sistema.

        Args:
            data: Datos del empleado a crear (validados por Pydantic).
            created_by: ID del usuario que realiza la operación (para trazabilidad).
            empresa_id: UUID de la empresa a la que pertenecerá el empleado (obligatorio).

        Returns:
            EmpleadoResponse con los datos del empleado creado, incluyendo su ID generado.
        """
        if data.legajo and self._repo.find_by_legajo(data.legajo, empresa_id):
            raise AppError("Ya existe un empleado con ese legajo en esta empresa", "LEGAJO_DUPLICADO", 409)
        empleado = self._repo.save(data, empresa_id)
        logger.info("Empleado creado", extra={"empleado_id": empleado.id, "created_by": created_by, "empresa_id": str(empresa_id)})
        return empleado

    def update_empleado(self, id: UUID, data: EmpleadoUpdate, empresa_id: Optional[UUID] = None) -> EmpleadoResponse:
        """
        Actualiza los datos de un empleado existente (actualización parcial).

        Args:
            id: UUID del empleado a actualizar.
            data: Campos a actualizar — solo los no-None se aplican.
            empresa_id: Si se provee, el UPDATE solo afecta empleados de esa empresa.

        Returns:
            EmpleadoResponse con los datos actualizados.

        Raises:
            AppError: EMPLEADO_NOT_FOUND (404) si el ID no existe o no pertenece a la empresa.
        """
        if data.legajo and empresa_id:
            existing = self._repo.find_by_legajo(data.legajo, empresa_id)
            if existing and existing.id != str(id):
                raise AppError("Ya existe un empleado con ese legajo en esta empresa", "LEGAJO_DUPLICADO", 409)
        empleado = self._repo.update(str(id), data, empresa_id)
        if not empleado:
            raise AppError("Empleado no encontrado", "EMPLEADO_NOT_FOUND", 404)
        logger.info("Empleado actualizado", extra={"empleado_id": str(id)})
        return empleado

    def deactivate_empleado(self, id: UUID, empresa_id: Optional[UUID] = None) -> bool:
        """
        Da de baja lógica al empleado (soft delete). No elimina el registro.

        Args:
            id: UUID del empleado a desactivar.
            empresa_id: Si se provee, el soft-delete solo afecta empleados de esa empresa.

        Returns:
            True si la operación fue exitosa.

        Raises:
            AppError: EMPLEADO_NOT_FOUND (404) si el ID no existe o no pertenece a la empresa.
        """
        if not self._repo.soft_delete(str(id), empresa_id):
            raise AppError("Empleado no encontrado", "EMPLEADO_NOT_FOUND", 404)
        logger.info("Empleado dado de baja", extra={"empleado_id": str(id)})
        return True

    def get_empleados(
        self,
        page: int,
        page_size: int,
        empresa_id: Optional[UUID] = None,
        area_id: Optional[str] = None,
        estado: Optional[str] = None,
        search: Optional[str] = None,
    ) -> EmpleadoListResponse:
        """
        Retorna la lista paginada de empleados con filtros opcionales.

        Args:
            page: Número de página (1-indexed).
            page_size: Cantidad de registros por página.
            empresa_id: Filtro por empresa. None = todas las empresas (vista consolidada).
            area_id: Filtro por ID de área (UUID como string).
            estado: Filtro por estado (activo | baja | licencia).
            search: Búsqueda por nombre o apellido (case-insensitive).

        Returns:
            EmpleadoListResponse con items, total y metadatos de paginación.
        """
        items, total = self._repo.find_all(page, page_size, empresa_id, area_id, estado, search)
        total_pages = math.ceil(total / page_size) if page_size > 0 else 0
        return EmpleadoListResponse(items=items, total=total, page=page, page_size=page_size, total_pages=total_pages)

    def update_empleado_por_dni(self, dni: str, empresa_id: UUID, data: EmpleadoUpdate, created_by: str) -> Optional[EmpleadoResponse]:
        """
        Busca el empleado por (empresa_id, dni) y aplica el UPDATE con los campos provistos.
        Retorna None si el DNI no existe en la empresa (puede ocurrir si se eliminó entre preview y confirmar).
        Usado exclusivamente por el flujo de importación CSV.
        """
        existente = self._repo.find_by_dni(dni, empresa_id)
        if not existente:
            return None
        actualizado = self._repo.update(existente.id, data, empresa_id)
        logger.info("Empleado actualizado vía importación CSV", extra={"dni": dni, "empresa_id": str(empresa_id), "created_by": created_by})
        return actualizado

    def get_empleado(self, id: UUID, empresa_id: Optional[UUID] = None) -> EmpleadoResponse:
        """
        Retorna el detalle completo de un empleado por ID.

        Args:
            id: UUID del empleado a consultar.
            empresa_id: Si se provee, valida que el empleado pertenezca a esa empresa.

        Returns:
            EmpleadoResponse con todos los campos del empleado.

        Raises:
            AppError: EMPLEADO_NOT_FOUND (404) si el ID no existe o no pertenece a la empresa.
        """
        empleado = self._repo.find_by_id(str(id), empresa_id)
        if not empleado:
            raise AppError("Empleado no encontrado", "EMPLEADO_NOT_FOUND", 404)
        return empleado
