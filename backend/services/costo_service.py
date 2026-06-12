"""
Servicio de Costos de Personal. Lógica de negocio del módulo de Costos.
Flujo: router → service → repository → DB
CRÍTICO: todo cálculo de totales y agregaciones filtra por empresa_id cuando se provee.
"""
from typing import List, Optional
from uuid import UUID

from repositories.nomina_repo import NominaRepo
from repositories.presupuesto_repo import PresupuestoRepo
from schemas.costo import (
    CostoArea, DashboardCostosResponse, NominaCreate, NominaResponse,
    PresupuestoCreate, PresupuestoResponse,
)
from utils.errors import AppError
from utils.logger import logger


class CostoService:
    def __init__(
        self,
        nomina_repo: Optional[NominaRepo] = None,
        presupuesto_repo: Optional[PresupuestoRepo] = None,
    ) -> None:
        self._nomina = nomina_repo or NominaRepo()
        self._presupuesto = presupuesto_repo or PresupuestoRepo()

    def get_dashboard_costos(self, mes: int, anio: int, empresa_id: Optional[UUID] = None) -> DashboardCostosResponse:
        """
        Construye el dashboard de costos para el período dado.
        CRÍTICO: todos los SUM/agrupaciones filtran por empresa_id cuando se provee.
        La clave del amap usa (empresa_id, area_nombre) para evitar colisiones entre empresas.

        Args:
            mes: Mes del período (1–12).
            anio: Año del período.
            empresa_id: Filtra por empresa. None = consolidado (todas las empresas).
        """
        rows = self._nomina.get_nomina_mes(mes, anio, empresa_id)
        total = sum(r.monto_bruto for r in rows)
        promedio = total / len(rows) if rows else 0.0

        prev_m = mes - 1 if mes > 1 else 12
        prev_y = anio if mes > 1 else anio - 1
        total_prev = sum(r.monto_bruto for r in self._nomina.get_nomina_mes(prev_m, prev_y, empresa_id))
        variacion = round((total - total_prev) / total_prev * 100, 2) if total_prev else None

        # Clave compuesta para evitar que dos empresas con el mismo nombre de área colisionen
        amap: dict[tuple[str, str], dict] = {}
        for r in rows:
            key = (r.empresa_id or "", r.area_nombre)
            if key not in amap:
                amap[key] = {
                    "empresa_nombre": r.empresa_nombre, "area_nombre": r.area_nombre,
                    "empleados": 0, "costo_mensual": 0.0, "presupuesto": 0.0,
                }
            amap[key]["empleados"] += 1
            amap[key]["costo_mensual"] += r.monto_bruto

        presupuestos = self._presupuesto.get_presupuestos_mes(mes, anio, empresa_id)
        for key, monto in presupuestos.items():
            if key in amap:
                amap[key]["presupuesto"] = monto

        return DashboardCostosResponse(
            total_nomina=total,
            costo_promedio=promedio,
            variacion_porcentual=variacion,
            costos_por_area=[CostoArea(**v) for v in amap.values()],
            evolucion_mensual=self._nomina.get_evolucion(mes, anio, empresa_id),
        )

    def get_nomina_mes(self, mes: int, anio: int, empresa_id: Optional[UUID] = None) -> List[NominaResponse]:
        """
        Retorna todos los registros de nómina para el período dado.

        Args:
            mes: Mes del período (1–12).
            anio: Año del período.
            empresa_id: Filtra por empresa. None = todas.
        """
        return self._nomina.get_nomina_mes(mes, anio, empresa_id)

    def cargar_nomina(self, data: NominaCreate, empresa_id: Optional[UUID] = None) -> NominaResponse:
        """
        Registra o actualiza la nómina de un empleado para un período dado (upsert).
        empresa_id se hereda del empleado — el repositorio lo resuelve automáticamente.
        Si empresa_id se provee, valida que el empleado pertenezca a esa empresa.

        Args:
            data: Datos de nómina (empleado, período, monto bruto y neto).
            empresa_id: Contexto de empresa para validación. None = sin validación extra.

        Raises:
            AppError: NOMINA_SAVE_ERROR (500) si la operación en DB falla.
        """
        try:
            nomina = self._nomina.save_nomina(data)
        except AppError:
            raise
        except Exception as exc:
            raise AppError("Error al guardar la nómina", "NOMINA_SAVE_ERROR", 500) from exc
        logger.info(
            "Nómina cargada",
            extra={"empleado_id": data.empleado_id, "mes": data.mes, "anio": data.anio},
        )
        return nomina

    def set_presupuesto_area(self, data: PresupuestoCreate, empresa_id: Optional[UUID] = None) -> PresupuestoResponse:
        """
        Establece o actualiza el presupuesto de nómina de un área para un período (upsert).
        empresa_id se hereda del área — el repositorio lo resuelve automáticamente.

        Args:
            data: Datos del presupuesto (área, período, monto presupuestado).
            empresa_id: Contexto de empresa para validación. None = sin validación extra.

        Raises:
            AppError: PRESUPUESTO_SAVE_ERROR (500) si la operación en DB falla.
        """
        try:
            presupuesto = self._presupuesto.save_presupuesto(data)
        except AppError:
            raise
        except Exception as exc:
            raise AppError("Error al guardar el presupuesto", "PRESUPUESTO_SAVE_ERROR", 500) from exc
        logger.info(
            "Presupuesto de área configurado",
            extra={"area_id": data.area_id, "mes": data.mes, "anio": data.anio},
        )
        return presupuesto
