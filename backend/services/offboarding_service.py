"""
Servicio de offboarding. Lógica de negocio del módulo de Offboarding.
Flujo: router → service → repository → DB
"""
from typing import Optional
from uuid import UUID

from repositories.empleado_repo import EmpleadoRepo
from repositories.offboarding_repo import OffboardingRepo
from schemas.offboarding import OffboardingCreate, OffboardingResponse
from utils.errors import AppError
from utils.logger import logger


class OffboardingService:
    def __init__(
        self,
        repo: Optional[OffboardingRepo] = None,
        empleado_repo: Optional[EmpleadoRepo] = None,
    ) -> None:
        self._repo = repo or OffboardingRepo()
        self._empleado_repo = empleado_repo or EmpleadoRepo()

    def get_offboardings_activos(self, empresa_id: Optional[UUID] = None) -> list[OffboardingResponse]:
        """
        Retorna todos los offboardings activos filtrados por empresa (None = todas)
        con sus activos y el progreso de devolución calculado.

        Returns:
            Lista de OffboardingResponse ordenada por fecha de creación.
        """
        return self._repo.find_activos(empresa_id)

    def iniciar_offboarding(self, data: OffboardingCreate, empresa_id: Optional[UUID] = None) -> OffboardingResponse:
        """
        Inicia el proceso de offboarding para un empleado.
        La empresa se hereda del empleado; empresa_id del header es ignorado (la empresa
        es un dato del empleado, no del contexto de sesión).
        Crea la instancia y los activos corporativos por defecto a devolver.

        Args:
            data: Datos del offboarding — empleado_id, motivo y fecha_ultimo_dia opcional.
            empresa_id: empresa del contexto (no usada directamente; la empresa se deriva del empleado).

        Returns:
            OffboardingResponse con la instancia creada y activos por defecto.

        Raises:
            AppError: EMPLEADO_NOT_FOUND (404) si el empleado no existe.
            AppError: OFFBOARDING_ALREADY_ACTIVE (409) si el empleado ya tiene un offboarding activo.
        """
        empleado = self._empleado_repo.find_by_id(str(data.empleado_id))
        if not empleado:
            raise AppError("Empleado no encontrado", "EMPLEADO_NOT_FOUND", 404)

        existente = self._repo.find_by_empleado(str(data.empleado_id))
        if existente:
            raise AppError(
                "El empleado ya tiene un proceso de offboarding activo",
                "OFFBOARDING_ALREADY_ACTIVE",
                409,
            )

        empresa_id_str = empleado.empresa_id or ""
        offboarding = self._repo.create_offboarding(data, empresa_id_str)
        logger.info(
            "Offboarding iniciado",
            extra={
                "empleado_id": str(data.empleado_id),
                "motivo": data.motivo,
                "instancia_id": str(offboarding.id),
            },
        )
        return offboarding

    def marcar_activo_devuelto(
        self, instancia_id: UUID, activo_id: UUID, devuelto: bool
    ) -> bool:
        """
        Actualiza el estado de devolución de un activo corporativo en el offboarding.

        Args:
            instancia_id: UUID de la instancia de offboarding.
            activo_id: UUID del activo a actualizar.
            devuelto: True para marcar como devuelto, False para revertir a pendiente.

        Returns:
            True si la actualización fue exitosa.

        Raises:
            AppError: ACTIVO_NOT_FOUND (404) si el activo no pertenece a la instancia.
        """
        ok = self._repo.update_activo(str(instancia_id), str(activo_id), devuelto)
        if not ok:
            raise AppError(
                "Activo no encontrado en esta instancia",
                "ACTIVO_NOT_FOUND",
                404,
            )
        logger.info(
            "Activo de offboarding actualizado",
            extra={
                "instancia_id": str(instancia_id),
                "activo_id": str(activo_id),
                "devuelto": devuelto,
            },
        )
        return True
