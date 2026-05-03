"""
Servicio de Reportes. Genera datos reales desde Supabase para cada tipo de reporte.
Flujo: router → service → repository/DB
"""
import calendar
from datetime import date
from typing import Any, Dict, Optional

import anthropic

from config.settings import settings
from integrations.supabase_client import supabase_admin
from repositories.reporte_repo import ReporteRepo
from schemas.reporte import HistorialItem, ReporteResponse
from utils.errors import AppError
from utils.logger import logger

_MESES_ES = {
    1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril",
    5: "Mayo", 6: "Junio", 7: "Julio", 8: "Agosto",
    9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre",
}


def _periodo_str(mes: int, anio: int) -> str:
    return f"{_MESES_ES[mes]} {anio}"


def _rango_mes(mes: int, anio: int) -> tuple[str, str]:
    """Retorna (inicio, fin) ISO del mes como strings."""
    ultimo_dia = calendar.monthrange(anio, mes)[1]
    return date(anio, mes, 1).isoformat(), date(anio, mes, ultimo_dia).isoformat()


class ReporteService:
    def __init__(self, repo: Optional[ReporteRepo] = None) -> None:
        self._repo = repo or ReporteRepo()

    def get_historial(self) -> list[HistorialItem]:
        """
        Retorna el historial de reportes generados, ordenado por fecha desc.

        Returns:
            Lista de HistorialItem.
        """
        return self._repo.find_historial()

    def generar(
        self,
        tipo: str,
        mes: Optional[int] = None,
        anio: Optional[int] = None,
        prompt: Optional[str] = None,
        generado_por: str = "Sistema",
    ) -> ReporteResponse:
        """
        Genera un reporte del tipo indicado, lo persiste en el historial y lo retorna.

        Args:
            tipo: Tipo de reporte (headcount | rotacion | costos | vacantes | onboarding | adhoc).
            mes: Mes del período (1–12). Requerido para headcount, rotacion, costos.
            anio: Año del período. Requerido para headcount, rotacion, costos.
            prompt: Descripción en lenguaje natural para el reporte adhoc.
            generado_por: Identificador del usuario que solicita el reporte.

        Returns:
            ReporteResponse con los datos generados y persistidos.

        Raises:
            AppError: REPORTE_PARAMS_ERROR (400) si faltan parámetros obligatorios.
            AppError: REPORTE_TIPO_ERROR (400) si el tipo no existe.
            AppError: REPORTE_ERROR (500) si falla la generación.
        """
        hoy = date.today()
        mes_efectivo = mes or hoy.month
        anio_efectivo = anio or hoy.year

        generators = {
            "headcount": lambda: self._generate_headcount(mes_efectivo, anio_efectivo),
            "rotacion": lambda: self._generate_rotacion(mes_efectivo, anio_efectivo),
            "costos": lambda: self._generate_costos(mes_efectivo, anio_efectivo),
            "vacantes": lambda: self._generate_vacantes(),
            "onboarding": lambda: self._generate_onboarding(),
            "adhoc": lambda: self._generate_adhoc(prompt or ""),
        }

        if tipo not in generators:
            raise AppError(f"Tipo de reporte desconocido: {tipo}", "REPORTE_TIPO_ERROR", 400)

        nombres = {
            "headcount": f"Headcount — {_periodo_str(mes_efectivo, anio_efectivo)}",
            "rotacion": f"Rotación — {_periodo_str(mes_efectivo, anio_efectivo)}",
            "costos": f"Costos — {_periodo_str(mes_efectivo, anio_efectivo)}",
            "vacantes": "Pipeline de Vacantes",
            "onboarding": "Progreso de Onboarding",
            "adhoc": f"Análisis IA: {(prompt or '')[:60]}",
        }

        try:
            datos = generators[tipo]()
        except AppError:
            raise
        except Exception as exc:
            logger.error("Error al generar reporte", extra={"tipo": tipo, "error": str(exc)})
            raise AppError("Error al generar el reporte", "REPORTE_ERROR", 500) from exc

        reporte = self._repo.save(
            nombre=nombres[tipo],
            tipo=tipo,
            datos=datos,
            generado_por=generado_por,
            parametros={"mes": mes_efectivo, "anio": anio_efectivo} if tipo not in ("vacantes", "onboarding", "adhoc") else None,
        )
        logger.info("Reporte generado", extra={"tipo": tipo, "id": str(reporte.id)})
        return reporte

    # ── Generadores ───────────────────────────────────────────────────────────

    def _generate_headcount(self, mes: int, anio: int) -> Dict[str, Any]:
        """
        Genera datos reales de headcount: total activos, ingresos/bajas del período
        y distribución por área.

        Args:
            mes: Mes del período.
            anio: Año del período.

        Returns:
            Dict con total_empleados, ingresos_periodo, bajas_periodo, variacion_neta, por_area.
        """
        ini, fin = _rango_mes(mes, anio)
        db = supabase_admin

        activos_res = db.table("empleados").select("area_id", count="exact").eq("estado", "activo").execute()
        total = activos_res.count or 0

        ingresos_res = (
            db.table("empleados").select("id", count="exact")
            .gte("fecha_ingreso", ini).lte("fecha_ingreso", fin).execute()
        )
        ingresos = ingresos_res.count or 0

        bajas_res = (
            db.table("empleados").select("id", count="exact")
            .eq("estado", "baja")
            .gte("updated_at", f"{ini}T00:00:00").lte("updated_at", f"{fin}T23:59:59")
            .execute()
        )
        bajas = bajas_res.count or 0

        areas_res = db.table("areas").select("id, nombre").eq("activo", True).execute()
        area_map: dict[str, str] = {a["id"]: a["nombre"] for a in (areas_res.data or [])}

        conteo: dict[str, dict[str, int]] = {}
        for emp in (activos_res.data or []):
            aid = emp.get("area_id")
            if aid and aid in area_map:
                if aid not in conteo:
                    conteo[aid] = {"nombre": area_map[aid], "total": 0}
                conteo[aid]["total"] += 1

        return {
            "titulo": f"Headcount — {_periodo_str(mes, anio)}",
            "periodo": {"mes": mes, "anio": anio},
            "total_empleados": total,
            "ingresos_periodo": ingresos,
            "bajas_periodo": bajas,
            "variacion_neta": ingresos - bajas,
            "por_area": sorted(conteo.values(), key=lambda x: x["total"], reverse=True),
        }

    def _generate_rotacion(self, mes: int, anio: int) -> Dict[str, Any]:
        """
        Genera datos reales de rotación: ingresos, bajas y tasa de rotación del período.
        Consulta los offboardings del período para desglosar por motivo de egreso.

        Args:
            mes: Mes del período.
            anio: Año del período.

        Returns:
            Dict con empleados_activos, ingresos, bajas, tasa_rotacion, motivos_egreso.
        """
        ini, fin = _rango_mes(mes, anio)
        db = supabase_admin

        activos_res = db.table("empleados").select("id", count="exact").eq("estado", "activo").execute()
        empleados_activos = activos_res.count or 0

        ingresos_res = (
            db.table("empleados").select("id", count="exact")
            .gte("fecha_ingreso", ini).lte("fecha_ingreso", fin).execute()
        )
        ingresos = ingresos_res.count or 0

        off_res = (
            db.table("offboarding_instancias")
            .select("motivo")
            .gte("created_at", f"{ini}T00:00:00").lte("created_at", f"{fin}T23:59:59")
            .execute()
        )
        bajas = len(off_res.data or [])

        motivos: dict[str, int] = {}
        for row in (off_res.data or []):
            m = row.get("motivo", "otro")
            motivos[m] = motivos.get(m, 0) + 1

        base = empleados_activos + bajas
        tasa = round(bajas / base * 100, 2) if base > 0 else 0.0

        return {
            "titulo": f"Rotación — {_periodo_str(mes, anio)}",
            "periodo": {"mes": mes, "anio": anio},
            "empleados_activos": empleados_activos,
            "ingresos_periodo": ingresos,
            "bajas_periodo": bajas,
            "tasa_rotacion_pct": tasa,
            "motivos_egreso": motivos,
        }

    def _generate_costos(self, mes: int, anio: int) -> Dict[str, Any]:
        """
        Genera datos reales de costos: nómina total, presupuesto y desvío del período,
        desagregados por área.

        Args:
            mes: Mes del período.
            anio: Año del período.

        Returns:
            Dict con total_nomina, total_presupuesto, desvio, por_area.
        """
        db = supabase_admin

        nom_res = (
            db.table("costos_nomina")
            .select("total, empleados(areas!empleados_area_id_fkey(nombre))")
            .eq("mes", mes).eq("anio", anio).execute()
        )
        pre_res = (
            db.table("presupuesto_areas")
            .select("monto_presupuestado, areas(nombre)")
            .eq("mes", mes).eq("anio", anio).eq("tipo_costo", "nomina").execute()
        )

        area_datos: dict[str, dict[str, float]] = {}
        total_nomina = 0.0
        for row in (nom_res.data or []):
            area_nombre = ((row.get("empleados") or {}).get("areas") or {}).get("nombre") or "Sin área"
            total = float(row.get("total") or 0)
            total_nomina += total
            if area_nombre not in area_datos:
                area_datos[area_nombre] = {"nomina": 0.0, "presupuesto": 0.0}
            area_datos[area_nombre]["nomina"] += total

        total_presupuesto = 0.0
        for row in (pre_res.data or []):
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
            "titulo": f"Costos — {_periodo_str(mes, anio)}",
            "periodo": {"mes": mes, "anio": anio},
            "total_nomina": round(total_nomina, 2),
            "total_presupuesto": round(total_presupuesto, 2),
            "desvio": round(total_nomina - total_presupuesto, 2),
            "por_area": sorted(por_area, key=lambda x: x["nomina"], reverse=True),
        }

    def _generate_vacantes(self) -> Dict[str, Any]:
        """
        Genera datos reales del pipeline de vacantes activas, agrupados por estado y área.

        Returns:
            Dict con total_activas, por_estado, por_area y detalle de vacantes.
        """
        res = (
            supabase_admin.table("vacantes")
            .select("id, titulo, estado, areas(nombre)")
            .neq("estado", "cerrada")
            .order("created_at", desc=True)
            .execute()
        )
        rows = res.data or []

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

    def _generate_onboarding(self) -> Dict[str, Any]:
        """
        Genera datos reales del progreso de onboardings activos.

        Returns:
            Dict con total_activos, progreso_promedio y detalle por instancia.
        """
        res = (
            supabase_admin.table("onboarding_instancias")
            .select("id, progreso, created_at, empleados(nombre, apellido)")
            .eq("estado", "en_progreso")
            .order("created_at", desc=True)
            .execute()
        )
        rows = res.data or []

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

        promedio = round(total_progreso / len(rows)) if rows else 0

        return {
            "titulo": "Progreso de Onboarding",
            "total_activos": len(rows),
            "progreso_promedio": promedio,
            "detalle": detalle,
        }

    def _generate_adhoc(self, prompt: str) -> Dict[str, Any]:
        """
        Genera un análisis en lenguaje natural usando Claude como motor de IA.
        Recopila un resumen de datos HR y los incluye como contexto para el modelo.

        Args:
            prompt: Descripción del reporte solicitado por el usuario.

        Returns:
            Dict con el análisis generado por IA y el contexto de datos utilizado.

        Raises:
            AppError: ADHOC_PROMPT_REQUIRED (400) si el prompt está vacío.
        """
        if not prompt.strip():
            raise AppError("El prompt del reporte Ad Hoc no puede estar vacío", "ADHOC_PROMPT_REQUIRED", 400)

        hoy = date.today()
        db = supabase_admin

        activos = (db.table("empleados").select("id", count="exact").eq("estado", "activo").execute().count or 0)
        vacantes_activas = (db.table("vacantes").select("id", count="exact").neq("estado", "cerrada").execute().count or 0)
        onboardings = (db.table("onboarding_instancias").select("id", count="exact").eq("estado", "en_progreso").execute().count or 0)

        ini = date(hoy.year, hoy.month, 1).isoformat()
        ingresos = (
            db.table("empleados").select("id", count="exact")
            .gte("fecha_ingreso", ini).execute().count or 0
        )

        contexto = (
            f"Datos actuales de RRHH (al {hoy.isoformat()}):\n"
            f"- Empleados activos: {activos}\n"
            f"- Ingresos este mes: {ingresos}\n"
            f"- Vacantes activas: {vacantes_activas}\n"
            f"- Onboardings en curso: {onboardings}\n"
        )

        client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        message = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1500,
            messages=[
                {
                    "role": "user",
                    "content": (
                        f"Sos el asistente de RRHH de Karstec. Tenés acceso a los siguientes datos:\n\n"
                        f"{contexto}\n\n"
                        f"El usuario solicita: {prompt}\n\n"
                        "Generá un análisis claro, conciso y orientado a la acción. "
                        "Respondé en español. Estructurá la respuesta con secciones si aplica."
                    ),
                }
            ],
        )

        analisis = message.content[0].text if message.content else "No se pudo generar el análisis."

        return {
            "titulo": f"Análisis IA: {prompt[:60]}",
            "prompt": prompt,
            "analisis": analisis,
            "contexto_datos": contexto,
        }
