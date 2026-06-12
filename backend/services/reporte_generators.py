"""
Generadores de datos para reportes estándar: headcount, rotación, costos, vacantes, onboarding.
Cada función acepta empresa_id opcional para filtrado multiempresa (None = consolidado).
Módulo auxiliar — no instanciar directamente; usar ReporteService.
"""
import calendar
from datetime import date
from typing import Any, Dict, Optional
from uuid import UUID

from integrations.supabase_client import supabase_admin

_MESES_ES = {
    1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril",
    5: "Mayo", 6: "Junio", 7: "Julio", 8: "Agosto",
    9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre",
}


def periodo_str(mes: int, anio: int) -> str:
    return f"{_MESES_ES[mes]} {anio}"


def rango_mes(mes: int, anio: int) -> tuple[str, str]:
    """Retorna (inicio, fin) ISO del mes como strings."""
    ultimo_dia = calendar.monthrange(anio, mes)[1]
    return date(anio, mes, 1).isoformat(), date(anio, mes, ultimo_dia).isoformat()


def _eid(empresa_id: Optional[UUID]) -> Optional[str]:
    return str(empresa_id) if empresa_id else None


def generate_headcount(mes: int, anio: int, empresa_id: Optional[UUID] = None) -> Dict[str, Any]:
    """
    Genera datos reales de headcount: total activos, ingresos/bajas del período y distribución por área.
    Filtra por empresa_id si se provee.
    """
    ini, fin = rango_mes(mes, anio)
    eid = _eid(empresa_id)
    db = supabase_admin

    activos_q = db.table("empleados").select("area_id", count="exact").eq("estado", "activo")
    if eid:
        activos_q = activos_q.eq("empresa_id", eid)
    activos_res = activos_q.execute()
    total = activos_res.count or 0

    ingresos_q = db.table("empleados").select("id", count="exact").gte("fecha_ingreso", ini).lte("fecha_ingreso", fin)
    if eid:
        ingresos_q = ingresos_q.eq("empresa_id", eid)
    ingresos = ingresos_q.execute().count or 0

    bajas_q = (db.table("empleados").select("id", count="exact").eq("estado", "baja")
               .gte("updated_at", f"{ini}T00:00:00").lte("updated_at", f"{fin}T23:59:59"))
    if eid:
        bajas_q = bajas_q.eq("empresa_id", eid)
    bajas = bajas_q.execute().count or 0

    areas_q = db.table("areas").select("id, nombre").eq("activo", True)
    if eid:
        areas_q = areas_q.eq("empresa_id", eid)
    area_map: dict[str, str] = {a["id"]: a["nombre"] for a in (areas_q.execute().data or [])}

    conteo: dict[str, dict[str, int]] = {}
    for emp in (activos_res.data or []):
        aid = emp.get("area_id")
        if aid and aid in area_map:
            if aid not in conteo:
                conteo[aid] = {"nombre": area_map[aid], "total": 0}
            conteo[aid]["total"] += 1

    return {
        "titulo": f"Headcount — {periodo_str(mes, anio)}",
        "periodo": {"mes": mes, "anio": anio},
        "total_empleados": total,
        "ingresos_periodo": ingresos,
        "bajas_periodo": bajas,
        "variacion_neta": ingresos - bajas,
        "por_area": sorted(conteo.values(), key=lambda x: x["total"], reverse=True),
    }


def generate_rotacion(mes: int, anio: int, empresa_id: Optional[UUID] = None) -> Dict[str, Any]:
    """
    Genera datos reales de rotación: ingresos, bajas y tasa del período.
    Filtra por empresa_id si se provee.
    """
    ini, fin = rango_mes(mes, anio)
    eid = _eid(empresa_id)
    db = supabase_admin

    activos_q = db.table("empleados").select("id", count="exact").eq("estado", "activo")
    if eid:
        activos_q = activos_q.eq("empresa_id", eid)
    empleados_activos = activos_q.execute().count or 0

    ingresos_q = db.table("empleados").select("id", count="exact").gte("fecha_ingreso", ini).lte("fecha_ingreso", fin)
    if eid:
        ingresos_q = ingresos_q.eq("empresa_id", eid)
    ingresos = ingresos_q.execute().count or 0

    off_q = (db.table("offboarding_instancias").select("motivo")
             .gte("created_at", f"{ini}T00:00:00").lte("created_at", f"{fin}T23:59:59"))
    if eid:
        off_q = off_q.eq("empresa_id", eid)
    off_res = off_q.execute()
    bajas = len(off_res.data or [])

    motivos: dict[str, int] = {}
    for row in (off_res.data or []):
        m = row.get("motivo", "otro")
        motivos[m] = motivos.get(m, 0) + 1

    base = empleados_activos + bajas
    tasa = round(bajas / base * 100, 2) if base > 0 else 0.0

    return {
        "titulo": f"Rotación — {periodo_str(mes, anio)}",
        "periodo": {"mes": mes, "anio": anio},
        "empleados_activos": empleados_activos,
        "ingresos_periodo": ingresos,
        "bajas_periodo": bajas,
        "tasa_rotacion_pct": tasa,
        "motivos_egreso": motivos,
    }


def generate_costos(mes: int, anio: int, empresa_id: Optional[UUID] = None) -> Dict[str, Any]:
    """
    Genera datos reales de costos: nómina total, presupuesto y desvío, desagregados por área.
    Filtra por empresa_id si se provee.
    """
    eid = _eid(empresa_id)
    db = supabase_admin

    nom_q = (db.table("costos_nomina")
             .select("total, empleados(areas!empleados_area_id_fkey(nombre))")
             .eq("mes", mes).eq("anio", anio))
    if eid:
        nom_q = nom_q.eq("empresa_id", eid)

    pre_q = (db.table("presupuesto_areas")
             .select("monto_presupuestado, areas(nombre)")
             .eq("mes", mes).eq("anio", anio).eq("tipo_costo", "nomina"))
    if eid:
        pre_q = pre_q.eq("empresa_id", eid)

    area_datos: dict[str, dict[str, float]] = {}
    total_nomina = 0.0
    for row in (nom_q.execute().data or []):
        area_nombre = ((row.get("empleados") or {}).get("areas") or {}).get("nombre") or "Sin área"
        total = float(row.get("total") or 0)
        total_nomina += total
        if area_nombre not in area_datos:
            area_datos[area_nombre] = {"nomina": 0.0, "presupuesto": 0.0}
        area_datos[area_nombre]["nomina"] += total

    total_presupuesto = 0.0
    for row in (pre_q.execute().data or []):
        area_nombre = (row.get("areas") or {}).get("nombre") or "Sin área"
        monto = float(row.get("monto_presupuestado") or 0)
        total_presupuesto += monto
        if area_nombre not in area_datos:
            area_datos[area_nombre] = {"nomina": 0.0, "presupuesto": 0.0}
        area_datos[area_nombre]["presupuesto"] = monto

    por_area = [
        {
            "area": nombre,
            "nomina": round(v["nomina"], 2),
            "presupuesto": round(v["presupuesto"], 2),
            "desvio": round(v["nomina"] - v["presupuesto"], 2),
        }
        for nombre, v in area_datos.items()
    ]

    return {
        "titulo": f"Costos — {periodo_str(mes, anio)}",
        "periodo": {"mes": mes, "anio": anio},
        "total_nomina": round(total_nomina, 2),
        "total_presupuesto": round(total_presupuesto, 2),
        "desvio": round(total_nomina - total_presupuesto, 2),
        "por_area": sorted(por_area, key=lambda x: x["nomina"], reverse=True),
    }


def generate_vacantes(empresa_id: Optional[UUID] = None) -> Dict[str, Any]:
    """
    Genera datos reales del pipeline de vacantes activas, agrupados por estado y área.
    Filtra por empresa_id si se provee.
    """
    eid = _eid(empresa_id)
    q = supabase_admin.table("vacantes").select("id, titulo, estado, areas(nombre)").neq("estado", "cerrada").order("created_at", desc=True)
    if eid:
        q = q.eq("empresa_id", eid)
    rows = q.execute().data or []

    por_estado: dict[str, int] = {}
    por_area: dict[str, int] = {}
    detalle = []
    for v in rows:
        estado = v.get("estado", "desconocido")
        area = (v.get("areas") or {}).get("nombre") or "Sin área"
        por_estado[estado] = por_estado.get(estado, 0) + 1
        por_area[area] = por_area.get(area, 0) + 1
        detalle.append({"titulo": v.get("titulo", ""), "estado": estado, "area": area})

    return {
        "titulo": "Pipeline de Vacantes",
        "total_activas": len(rows),
        "por_estado": por_estado,
        "por_area": por_area,
        "detalle": detalle,
    }


def generate_onboarding(empresa_id: Optional[UUID] = None) -> Dict[str, Any]:
    """
    Genera datos reales del progreso de onboardings activos.
    Filtra por empresa_id si se provee.
    """
    eid = _eid(empresa_id)
    q = (supabase_admin.table("onboarding_instancias")
         .select("id, progreso, created_at, empleados(nombre, apellido)")
         .eq("estado", "en_progreso").order("created_at", desc=True))
    if eid:
        q = q.eq("empresa_id", eid)
    rows = q.execute().data or []

    detalle = []
    total_progreso = 0
    for row in rows:
        emp = row.get("empleados") or {}
        nombre = f"{emp.get('nombre', '')} {emp.get('apellido', '')}".strip()
        progreso = int(row.get("progreso") or 0)
        total_progreso += progreso
        detalle.append({
            "empleado": nombre,
            "progreso": progreso,
            "fecha_inicio": str(row.get("created_at", ""))[:10],
        })

    return {
        "titulo": "Progreso de Onboarding",
        "total_activos": len(rows),
        "progreso_promedio": round(total_progreso / len(rows)) if rows else 0,
        "detalle": detalle,
    }
