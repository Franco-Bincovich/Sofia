"""
Repositorio de costos. Acceso a Supabase con supabase_admin.
Interfaz pública: get_nomina_mes · save_nomina · get_presupuesto_area · save_presupuesto
                  get_presupuestos_mes · get_evolucion
"""
from typing import List, Optional

from integrations.supabase_client import supabase_admin
from schemas.costo import (
    EvolucionMes, NominaCreate, NominaResponse, PresupuestoCreate, PresupuestoResponse,
)

_NOM = "costos_nomina"
_PRE = "presupuesto_areas"
_NOM_SEL = (
    "id,empleado_id,mes,anio,salario_bruto,cargas_sociales,total,"
    "empleados(nombre,apellido,areas!empleados_area_id_fkey(nombre))"
)


def _prev_period(mes: int, anio: int) -> tuple[int, int]:
    return (mes - 1, anio) if mes > 1 else (12, anio - 1)


def _to_nomina(row: dict) -> NominaResponse:
    emp = row.get("empleados") or {}
    area = emp.get("areas") or {}
    bruto = float(row.get("salario_bruto") or 0)
    cargas = float(row.get("cargas_sociales") or 0)
    return NominaResponse(
        id=str(row["id"]),
        empleado_id=str(row["empleado_id"]),
        empleado_nombre=f"{emp.get('nombre', '')} {emp.get('apellido', '')}".strip(),
        area_nombre=area.get("nombre", "Sin área"),
        mes=int(row["mes"]),
        anio=int(row["anio"]),
        monto_bruto=bruto,
        monto_neto=bruto - cargas,
        total=float(row.get("total") or 0),
    )


class CostoRepo:
    def get_nomina_mes(self, mes: int, anio: int) -> List[NominaResponse]:
        res = (
            supabase_admin.table(_NOM)
            .select(_NOM_SEL)
            .eq("mes", mes).eq("anio", anio)
            .execute()
        )
        return [_to_nomina(r) for r in (res.data or [])]

    def save_nomina(self, data: NominaCreate) -> NominaResponse:
        cargas = max(0.0, data.monto_bruto - data.monto_neto)
        payload = {
            "empleado_id": data.empleado_id, "mes": data.mes, "anio": data.anio,
            "salario_bruto": data.monto_bruto, "cargas_sociales": cargas,
        }
        upsert_res = (
            supabase_admin.table(_NOM)
            .upsert(payload, on_conflict="empleado_id,anio,mes")
            .execute()
        )
        row_res = (
            supabase_admin.table(_NOM)
            .select(_NOM_SEL)
            .eq("id", upsert_res.data[0]["id"])
            .single()
            .execute()
        )
        return _to_nomina(row_res.data)

    def get_presupuesto_area(self, area_id: str, mes: int, anio: int) -> Optional[PresupuestoResponse]:
        res = (
            supabase_admin.table(_PRE)
            .select("id,area_id,mes,anio,monto_presupuestado,areas(nombre)")
            .eq("area_id", area_id).eq("mes", mes).eq("anio", anio).eq("tipo_costo", "nomina")
            .execute()
        )
        if not res.data:
            return None
        r = res.data[0]
        area = r.get("areas") or {}
        return PresupuestoResponse(
            id=str(r["id"]), area_id=str(r["area_id"]),
            area_nombre=area.get("nombre", ""),
            mes=int(r["mes"]), anio=int(r["anio"]),
            presupuesto=float(r["monto_presupuestado"]),
        )

    def save_presupuesto(self, data: PresupuestoCreate) -> PresupuestoResponse:
        payload = {
            "area_id": data.area_id, "mes": data.mes, "anio": data.anio,
            "monto_presupuestado": data.presupuesto, "tipo_costo": "nomina",
        }
        supabase_admin.table(_PRE).upsert(payload, on_conflict="area_id,anio,mes,tipo_costo").execute()
        return self.get_presupuesto_area(data.area_id, data.mes, data.anio)  # type: ignore[return-value]

    def get_presupuestos_mes(self, mes: int, anio: int) -> dict[str, float]:
        res = (
            supabase_admin.table(_PRE)
            .select("monto_presupuestado,areas(nombre)")
            .eq("mes", mes).eq("anio", anio).eq("tipo_costo", "nomina")
            .execute()
        )
        return {
            (p.get("areas") or {}).get("nombre", ""): float(p["monto_presupuestado"])
            for p in (res.data or [])
            if (p.get("areas") or {}).get("nombre")
        }

    def get_evolucion(self, mes: int, anio: int) -> List[EvolucionMes]:
        periodos: list[tuple[int, int]] = []
        m, y = mes, anio
        for _ in range(12):
            periodos.append((m, y))
            m, y = _prev_period(m, y)
        min_y = min(y for _, y in periodos)
        res = (
            supabase_admin.table(_NOM)
            .select("mes,anio,total")
            .gte("anio", min_y).lte("anio", anio)
            .execute()
        )
        ps = set(periodos)
        totals: dict[tuple[int, int], float] = {}
        for r in (res.data or []):
            k = (int(r["mes"]), int(r["anio"]))
            if k in ps:
                totals[k] = totals.get(k, 0.0) + float(r.get("total") or 0)
        return [
            EvolucionMes(mes=m, anio=y, total=round(totals[(m, y)], 2))
            for m, y in reversed(periodos)
            if (m, y) in totals
        ]
