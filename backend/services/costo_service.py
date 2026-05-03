"""
Servicio de Costos de Personal. Lógica de negocio del módulo de Costos.
Flujo: router → service → repository → DB
"""
from typing import List, Optional

from repositories.costo_repo import CostoRepo
from schemas.costo import (
    CostoArea, DashboardCostosResponse, NominaCreate, NominaResponse,
    PresupuestoCreate, PresupuestoResponse,
)
from utils.errors import AppError
from utils.logger import logger


class CostoService:
    def __init__(self, repo: Optional[CostoRepo] = None) -> None:
        self._repo = repo or CostoRepo()

    def get_dashboard_costos(self, mes: int, anio: int) -> DashboardCostosResponse:
        """
        Construye el dashboard de costos para el período dado.

        Agrega los registros de nómina del mes/año seleccionado, calcula la
        variación porcentual respecto al mes anterior, agrupa por área con su
        presupuesto y retorna la evolución de los últimos 12 meses.

        Args:
            mes: Mes del período (1–12).
            anio: Año del período.

        Returns:
            DashboardCostosResponse con KPIs, costos por área y evolución mensual.
        """
        rows = self._repo.get_nomina_mes(mes, anio)
        total = sum(r.monto_bruto for r in rows)
        promedio = total / len(rows) if rows else 0.0

        prev_m = mes - 1 if mes > 1 else 12
        prev_y = anio if mes > 1 else anio - 1
        total_prev = sum(r.monto_bruto for r in self._repo.get_nomina_mes(prev_m, prev_y))
        variacion = round((total - total_prev) / total_prev * 100, 2) if total_prev else None

        amap: dict[str, dict] = {}
        for r in rows:
            if r.area_nombre not in amap:
                amap[r.area_nombre] = {
                    "area_nombre": r.area_nombre, "empleados": 0,
                    "costo_mensual": 0.0, "presupuesto": 0.0,
                }
            amap[r.area_nombre]["empleados"] += 1
            amap[r.area_nombre]["costo_mensual"] += r.monto_bruto

        presupuestos = self._repo.get_presupuestos_mes(mes, anio)
        for nombre, monto in presupuestos.items():
            if nombre in amap:
                amap[nombre]["presupuesto"] = monto

        return DashboardCostosResponse(
            total_nomina=total,
            costo_promedio=promedio,
            variacion_porcentual=variacion,
            costos_por_area=[CostoArea(**v) for v in amap.values()],
            evolucion_mensual=self._repo.get_evolucion(mes, anio),
        )

    def get_nomina_mes(self, mes: int, anio: int) -> List[NominaResponse]:
        """
        Retorna todos los registros de nómina para el período dado.

        Args:
            mes: Mes del período (1–12).
            anio: Año del período.

        Returns:
            Lista de NominaResponse; vacía si aún no se cargó la nómina.
        """
        return self._repo.get_nomina_mes(mes, anio)

    def cargar_nomina(self, data: NominaCreate) -> NominaResponse:
        """
        Registra o actualiza la nómina de un empleado para un período dado.

        Si ya existe un registro para la misma combinación empleado/mes/año,
        lo sobreescribe (upsert). Las cargas sociales se calculan como
        ``monto_bruto − monto_neto``; el ``total`` lo genera la DB.

        Args:
            data: Datos de nómina (empleado, período, monto bruto y neto).

        Returns:
            NominaResponse con los datos persistidos y el total calculado.

        Raises:
            AppError: NOMINA_SAVE_ERROR (500) si la operación en DB falla.
        """
        try:
            nomina = self._repo.save_nomina(data)
        except Exception as exc:
            raise AppError("Error al guardar la nómina", "NOMINA_SAVE_ERROR", 500) from exc
        logger.info(
            "Nómina cargada",
            extra={"empleado_id": data.empleado_id, "mes": data.mes, "anio": data.anio},
        )
        return nomina

    def set_presupuesto_area(self, data: PresupuestoCreate) -> PresupuestoResponse:
        """
        Establece o actualiza el presupuesto de nómina de un área para un período.

        Si ya existe un registro para la misma combinación área/mes/año/tipo,
        lo sobreescribe (upsert).

        Args:
            data: Datos del presupuesto (área, período, monto presupuestado).

        Returns:
            PresupuestoResponse con el presupuesto guardado.

        Raises:
            AppError: PRESUPUESTO_SAVE_ERROR (500) si la operación en DB falla.
        """
        try:
            presupuesto = self._repo.save_presupuesto(data)
        except Exception as exc:
            raise AppError("Error al guardar el presupuesto", "PRESUPUESTO_SAVE_ERROR", 500) from exc
        logger.info(
            "Presupuesto de área configurado",
            extra={"area_id": data.area_id, "mes": data.mes, "anio": data.anio},
        )
        return presupuesto
