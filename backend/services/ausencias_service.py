"""
Servicio de ausencias. Lógica de negocio del módulo de Ausencias.
Flujo: router → service → repository → DB

Reglas de negocio:
  - empresa_id se hereda del empleado al crear (no lo provee el usuario).
  - dias = (fecha_hasta - fecha_desde).days + 1 (extremos incluidos).
  - NO se valida solapamiento de fechas (a diferencia de vacaciones).
  - tipos_ausencia son globales: no pertenecen a ninguna empresa.
"""
from typing import Optional
from uuid import UUID

from repositories.ausencias_repo import AusenciasRepo
from schemas.ausencias import (
    AusenciaCreate, AusenciaListResponse, AusenciaResponse, AusenciaUpdate,
)
from services._audit_payloads import (
    payload_alta_ausencia, payload_baja_ausencia, payload_update_ausencia,
)
from services.audit_service import AuditService
from services.export import Descarga, build_export
from utils.errors import AppError
from utils.logger import logger


class AusenciasService:
    def __init__(self, repo: Optional[AusenciasRepo] = None, audit: Optional[AuditService] = None) -> None:
        self._repo = repo or AusenciasRepo()
        self._audit = audit or AuditService()

    def get_all(self, empresa_id: Optional[UUID] = None, area_id: Optional[UUID] = None, tipo_id: Optional[UUID] = None, page: int = 1, page_size: int = 20) -> AusenciaListResponse:
        """
        Retorna una página de ausencias filtradas opcionalmente por empresa, área y/o tipo.

        Args:
            empresa_id: None = vista consolidada (todas las empresas).
        """
        rows, total = self._repo.find_all(empresa_id, area_id, tipo_id, page, page_size)
        return AusenciaListResponse(items=rows, total=total)

    def exportar(self, empresa_id: Optional[UUID] = None, formato: str = "excel") -> Descarga:
        """Exporta la lista completa de ausencias al formato pedido vía el motor genérico."""
        items = [i.model_dump(mode="json") for i in self.get_all(empresa_id, None, None, 1, 100000).items]
        return build_export(nombre="Ausencias", datos={"Ausencias": items}, filename_base="ausencias", formato=formato)

    def get_by_id(self, id: UUID, empresa_id: Optional[UUID] = None) -> AusenciaResponse:
        """
        Retorna el detalle de una ausencia.

        Raises:
            AppError: AUSENCIA_NOT_FOUND (404) si no existe o no pertenece a la empresa.
        """
        row = self._repo.find_by_id(str(id), empresa_id)
        if not row:
            raise AppError("Ausencia no encontrada", "AUSENCIA_NOT_FOUND", 404)
        return row

    def create(self, data: AusenciaCreate, created_by: str) -> AusenciaResponse:
        """
        Registra una ausencia. empresa_id se resuelve del empleado.

        Args:
            data: Campos del formulario (sin empresa_id — se hereda del empleado).
            created_by: ID del operador que registra (trazabilidad).

        Raises:
            AppError: EMPLEADO_NOT_FOUND (404) si el empleado no existe.
        """
        empresa_id = self._repo.find_empresa_for_empleado(str(data.empleado_id))
        if not empresa_id:
            raise AppError("Empleado no encontrado", "EMPLEADO_NOT_FOUND", 404)
        dias = (data.fecha_hasta - data.fecha_desde).days + 1
        row = self._repo.save(
            str(data.empleado_id), empresa_id, str(data.tipo_id),
            data.fecha_desde, data.fecha_hasta, dias, data.justificada, data.motivo,
        )
        self._audit.registrar(**payload_alta_ausencia(row, created_by, row.empresa_id))
        logger.info("Ausencia registrada", extra={"ausencia_id": row.id, "empleado_id": str(data.empleado_id), "created_by": created_by})
        return row

    def update(self, id: UUID, data: AusenciaUpdate, empresa_id: Optional[UUID] = None, usuario_id: Optional[str] = None) -> AusenciaResponse:
        """
        Actualiza una ausencia. Recalcula dias si cambian las fechas.
        Registra el evento de auditoría con el diff antes/después (usuario_id = operador).

        Raises:
            AppError: AUSENCIA_NOT_FOUND (404) si no existe.
        """
        existing = self._repo.find_by_id(str(id), empresa_id)
        if not existing:
            raise AppError("Ausencia no encontrada", "AUSENCIA_NOT_FOUND", 404)
        payload: dict = {}
        if data.tipo_id is not None:
            payload["tipo_id"] = str(data.tipo_id)
        if data.fecha_desde is not None:
            payload["fecha_desde"] = str(data.fecha_desde)
        if data.fecha_hasta is not None:
            payload["fecha_hasta"] = str(data.fecha_hasta)
        if data.fecha_desde is not None or data.fecha_hasta is not None:
            fd = data.fecha_desde or existing.fecha_desde
            fh = data.fecha_hasta or existing.fecha_hasta
            payload["dias"] = (fh - fd).days + 1
        if data.justificada is not None:
            payload["justificada"] = data.justificada
        if data.motivo is not None:
            payload["motivo"] = data.motivo or None
        updated = self._repo.update(str(id), empresa_id, payload)
        if not updated:
            raise AppError("Ausencia no encontrada", "AUSENCIA_NOT_FOUND", 404)
        self._audit.registrar(**payload_update_ausencia(existing, updated, usuario_id, existing.empresa_id))
        logger.info("Ausencia actualizada", extra={"ausencia_id": str(id)})
        return updated

    def delete(self, id: UUID, empresa_id: Optional[UUID] = None, usuario_id: Optional[str] = None) -> None:
        """
        Elimina una ausencia permanentemente.
        Lee el estado anterior antes de borrar para registrar el evento de auditoría.

        Raises:
            AppError: AUSENCIA_NOT_FOUND (404) si no existe.
        """
        prior = self._repo.find_by_id(str(id), empresa_id)
        if not self._repo.delete(str(id), empresa_id):
            raise AppError("Ausencia no encontrada", "AUSENCIA_NOT_FOUND", 404)
        if prior:
            self._audit.registrar(**payload_baja_ausencia(prior, usuario_id, prior.empresa_id))
        logger.info("Ausencia eliminada", extra={"ausencia_id": str(id)})
