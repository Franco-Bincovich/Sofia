"""
Servicio de vacaciones. Lógica de negocio del módulo de Vacaciones.
Flujo: router → service → repository → DB

Reglas de negocio:
  - empresa_id se hereda del empleado (no lo provee el usuario).
  - dias = (fecha_hasta - fecha_desde).days + 1  (días corridos, extremos incluidos).
  - Solapamiento: solo entre solicitudes del MISMO empleado y MISMO tipo.
    Tipos distintos pueden coexistir en las mismas fechas.
  - Estado derivado: cancelada > planificada (futuro) > tomada (presente o pasado).
  - Saldo: solo el tipo 'vacaciones' descuenta (gozados + pedidos). Los demás tipos son adicionales.
"""
from datetime import date
from typing import Optional
from uuid import UUID

from repositories.empleado_ownership_repo import EmpleadoOwnershipRepo
from repositories.periodo_repo import PeriodoRepo
from repositories.vacaciones_repo import VacacionesRepo
from schemas.vacaciones import (
    SaldoVacacionesResponse, SolicitudVacacionesCreate,
    SolicitudVacacionesListResponse, SolicitudVacacionesResponse,
)
from services._audit_payloads import payload_cancelacion_vacacion
from services._periodo_utils import verificar_periodo_abierto
from services._vacaciones_export import construir_filas_export, resolver_empleado_ids
from services._vacaciones_utils import derive_estado
from services.audit_service import AuditService
from services.export import Descarga, build_export
from utils.errors import AppError
from utils.logger import logger


class VacacionesService:
    def __init__(self, repo: Optional[VacacionesRepo] = None, audit: Optional[AuditService] = None, periodo_repo: Optional[PeriodoRepo] = None, ownership_repo: Optional[EmpleadoOwnershipRepo] = None) -> None:
        self._repo = repo or VacacionesRepo()
        self._audit = audit or AuditService()
        self._periodos = periodo_repo or PeriodoRepo()
        self._ownership = ownership_repo or EmpleadoOwnershipRepo()

    def get_all(self, user_id: str, rol: str, empresa_id: Optional[UUID] = None, area_id: Optional[UUID] = None, empleado_id: Optional[UUID] = None, page: int = 1, page_size: int = 20) -> SolicitudVacacionesListResponse:
        """Página de solicitudes (estado derivado) filtrada por empresa/área/empleado y ownership. vacio → devuelve vacío sin consultar."""
        empleado_ids, vacio = resolver_empleado_ids(user_id, rol, empresa_id, area_id, empleado_id, self._ownership)
        rows, total = ([], 0) if vacio else self._repo.find_all(empresa_id, empleado_ids, page, page_size)
        return SolicitudVacacionesListResponse(items=[derive_estado(r, date.today()) for r in rows], total=total)

    def exportar(self, user_id: str, rol: str, empresa_id: Optional[UUID] = None, formato: str = "excel", area_id: Optional[UUID] = None, empleado_id: Optional[UUID] = None) -> Descarga:
        """Exporta vacaciones (columnas legibles, sin UUIDs) respetando ownership; acotable por área/empleado."""
        filas = construir_filas_export(self.get_all(user_id, rol, empresa_id, area_id, empleado_id, 1, 100000).items)
        return build_export(nombre="Vacaciones", datos={"Vacaciones": filas}, filename_base="vacaciones", formato=formato)

    def get_by_empleado(self, empleado_id: UUID) -> SolicitudVacacionesListResponse:
        """Retorna las vacaciones (no canceladas) de un empleado, con estado derivado."""
        today = date.today()
        items = [derive_estado(r, today) for r in self._repo.find_vacaciones_empleado(str(empleado_id))]
        return SolicitudVacacionesListResponse(items=items, total=len(items))

    def get_by_id(self, id: UUID, empresa_id: Optional[UUID] = None) -> SolicitudVacacionesResponse:
        """Retorna el detalle de una solicitud. Raises VACACION_NOT_FOUND (404) si no existe."""
        row = self._repo.find_by_id(str(id), empresa_id)
        if not row:
            raise AppError("Solicitud de vacaciones no encontrada", "VACACION_NOT_FOUND", 404)
        return derive_estado(row, date.today())

    def create(self, data: SolicitudVacacionesCreate, created_by: str) -> SolicitudVacacionesResponse:
        """
        Registra un período de vacaciones para un empleado.
        empresa_id se resuelve del empleado — no lo provee el usuario.

        Args:
            data: Campos del formulario (empleado_id, fecha_desde, fecha_hasta, tipo, comentario).
            created_by: ID del operador que registra (trazabilidad).

        Raises:
            AppError: EMPLEADO_NOT_FOUND (404) si el empleado no existe.
            AppError: VACACIONES_SOLAPAMIENTO (422) si hay fechas solapadas del mismo tipo para el mismo empleado.
        """
        empresa_id = self._repo.find_empresa_for_empleado(str(data.empleado_id))
        if not empresa_id:
            raise AppError("Empleado no encontrado", "EMPLEADO_NOT_FOUND", 404)
        verificar_periodo_abierto(empresa_id, "vacaciones", desde=data.fecha_desde, hasta=data.fecha_hasta, repo=self._periodos)

        overlapping = self._repo.find_overlapping(
            str(data.empleado_id), data.fecha_desde, data.fecha_hasta, data.tipo
        )
        if overlapping:
            raise AppError(
                "El empleado ya tiene una solicitud del mismo tipo en ese período",
                "VACACIONES_SOLAPAMIENTO",
                422,
            )

        dias = (data.fecha_hasta - data.fecha_desde).days + 1
        row = self._repo.save(
            str(data.empleado_id), empresa_id,
            data.fecha_desde, data.fecha_hasta,
            dias, data.tipo, data.comentario,
        )
        logger.info(
            "Vacaciones registradas",
            extra={"solicitud_id": row.id, "empleado_id": str(data.empleado_id), "tipo": data.tipo, "created_by": created_by},
        )
        return derive_estado(row, date.today())

    def cancel(self, id: UUID, empresa_id: Optional[UUID] = None, usuario_id: Optional[str] = None) -> SolicitudVacacionesResponse:
        """
        Cancela una solicitud seteando cancelada=True (no borra la fila — preserva historial).
        Registra el evento de auditoría tras la cancelación exitosa (usuario_id = operador).

        Raises:
            AppError: VACACION_NOT_FOUND (404) si el ID no existe.
            AppError: YA_CANCELADA (422) si ya estaba cancelada.
        """
        row = self._repo.find_by_id(str(id), empresa_id)
        if not row:
            raise AppError("Solicitud de vacaciones no encontrada", "VACACION_NOT_FOUND", 404)
        verificar_periodo_abierto(row.empresa_id, "vacaciones", desde=row.fecha_desde, hasta=row.fecha_hasta, repo=self._periodos)
        if row.cancelada:
            raise AppError("La solicitud ya está cancelada", "YA_CANCELADA", 422)
        updated = self._repo.cancel(str(id), empresa_id)
        self._audit.registrar(**payload_cancelacion_vacacion(row, updated, usuario_id, row.empresa_id))
        logger.info("Vacaciones canceladas", extra={"solicitud_id": str(id)})
        return derive_estado(updated, date.today())  # type: ignore[arg-type]

    def get_saldo(self, empleado_id: UUID) -> SaldoVacacionesResponse:
        """Saldo anual de vacaciones pagas. Solo tipo='vacaciones' no cancelado descuenta:
        gozados (estado 'tomada') + pedidos (estado 'planificada'); disponibles = asignados − ambos.
        Raises EMPLEADO_NOT_FOUND (404) si el empleado no existe."""
        asignados = self._repo.find_dias_asignados(str(empleado_id))
        if asignados is None:
            raise AppError("Empleado no encontrado", "EMPLEADO_NOT_FOUND", 404)

        today = date.today()
        gozados = 0
        pedidos = 0
        for s in self._repo.find_vacaciones_empleado(str(empleado_id)):
            s = derive_estado(s, today)
            if s.estado == "tomada":
                gozados += s.dias
            elif s.estado == "planificada":
                pedidos += s.dias

        return SaldoVacacionesResponse(
            empleado_id=str(empleado_id),
            asignados=asignados,
            gozados=gozados,
            pedidos=pedidos,
            disponibles=asignados - gozados - pedidos,
        )
