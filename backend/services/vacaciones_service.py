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

from repositories.vacaciones_repo import VacacionesRepo
from schemas.vacaciones import (
    SaldoVacacionesResponse,
    SolicitudVacacionesCreate,
    SolicitudVacacionesListResponse,
    SolicitudVacacionesResponse,
)
from utils.errors import AppError
from utils.logger import logger


class VacacionesService:
    def __init__(self, repo: Optional[VacacionesRepo] = None) -> None:
        self._repo = repo or VacacionesRepo()

    def get_all(self, empresa_id: Optional[UUID] = None, area_id: Optional[UUID] = None) -> SolicitudVacacionesListResponse:
        """Retorna todas las solicitudes con estado derivado, filtradas por empresa y/o área. None = todas."""
        today = date.today()
        items = [self._derive_estado(r, today) for r in self._repo.find_all(empresa_id, area_id)]
        return SolicitudVacacionesListResponse(items=items, total=len(items))

    def get_by_id(self, id: UUID, empresa_id: Optional[UUID] = None) -> SolicitudVacacionesResponse:
        """Retorna el detalle de una solicitud. Raises VACACION_NOT_FOUND (404) si no existe."""
        row = self._repo.find_by_id(str(id), empresa_id)
        if not row:
            raise AppError("Solicitud de vacaciones no encontrada", "VACACION_NOT_FOUND", 404)
        return self._derive_estado(row, date.today())

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
        return self._derive_estado(row, date.today())

    def cancel(self, id: UUID, empresa_id: Optional[UUID] = None) -> SolicitudVacacionesResponse:
        """
        Cancela una solicitud seteando cancelada=True (no borra la fila — preserva historial).

        Raises:
            AppError: VACACION_NOT_FOUND (404) si el ID no existe.
            AppError: YA_CANCELADA (422) si ya estaba cancelada.
        """
        row = self._repo.find_by_id(str(id), empresa_id)
        if not row:
            raise AppError("Solicitud de vacaciones no encontrada", "VACACION_NOT_FOUND", 404)
        if row.cancelada:
            raise AppError("La solicitud ya está cancelada", "YA_CANCELADA", 422)
        updated = self._repo.cancel(str(id), empresa_id)
        logger.info("Vacaciones canceladas", extra={"solicitud_id": str(id)})
        return self._derive_estado(updated, date.today())  # type: ignore[arg-type]

    def get_saldo(self, empleado_id: UUID) -> SaldoVacacionesResponse:
        """
        Calcula el saldo anual de vacaciones pagas del empleado.
        Solo las solicitudes tipo='vacaciones' no canceladas descuentan:
          - gozados: estado 'tomada'
          - pedidos: estado 'planificada'
          - disponibles = asignados − gozados − pedidos
        Si el empleado no tiene solicitudes, gozados y pedidos son 0 y disponibles = asignados.

        Raises:
            AppError: EMPLEADO_NOT_FOUND (404) si el empleado no existe.
        """
        asignados = self._repo.find_dias_asignados(str(empleado_id))
        if asignados is None:
            raise AppError("Empleado no encontrado", "EMPLEADO_NOT_FOUND", 404)

        today = date.today()
        gozados = 0
        pedidos = 0
        for s in self._repo.find_vacaciones_empleado(str(empleado_id)):
            s = self._derive_estado(s, today)
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

    @staticmethod
    def _derive_estado(row: SolicitudVacacionesResponse, today: date) -> SolicitudVacacionesResponse:
        """Calcula el estado derivado y devuelve una copia del response con el campo actualizado."""
        if row.cancelada:
            estado = "cancelada"
        elif today < row.fecha_desde:
            estado = "planificada"
        else:
            estado = "tomada"
        return row.model_copy(update={"estado": estado})
