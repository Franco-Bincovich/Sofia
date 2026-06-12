"""
Servicio del Dashboard Ejecutivo. Agrega KPIs, headcount y alertas en tiempo real.
Flujo: router → service → DB
Todas las queries filtran por empresa_id del contexto (None = consolidado de todas).
"""
import calendar
from datetime import date
from typing import List, Optional
from uuid import UUID

from integrations.supabase_client import supabase_admin
from schemas.dashboard import AlertaResponse, DashboardResponse, HeadcountAreaResponse, KPIResponse
from utils.errors import AppError
from utils.logger import logger


class DashboardService:
    def get_dashboard(self, empresa_id: Optional[UUID] = None) -> DashboardResponse:
        """
        Calcula el resumen ejecutivo del período actual: KPIs, headcount y alertas.
        Filtra por empresa_id si se provee; None retorna datos consolidados de todas.

        Returns:
            DashboardResponse con los datos del período filtrados por empresa.

        Raises:
            AppError: DASHBOARD_ERROR (500) si falla alguna consulta crítica.
        """
        hoy = date.today()
        try:
            kpis = self._calcular_kpis(hoy, empresa_id)
            headcount = self._calcular_headcount(empresa_id)
            alertas = self._generar_alertas(kpis)
        except AppError:
            raise
        except Exception as exc:
            logger.error("Error al calcular dashboard", extra={"error": str(exc)})
            raise AppError("Error al obtener el dashboard", "DASHBOARD_ERROR", 500) from exc
        logger.info("Dashboard ejecutivo calculado", extra={"fecha": hoy.isoformat()})
        return DashboardResponse(kpis=kpis, headcount_por_area=headcount, alertas=alertas)

    def _calcular_kpis(self, hoy: date, empresa_id: Optional[UUID] = None) -> KPIResponse:
        """Calcula los 6 KPIs principales filtrando por empresa_id."""
        anio, mes = hoy.year, hoy.month
        ini = date(anio, mes, 1).isoformat()
        fin = date(anio, mes, calendar.monthrange(anio, mes)[1]).isoformat()
        db = supabase_admin
        eid = str(empresa_id) if empresa_id else None

        def _count(table: str, **filters) -> int:
            """Count con filtro automático de empresa."""
            q = db.table(table).select("id", count="exact")
            for k, v in filters.items():
                q = q.eq(k, v)
            if eid:
                q = q.eq("empresa_id", eid)
            return q.execute().count or 0

        empleados_activos = _count("empleados", estado="activo")

        ingresos_q = (
            db.table("empleados").select("id", count="exact")
            .gte("fecha_ingreso", ini).lte("fecha_ingreso", fin)
        )
        if eid:
            ingresos_q = ingresos_q.eq("empresa_id", eid)
        ingresos_mes = ingresos_q.execute().count or 0

        bajas_q = (
            db.table("empleados").select("id", count="exact")
            .eq("estado", "baja")
            .gte("updated_at", f"{ini}T00:00:00").lte("updated_at", f"{fin}T23:59:59")
        )
        if eid:
            bajas_q = bajas_q.eq("empresa_id", eid)
        bajas_mes = bajas_q.execute().count or 0

        costos_q = db.table("costos_nomina").select("salario_bruto").eq("anio", anio).eq("mes", mes)
        if eid:
            costos_q = costos_q.eq("empresa_id", eid)
        costos_res = costos_q.execute()
        costo_nomina = float(sum(r.get("salario_bruto") or 0 for r in costos_res.data))

        onboardings_activos = _count("onboarding_instancias", estado="en_progreso")

        vacantes_q = db.table("vacantes").select("id", count="exact").neq("estado", "cerrada")
        if eid:
            vacantes_q = vacantes_q.eq("empresa_id", eid)
        vacantes_activas = vacantes_q.execute().count or 0

        return KPIResponse(
            empleados_activos=empleados_activos,
            ingresos_mes=ingresos_mes,
            bajas_mes=bajas_mes,
            costo_nomina=costo_nomina,
            onboardings_activos=onboardings_activos,
            vacantes_activas=vacantes_activas,
        )

    def _calcular_headcount(self, empresa_id: Optional[UUID] = None) -> List[HeadcountAreaResponse]:
        """Calcula headcount de activos agrupado por área, filtrado por empresa."""
        eid = str(empresa_id) if empresa_id else None

        areas_q = supabase_admin.table("areas").select("id, nombre").eq("activo", True)
        if eid:
            areas_q = areas_q.eq("empresa_id", eid)
        area_nombres: dict[str, str] = {a["id"]: a["nombre"] for a in areas_q.execute().data}

        emp_q = supabase_admin.table("empleados").select("area_id").eq("estado", "activo")
        if eid:
            emp_q = emp_q.eq("empresa_id", eid)
        emp_res = emp_q.execute()

        conteo: dict[str, int] = {}
        for emp in emp_res.data:
            aid = emp.get("area_id")
            if aid and aid in area_nombres:
                conteo[aid] = conteo.get(aid, 0) + 1
        return sorted(
            [HeadcountAreaResponse(area_id=k, area=area_nombres[k], total=v) for k, v in conteo.items()],
            key=lambda x: x.total,
            reverse=True,
        )

    def _generar_alertas(self, kpis: KPIResponse) -> List[AlertaResponse]:
        """Genera alertas automáticas a partir del estado de los KPIs."""
        alertas: List[AlertaResponse] = []
        if kpis.vacantes_activas > 0:
            alertas.append(AlertaResponse(
                tipo="vacantes",
                mensaje=f"Hay {kpis.vacantes_activas} vacante(s) activa(s) en proceso de selección",
                nivel="info",
            ))
        if kpis.onboardings_activos > 0:
            alertas.append(AlertaResponse(
                tipo="onboarding",
                mensaje=f"Hay {kpis.onboardings_activos} proceso(s) de onboarding en curso",
                nivel="info",
            ))
        return alertas
