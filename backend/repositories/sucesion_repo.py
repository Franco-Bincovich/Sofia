"""
Repositorio de sucesión — queries Supabase.
Interfaz: get_mapa_talento · get_planes_carrera · get_plan_by_empleado
          create_plan · update_readiness · get_hitos · completar_hito
          get_analisis_posicion
"""
from datetime import date
from typing import Optional

from integrations.supabase_client import supabase_admin
from schemas.sucesion import (
    EmpleadoAnalisisResponse, EmpleadoMapaResponse,
    HitoResponse, PlanCarreraCreate, PlanCarreraResponse,
)
from utils.errors import AppError

_EMP, _PC, _HIT = "empleados", "planes_carrera", "planes_carrera_hitos"
_AREA = "areas!empleados_area_id_fkey(nombre)"
_EJ = "empleados!planes_carrera_empleado_id_fkey(nombre,apellido,cargo)"
_PC_SELECT = f"*, {_EJ}, planes_carrera_hitos(estado)"


def _mapa_row(r: dict) -> EmpleadoMapaResponse:
    area = r.get("areas") or {}
    return EmpleadoMapaResponse(
        id=r["id"], nombre=r["nombre"], apellido=r["apellido"],
        cargo=r.get("cargo"), area_id=r.get("area_id"), area_nombre=area.get("nombre"),
        potencial=r.get("potencial", "medio"), desempeno=r.get("desempeno", "medio"),
    )


def _plan_row(r: dict) -> PlanCarreraResponse:
    emp = r.get("empleados") or {}
    hitos = r.get("planes_carrera_hitos") or []
    done = sum(1 for h in hitos if h.get("estado") == "completado")
    return PlanCarreraResponse(
        id=r["id"], empleado_id=r["empleado_id"],
        empleado_nombre=f"{emp.get('nombre', '')} {emp.get('apellido', '')}".strip(),
        cargo_actual=emp.get("cargo"), cargo_objetivo=r["cargo_objetivo"],
        fecha_objetivo=str(r["fecha_objetivo"]) if r.get("fecha_objetivo") else None,
        readiness=r.get("progreso", 0), hitos_completados=done, hitos_total=len(hitos),
    )


def _hito_row(r: dict) -> HitoResponse:
    return HitoResponse(
        id=r["id"], plan_id=r["plan_id"], titulo=r["nombre"],
        descripcion=r.get("descripcion"), completado=r.get("estado") == "completado",
        fecha_objetivo=str(r["fecha_objetivo"]) if r.get("fecha_objetivo") else None,
    )


class SucesionRepo:
    def get_mapa_talento(self) -> list[EmpleadoMapaResponse]:
        res = supabase_admin.table(_EMP).select(
            f"id,nombre,apellido,cargo,area_id,potencial,desempeno,{_AREA}"
        ).eq("estado", "activo").execute()
        return [_mapa_row(r) for r in (res.data or [])]

    def get_planes_carrera(self) -> list[PlanCarreraResponse]:
        res = supabase_admin.table(_PC).select(_PC_SELECT).eq("estado", "activo").execute()
        return [_plan_row(r) for r in (res.data or [])]

    def get_plan_by_empleado(self, empleado_id: str) -> Optional[PlanCarreraResponse]:
        res = supabase_admin.table(_PC).select(_PC_SELECT).eq(
            "empleado_id", empleado_id
        ).eq("estado", "activo").limit(1).maybe_single().execute()
        return _plan_row(res.data) if (res and res.data) else None

    def _fetch_plan_by_id(self, plan_id: str) -> Optional[PlanCarreraResponse]:
        res = supabase_admin.table(_PC).select(_PC_SELECT).eq("id", plan_id).maybe_single().execute()
        return _plan_row(res.data) if (res and res.data) else None

    def create_plan(self, data: PlanCarreraCreate) -> PlanCarreraResponse:
        ins = supabase_admin.table(_PC).insert({
            "empleado_id": str(data.empleado_id), "cargo_objetivo": data.cargo_objetivo,
            "fecha_objetivo": str(data.fecha_objetivo) if data.fecha_objetivo else None,
            "progreso": data.readiness,
        }).execute()
        if not ins.data:
            raise AppError("Error al crear plan de carrera", "DB_ERROR", 500)
        plan = self._fetch_plan_by_id(ins.data[0]["id"])
        if not plan:
            raise AppError("Error al recuperar el plan creado", "DB_ERROR", 500)
        return plan

    def update_readiness(self, plan_id: str, readiness: int) -> PlanCarreraResponse:
        upd = supabase_admin.table(_PC).update({"progreso": readiness}).eq("id", plan_id).execute()
        if not upd.data:
            raise AppError("Plan no encontrado", "PLAN_NOT_FOUND", 404)
        plan = self._fetch_plan_by_id(plan_id)
        if not plan:
            raise AppError("Plan no encontrado", "PLAN_NOT_FOUND", 404)
        return plan

    def get_hitos(self, plan_id: str) -> list[HitoResponse]:
        res = supabase_admin.table(_HIT).select("*").eq("plan_id", plan_id).execute()
        return [_hito_row(r) for r in (res.data or [])]

    def create_hito(self, plan_id: str, titulo: str,
                    descripcion: Optional[str], fecha_objetivo: Optional[str]) -> HitoResponse:
        payload: dict = {"plan_id": plan_id, "nombre": titulo}
        if descripcion: payload["descripcion"] = descripcion
        if fecha_objetivo: payload["fecha_objetivo"] = fecha_objetivo
        ins = supabase_admin.table(_HIT).insert(payload).execute()
        if not ins.data:
            raise AppError("Error al crear hito", "DB_ERROR", 500)
        return _hito_row(ins.data[0])

    def completar_hito(self, hito_id: str) -> bool:
        res = supabase_admin.table(_HIT).update({
            "estado": "completado", "fecha_completada": date.today().isoformat(),
        }).eq("id", hito_id).execute()
        return bool(res.data)

    def get_analisis_posicion(self, area_id: str) -> list[EmpleadoAnalisisResponse]:
        qr = supabase_admin.table(_EMP).select(
            "id, nombre, apellido, cargo, potencial, desempeno, "
            "assessment_links!assessment_links_empleado_id_fkey(assessment_resultados(puntuacion))"
        ).eq("area_id", area_id).eq("estado", "activo").execute()

        rows: list[EmpleadoAnalisisResponse] = []
        for r in (qr.data or []):
            best: Optional[int] = None
            for lnk in (r.get("assessment_links") or []):
                for item in (lnk.get("assessment_resultados") or []):
                    sg = (item.get("puntuacion") or {}).get("general")
                    if sg is not None and (best is None or int(sg) > best):
                        best = int(sg)
            rows.append(EmpleadoAnalisisResponse(
                id=r["id"], nombre=r["nombre"], apellido=r["apellido"],
                cargo=r.get("cargo"), score=best,
                potencial=r.get("potencial"), desempeno=r.get("desempeno"),
            ))

        rows.sort(key=lambda x: (x.score is None, -(x.score or 0)))
        return rows
