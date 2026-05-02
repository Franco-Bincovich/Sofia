"""
Servicio de offboarding. Lógica de negocio del módulo de Offboarding.
Flujo: router → service → repository → DB
"""
from typing import Optional
from uuid import UUID

from repositories.offboarding_repo import OffboardingRepo
from schemas.offboarding import OffboardingCreate, OffboardingResponse
from utils.errors import AppError
from utils.logger import logger


class OffboardingService:
    def __init__(self, repo: Optional[OffboardingRepo] = None) -> None:
        self._repo = repo or OffboardingRepo()

    def get_offboardings_activos(self) -> list[OffboardingResponse]:
        """
        Retorna todos los offboardings activos (estado != completado/cancelado)
        con sus activos y el progreso de devolución calculado.

        Returns:
            Lista de OffboardingResponse ordenada por fecha de creación.
        """
        return self._repo.find_activos()

    def iniciar_offboarding(self, data: OffboardingCreate) -> OffboardingResponse:
        """
        Inicia el proceso de offboarding para un empleado.
        Crea la instancia y los activos corporativos por defecto a devolver.

        Args:
            data: Datos del offboarding — empleado_id, motivo y fecha_ultimo_dia opcional.

        Returns:
            OffboardingResponse con la instancia creada y activos por defecto.

        Raises:
            AppError: OFFBOARDING_ALREADY_ACTIVE (409) si el empleado ya tiene un offboarding activo.
        """
        existente = self._repo.find_by_empleado(str(data.empleado_id))
        if existente:
            raise AppError(
                "El empleado ya tiene un proceso de offboarding activo",
                "OFFBOARDING_ALREADY_ACTIVE",
                409,
            )
        offboarding = self._repo.create_offboarding(data)
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
