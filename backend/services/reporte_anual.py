"""
Generador del informe anual consolidado de RRHH.
Calcula métricas del año filtradas por empresa. Retorna estructura _sheets para
export multi-hoja Excel + datos planos como fallback para PDF.
Módulo auxiliar — invocado desde ReporteService.
"""
from typing import Any, Dict, List, Optional
from uuid import UUID

from integrations.supabase_client import supabase_admin


def _eid(empresa_id: Optional[UUID]) -> Optional[str]:
    return str(empresa_id) if empresa_id else None


def _count_rango(
    tabla: str,
    eid: Optional[str],
    ini: str,
    fin: str,
    campo_fecha: str = "created_at",
    **filtros: str,
) -> int:
    """Count con rango de fecha (date o timestamp) y filtros de igualdad opcionales."""
    q = supabase_admin.table(tabla).select("id", count="exact").gte(campo_fecha, ini).lte(campo_fecha, fin)
    for k, v in filtros.items():
        q = q.eq(k, v)
    if eid:
        q = q.eq("empresa_id", eid)
    return q.execute().count or 0


def generate_anual_consolidado(anio: int, empresa_id: Optional[UUID] = None) -> Dict[str, Any]:
    """
    Genera métricas anuales consolidadas. Filtra por empresa_id (None = todas).
    ev_instancias.fecha_evaluacion es la fecha en que se finalizó (Optional[date]);
    instancias sin fecha_evaluacion (pre-campo o sin finalizar) no se contabilizan.

    Returns:
        Dict con '_sheets' (multi-hoja Excel) y campos planos (fallback PDF).

    Raises:
        Exception: propagada al caller para que ReporteService la envuelva en AppError.
    """
    eid = _eid(empresa_id)
    ini = f"{anio}-01-01"
    fin = f"{anio}-12-31"
    ini_ts = f"{ini}T00:00:00"
    fin_ts = f"{fin}T23:59:59"

    # ── 1. Movimientos de personal ─────────────────────────────────────────────
    ing_q = supabase_admin.table("empleados").select("id", count="exact").gte("fecha_ingreso", ini).lte("fecha_ingreso", fin)
    if eid:
        ing_q = ing_q.eq("empresa_id", eid)
    ingresos = ing_q.execute().count or 0

    egr_q = supabase_admin.table("offboarding_instancias").select("id", count="exact").gte("created_at", ini_ts).lte("created_at", fin_ts)
    if eid:
        egr_q = egr_q.eq("empresa_id", eid)
    egresos = egr_q.execute().count or 0

    # ── 2. Headcount actual por área ───────────────────────────────────────────
    areas_q = supabase_admin.table("areas").select("id, nombre").eq("activo", True)
    if eid:
        areas_q = areas_q.eq("empresa_id", eid)
    area_map: dict[str, str] = {a["id"]: a["nombre"] for a in (areas_q.execute().data or [])}

    emp_q = supabase_admin.table("empleados").select("area_id").eq("estado", "activo")
    if eid:
        emp_q = emp_q.eq("empresa_id", eid)
    emp_rows = emp_q.execute().data or []
    total_activos = len(emp_rows)

    conteo: dict[str, int] = {}
    for r in emp_rows:
        aid = r.get("area_id")
        if aid and aid in area_map:
            conteo[aid] = conteo.get(aid, 0) + 1
    headcount_list: List[dict] = sorted(
        [{"area": area_map[k], "total": v} for k, v in conteo.items()],
        key=lambda x: x["total"],
        reverse=True,
    )

    # ── 3. Procesos del año ────────────────────────────────────────────────────
    onb_iniciados = _count_rango("onboarding_instancias", eid, ini_ts, fin_ts)
    vacantes_del_ano = _count_rango("vacantes", eid, ini_ts, fin_ts)
    vacantes_cerradas = _count_rango("vacantes", eid, ini_ts, fin_ts, estado="cerrada")

    # ── 4. Actividad del año ───────────────────────────────────────────────────
    vac_q = supabase_admin.table("solicitudes_vacaciones").select("dias").eq("tipo", "vacaciones").eq("cancelada", False).gte("fecha_desde", ini).lte("fecha_desde", fin)
    if eid:
        vac_q = vac_q.eq("empresa_id", eid)
    vac_data = vac_q.execute().data or []
    solicitudes_vacaciones = len(vac_data)
    dias_vacaciones = sum(int(r.get("dias") or 0) for r in vac_data)

    cap_q = supabase_admin.table("empleado_capacitacion").select("id", count="exact").eq("estado", "completado").gte("fecha_completado", ini).lte("fecha_completado", fin)
    if eid:
        cap_q = cap_q.eq("empresa_id", eid)
    cap_completadas = cap_q.execute().count or 0

    obj_q = supabase_admin.table("objetivos").select("id", count="exact").eq("estado", "terminado").gte("updated_at", ini_ts).lte("updated_at", fin_ts)
    if eid:
        obj_q = obj_q.eq("empresa_id", eid)
    obj_terminados = obj_q.execute().count or 0

    # ev_instancias.fecha_evaluacion: date asignada en finalizar(); NULL si no finalizó aún
    ev_q = supabase_admin.table("ev_instancias").select("id", count="exact").eq("estado", "finalizada").gte("fecha_evaluacion", ini).lte("fecha_evaluacion", fin)
    if eid:
        ev_q = ev_q.eq("empresa_id", eid)
    ev_finalizadas = ev_q.execute().count or 0

    # ── Estructura de retorno ──────────────────────────────────────────────────
    return {
        "_sheets": {
            "Resumen": {
                "Año": anio,
                "Empleados activos": total_activos,
                "Ingresos del año": ingresos,
                "Egresos del año": egresos,
                "Variación neta": ingresos - egresos,
            },
            "Headcount por área": {"por_area": headcount_list},
            "Procesos del año": {
                "Onboardings iniciados": onb_iniciados,
                "Vacantes del año": vacantes_del_ano,
                "Vacantes cerradas": vacantes_cerradas,
            },
            "Actividad del año": {
                "Solicitudes de vacaciones": solicitudes_vacaciones,
                "Días de vacaciones tomados": dias_vacaciones,
                "Capacitaciones completadas": cap_completadas,
                "Evaluaciones finalizadas": ev_finalizadas,
                "Objetivos terminados": obj_terminados,
            },
        },
        "titulo": f"Informe Anual {anio}",
        "anio": anio,
        "total_empleados_activos": total_activos,
        "ingresos_del_ano": ingresos,
        "egresos_del_ano": egresos,
        "variacion_neta": ingresos - egresos,
        "onboardings_iniciados": onb_iniciados,
        "vacantes_del_ano": vacantes_del_ano,
        "vacantes_cerradas": vacantes_cerradas,
        "solicitudes_vacaciones": solicitudes_vacaciones,
        "dias_vacaciones_tomados": dias_vacaciones,
        "capacitaciones_completadas": cap_completadas,
        "evaluaciones_finalizadas": ev_finalizadas,
        "objetivos_terminados": obj_terminados,
        "headcount_por_area": headcount_list,
    }
