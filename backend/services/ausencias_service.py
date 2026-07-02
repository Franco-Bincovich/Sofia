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
from repositories.empleado_ownership_repo import EmpleadoOwnershipRepo
from repositories.periodo_repo import PeriodoRepo
from schemas.ausencias import (
    AusenciaCreate, AusenciaListResponse, AusenciaResponse, AusenciaUpdate,
)
from services._audit_payloads import (
    payload_alta_ausencia, payload_baja_ausencia, payload_update_ausencia,
)
from services._ownership_filter import resolver_filtro_empleados
from services._periodo_utils import verificar_periodo_abierto
from services.audit_service import AuditService
from services.ownership import puede_gestionar_empleado
from services.export import Descarga, build_export
from utils.errors import AppError
from utils.logger import logger


class AusenciasService:
    def __init__(self, repo: Optional[AusenciasRepo] = None, audit: Optional[AuditService] = None, periodo_repo: Optional[PeriodoRepo] = None, ownership_repo: Optional[EmpleadoOwnershipRepo] = None) -> None:
        self._repo = repo or AusenciasRepo()
        self._audit = audit or AuditService()
        self._periodos = periodo_repo or PeriodoRepo()
        self._ownership = ownership_repo or EmpleadoOwnershipRepo()

    def get_all(self, user_id: str, rol: str, empresa_id: Optional[UUID] = None, area_id: Optional[UUID] = None, tipo_id: Optional[UUID] = None, page: int = 1, page_size: int = 20) -> AusenciaListResponse:
        """Página de ausencias filtrada por empresa/área/tipo y por ownership. vacio → devuelve vacío sin consultar."""
        empleado_ids, vacio = resolver_filtro_empleados(user_id, rol, empresa_id, area_id, self._ownership)
        rows, total = ([], 0) if vacio else self._repo.find_all(empresa_id, empleado_ids, tipo_id, page, page_size)
        return AusenciaListResponse(items=rows, total=total)

    def exportar(self, user_id: str, rol: str, empresa_id: Optional[UUID] = None, formato: str = "excel") -> Descarga:
        """Exporta la lista de ausencias respetando ownership, al formato pedido vía el motor genérico."""
        items = [i.model_dump(mode="json") for i in self.get_all(user_id, rol, empresa_id, None, None, 1, 100000).items]
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

    def create(self, data: AusenciaCreate, created_by: str, rol: Optional[str] = None) -> AusenciaResponse:
        """
        Registra una ausencia. empresa_id se resuelve del empleado.

        Ownership: se valida ANTES de resolver la empresa (403 uniforme para un mando que
        intenta crear a nombre de un empleado que no es su subordinado).

        Args:
            data: Campos del formulario (sin empresa_id — se hereda del empleado).
            created_by: ID del operador que registra (trazabilidad y sujeto del ownership).
            rol: Rol del operador (para el chequeo de ownership).

        Raises:
            AppError: OWNERSHIP_DENIED (403) si el rol no puede gestionar a ese empleado.
            AppError: EMPLEADO_NOT_FOUND (404) si el empleado no existe.
        """
        if not puede_gestionar_empleado(created_by, rol, data.empleado_id, self._ownership):
            raise AppError("No autorizado para gestionar este empleado", "OWNERSHIP_DENIED", 403)
        empresa_id = self._repo.find_empresa_for_empleado(str(data.empleado_id))
        if not empresa_id:
            raise AppError("Empleado no encontrado", "EMPLEADO_NOT_FOUND", 404)
        verificar_periodo_abierto(empresa_id, "ausencias", desde=data.fecha_desde, hasta=data.fecha_hasta, repo=self._periodos)
        dias = (data.fecha_hasta - data.fecha_desde).days + 1
        row = self._repo.save(
            str(data.empleado_id), empresa_id, str(data.tipo_id),
            data.fecha_desde, data.fecha_hasta, dias, data.justificada, data.motivo,
        )
        self._audit.registrar(**payload_alta_ausencia(row, created_by, row.empresa_id))
        logger.info("Ausencia registrada", extra={"ausencia_id": row.id, "empleado_id": str(data.empleado_id), "created_by": created_by})
        return row

    def update(self, id: UUID, data: AusenciaUpdate, empresa_id: Optional[UUID] = None, usuario_id: Optional[str] = None, rol: Optional[str] = None) -> AusenciaResponse:
        """
        Actualiza una ausencia. Recalcula dias si cambian las fechas.
        Registra el evento de auditoría con el diff antes/después (usuario_id = operador).

        Ownership: un registro ajeno a un mando responde 404 (igual que inexistente).

        Raises:
            AppError: AUSENCIA_NOT_FOUND (404) si no existe o no es gestionable por el rol.
        """
        existing = self._repo.find_by_id(str(id), empresa_id)
        if not existing or not puede_gestionar_empleado(usuario_id, rol, existing.empleado_id, self._ownership):
            raise AppError("Ausencia no encontrada", "AUSENCIA_NOT_FOUND", 404)
        # Bloqueo por período: no se puede sacar de un período cerrado (fechas viejas) ni meter en uno (nuevas).
        verificar_periodo_abierto(existing.empresa_id, "ausencias", desde=existing.fecha_desde, hasta=existing.fecha_hasta, repo=self._periodos)
        verificar_periodo_abierto(existing.empresa_id, "ausencias", desde=data.fecha_desde or existing.fecha_desde, hasta=data.fecha_hasta or existing.fecha_hasta, repo=self._periodos)
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

    def delete(self, id: UUID, empresa_id: Optional[UUID] = None, usuario_id: Optional[str] = None, rol: Optional[str] = None) -> None:
        """
        Elimina una ausencia permanentemente.
        Lee la fila ANTES de borrar: para el ownership, el 404 de inexistente y para el audit.

        Ownership: un registro ajeno a un mando responde 404 (igual que inexistente) y NO se borra.

        Raises:
            AppError: AUSENCIA_NOT_FOUND (404) si no existe o no es gestionable por el rol.
        """
        prior = self._repo.find_by_id(str(id), empresa_id)
        if not prior or not puede_gestionar_empleado(usuario_id, rol, prior.empleado_id, self._ownership):
            raise AppError("Ausencia no encontrada", "AUSENCIA_NOT_FOUND", 404)
        verificar_periodo_abierto(prior.empresa_id, "ausencias", desde=prior.fecha_desde, hasta=prior.fecha_hasta, repo=self._periodos)
        if not self._repo.delete(str(id), empresa_id):
            raise AppError("Ausencia no encontrada", "AUSENCIA_NOT_FOUND", 404)
        self._audit.registrar(**payload_baja_ausencia(prior, usuario_id, prior.empresa_id))
        logger.info("Ausencia eliminada", extra={"ausencia_id": str(id)})
