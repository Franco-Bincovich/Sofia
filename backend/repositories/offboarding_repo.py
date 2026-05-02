"""
Repositorio de offboarding — queries Supabase.
Interfaz: find_activos · find_by_empleado · create_offboarding · update_activo
"""
from datetime import date, timedelta
from typing import Optional

from integrations.supabase_client import supabase_admin
from schemas.offboarding import ActivoResponse, OffboardingCreate, OffboardingResponse
from utils.errors import AppError

_OI = "offboarding_instancias"
_OA = "offboarding_activos"
_EJ = "empleados!offboarding_instancias_empleado_id_fkey(nombre,apellido,cargo)"
_EXCL = ["completado", "cancelado"]
_DEFAULT_ACTIVOS = [
    ("laptop",            "Computadora portátil de trabajo"),
    ("tarjeta_acceso",    "Tarjeta de acceso al edificio"),
    ("licencia_software", "Licencias de software corporativo"),
    ("celular",           "Teléfono corporativo"),
]


def _activo_row(r: dict) -> ActivoResponse:
    return ActivoResponse(
        id=r["id"], tipo_activo=r["tipo_activo"], descripcion=r.get("descripcion"),
        estado=r["estado"], devuelto=r["estado"] == "devuelto",
    )


def _inst_row(r: dict, activos: list) -> OffboardingResponse:
    emp = r.get("empleados") or {}
    total = len(activos)
    devueltos = sum(1 for a in activos if a.get("estado") == "devuelto")
    return OffboardingResponse(
        id=r["id"], empleado_id=r["empleado_id"],
        empleado_nombre=f"{emp.get('nombre', '')} {emp.get('apellido', '')}".strip(),
        motivo=r["motivo_egreso"], estado=r["estado"],
        fecha_inicio=str(r.get("created_at", ""))[:10],
        progreso=round(devueltos / total * 100) if total else 0,
        activos=[_activo_row(a) for a in activos], accesos=[],
    )


class OffboardingRepo:
    def _get_activos(self, instancia_id: str) -> list:
        res = supabase_admin.table(_OA).select("*").eq("instancia_id", instancia_id).execute()
        return res.data or []

    def find_activos(self) -> list[OffboardingResponse]:
        res = supabase_admin.table(_OI).select(f"*, {_EJ}").not_.in_("estado", _EXCL).execute()
        return [_inst_row(r, self._get_activos(r["id"])) for r in (res.data or [])]

    def find_by_empleado(self, empleado_id: str) -> Optional[OffboardingResponse]:
        res = supabase_admin.table(_OI).select(f"*, {_EJ}").eq(
            "empleado_id", empleado_id
        ).not_.in_("estado", _EXCL).limit(1).maybe_single().execute()
        if not res.data:
            return None
        return _inst_row(res.data, self._get_activos(res.data["id"]))

    def create_offboarding(self, data: OffboardingCreate) -> OffboardingResponse:
        fecha_fin = data.fecha_ultimo_dia or (date.today() + timedelta(days=30))
        ins = supabase_admin.table(_OI).insert({
            "empleado_id": str(data.empleado_id), "motivo_egreso": data.motivo,
            "descripcion_motivo": data.descripcion_motivo,
            "fecha_ultimo_dia": str(fecha_fin), "estado": "iniciado",
        }).execute()
        if not ins.data:
            raise AppError("Error al crear offboarding", "DB_ERROR", 500)
        inst_id = ins.data[0]["id"]
        supabase_admin.table(_OA).insert([
            {"instancia_id": inst_id, "tipo_activo": t, "descripcion": d, "estado": "pendiente"}
            for t, d in _DEFAULT_ACTIVOS
        ]).execute()
        return _inst_row(ins.data[0], self._get_activos(inst_id))

    def update_activo(self, instancia_id: str, activo_id: str, devuelto: bool) -> bool:
        patch: dict = {"estado": "devuelto" if devuelto else "pendiente"}
        if devuelto:
            patch["fecha_devolucion"] = str(date.today())
        res = supabase_admin.table(_OA).update(patch).eq("id", activo_id).eq(
            "instancia_id", instancia_id
        ).execute()
        return bool(res.data)
