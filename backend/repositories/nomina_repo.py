"""
Repositorio de nómina (costos_nomina). Acceso a Supabase con supabase_admin.
Interfaz pública: get_nomina_mes · save_nomina · get_evolucion
empresa_id en escritura se hereda automáticamente del empleado (no se solicita explícito).
Todas las lecturas y el cálculo de evolución filtran por empresa_id cuando se provee.
"""
from typing import List, Optional
from uuid import UUID

from integrations.supabase_client import supabase_admin
from schemas.costo import EvolucionMes, NominaCreate, NominaResponse
from utils.errors import AppError

_NOM = "costos_nomina"
_NOM_SEL = (
    "id,empleado_id,empresa_id,mes,anio,salario_bruto,cargas_sociales,total,"
    "empleados!costos_nomina_empleado_emp_fkey(nombre,apellido,areas!empleados_area_id_fkey(nombre)),"
    "empresas(nombre)"
)


def _prev_period(mes: int, anio: int) -> tuple[int, int]:
    return (mes - 1, anio) if mes > 1 else (12, anio - 1)


def _to_nomina(row: dict) -> NominaResponse:
    emp = row.get("empleados") or {}
    area = emp.get("areas") or {}
    empresa = row.get("empresas") or {}
    bruto = float(row.get("salario_bruto") or 0)
    cargas = float(row.get("cargas_sociales") or 0)
    return NominaResponse(
        id=str(row["id"]),
        empleado_id=str(row["empleado_id"]),
        empresa_id=str(row["empresa_id"]) if row.get("empresa_id") else None,
        empresa_nombre=empresa.get("nombre"),
        empleado_nombre=f"{emp.get('nombre', '')} {emp.get('apellido', '')}".strip(),
        area_nombre=area.get("nombre", "Sin área"),
        mes=int(row["mes"]),
        anio=int(row["anio"]),
        monto_bruto=bruto,
        monto_neto=bruto - cargas,
        total=float(row.get("total") or 0),
    )


class NominaRepo:
    def get_nomina_mes(self, mes: int, anio: int, empresa_id: Optional[UUID] = None) -> List[NominaResponse]:
        """Retorna nómina del período. Si empresa_id se provee, filtra — sin mezclar empresas."""
        q = supabase_admin.table(_NOM).select(_NOM_SEL).eq("mes", mes).eq("anio", anio)
        if empresa_id:
            q = q.eq("empresa_id", str(empresa_id))
        return [_to_nomina(r) for r in (q.execute().data or [])]

    def save_nomina(self, data: NominaCreate) -> NominaResponse:
        """Upsert de nómina. empresa_id se hereda del empleado (FK compuesta garantiza coherencia)."""
        emp_res = (
            supabase_admin.table("empleados")
            .select("empresa_id")
            .eq("id", data.empleado_id)
            .maybe_single()
            .execute()
        )
        if not emp_res.data or not emp_res.data.get("empresa_id"):
            raise AppError("Empleado no encontrado", "EMPLEADO_NOT_FOUND", 404)
        cargas = max(0.0, data.monto_bruto - data.monto_neto)
        payload = {
            "empleado_id": data.empleado_id, "mes": data.mes, "anio": data.anio,
            "salario_bruto": data.monto_bruto, "cargas_sociales": cargas,
            "empresa_id": str(emp_res.data["empresa_id"]),
        }
        upsert_res = supabase_admin.table(_NOM).upsert(payload, on_conflict="empleado_id,anio,mes").execute()
        row_res = (
            supabase_admin.table(_NOM).select(_NOM_SEL)
            .eq("id", upsert_res.data[0]["id"]).single().execute()
        )
        return _to_nomina(row_res.data)

    def get_evolucion(self, mes: int, anio: int, empresa_id: Optional[UUID] = None) -> List[EvolucionMes]:
        """
        Evolución de costos de los últimos 12 meses.
        CRÍTICO: filtra por empresa_id cuando se provee — no mezcla empresas en el SUM.
        """
        periodos: list[tuple[int, int]] = []
        m, y = mes, anio
        for _ in range(12):
            periodos.append((m, y))
            m, y = _prev_period(m, y)
        min_y = min(y for _, y in periodos)
        q = (
            supabase_admin.table(_NOM).select("mes,anio,total")
            .gte("anio", min_y).lte("anio", anio)
        )
        if empresa_id:
            q = q.eq("empresa_id", str(empresa_id))
        res = q.execute()
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
