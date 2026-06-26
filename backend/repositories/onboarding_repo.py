"""
Repositorio de onboarding — queries Supabase.
Interfaz: find_instancias_activas · find_instancia_by_empleado · create_instancia
          get_progreso · completar_tarea · get_default_template
"""
from datetime import date, datetime, timedelta
from typing import Optional
from uuid import UUID

from integrations.supabase_client import supabase_admin
from schemas.onboarding import InstanciaDetalleResponse, InstanciaResponse, TareaProgresoResponse, TemplateResponse
from utils.errors import AppError

_TI, _TP, _TT, _TMPL = "onboarding_instancias", "onboarding_progreso", "onboarding_tareas", "onboarding_templates"
_EJ = "empleados!onboarding_instancias_empleado_id_fkey(nombre,apellido,roles,areas!empleados_area_id_fkey(nombre)), empresas(nombre)"
_EXCL = ["completado", "cancelado"]


def _with_empresa(q, empresa_id: Optional[UUID]):
    return q.eq("empresa_id", str(empresa_id)) if empresa_id else q


def _inst_row(r: dict, progs: Optional[list] = None) -> InstanciaResponse:
    emp = r.get("empleados") or {}
    area = emp.get("areas") or {}
    empresa = r.get("empresas") or {}
    ps = progs if progs is not None else (r.get("onboarding_progreso") or [])
    total = len(ps)
    done = sum(1 for p in ps if p.get("estado") == "completado")
    return InstanciaResponse(
        id=r["id"], empleado_id=r["empleado_id"],
        empresa_id=r.get("empresa_id"), empresa_nombre=empresa.get("nombre"),
        empleado_nombre=f"{emp.get('nombre', '')} {emp.get('apellido', '')}".strip(),
        empleado_cargo=(emp.get("roles") or [emp.get("cargo")])[0], empleado_area=area.get("nombre"),
        template_id=r["template_id"], estado=r["estado"],
        fecha_inicio=str(r.get("fecha_inicio", "")),
        progreso=round(done / total * 100) if total else 0,
        tareas_completadas=done, tareas_total=total,
    )


def _tarea_row(p: dict) -> TareaProgresoResponse:
    t = p.get("onboarding_tareas") or {}
    return TareaProgresoResponse(progreso_id=p["id"], tarea_id=p["tarea_id"], titulo=t.get("nombre", ""),
                                 descripcion=t.get("descripcion"), semana=t.get("semana", 1), orden=t.get("orden", 1),
                                 completada=p.get("estado") == "completado")


class OnboardingRepo:
    def find_instancias_activas(self, empresa_id: Optional[UUID] = None) -> list[InstanciaResponse]:
        q = supabase_admin.table(_TI).select(f"*, {_EJ}, onboarding_progreso!onb_prog_instancia_emp_fkey(estado)").not_.in_("estado", _EXCL)
        return [_inst_row(r) for r in (_with_empresa(q, empresa_id).execute().data or [])]

    def find_instancia_by_empleado(self, empleado_id: str, empresa_id: Optional[UUID] = None) -> Optional[InstanciaResponse]:
        q = supabase_admin.table(_TI).select(f"*, {_EJ}, onboarding_progreso!onb_prog_instancia_emp_fkey(estado)").eq("empleado_id", empleado_id).not_.in_("estado", _EXCL).limit(1)
        res = _with_empresa(q, empresa_id).maybe_single().execute()
        if res is None or not res.data:
            return None
        return _inst_row(res.data)

    def get_progreso(self, instancia_id: str) -> Optional[InstanciaDetalleResponse]:
        inst = supabase_admin.table(_TI).select(f"*, {_EJ}").eq("id", instancia_id).maybe_single().execute()
        if not (inst and inst.data):
            return None
        progs = supabase_admin.table(_TP).select(f"id,tarea_id,estado,{_TT}!onboarding_progreso_tarea_id_fkey(nombre,descripcion,semana,orden)").eq("instancia_id", instancia_id).execute().data or []
        base = _inst_row(inst.data, progs)
        tareas = sorted([_tarea_row(p) for p in progs], key=lambda t: (t.semana, t.orden))
        return InstanciaDetalleResponse(**base.model_dump(), tareas=tareas)

    def create_instancia(self, empleado_id: str, template_id: str, empresa_id: str) -> InstanciaResponse:
        hoy = date.today()
        ins = supabase_admin.table(_TI).insert({
            "empleado_id": empleado_id, "template_id": template_id, "empresa_id": empresa_id,
            "estado": "en_progreso", "fecha_inicio": str(hoy),
            "fecha_fin_esperada": str(hoy + timedelta(days=30)),
        }).execute()
        if not ins.data:
            raise AppError("Error al crear onboarding", "DB_ERROR", 500)
        inst_id = ins.data[0]["id"]
        tareas = supabase_admin.table(_TT).select("id").eq("template_id", template_id).execute()
        if tareas.data:
            supabase_admin.table(_TP).insert([
                {"instancia_id": inst_id, "tarea_id": t["id"], "estado": "pendiente", "empresa_id": empresa_id}
                for t in tareas.data
            ]).execute()
        return self.find_instancia_by_empleado(empleado_id) or _inst_row(ins.data[0], [])

    def completar_tarea(self, instancia_id: str, tarea_id: str) -> bool:
        res = supabase_admin.table(_TP).update({"estado": "completado", "fecha_completada": datetime.utcnow().isoformat()}).eq("instancia_id", instancia_id).eq("tarea_id", tarea_id).execute()
        return bool(res.data)

    def get_default_template(self, empresa_id: Optional[UUID] = None) -> Optional[TemplateResponse]:
        """Retorna el primer template activo de la empresa indicada (plantilla por defecto)."""
        q = supabase_admin.table(_TMPL).select("id,empresa_id,nombre,descripcion").eq("activo", True).limit(1)
        res = _with_empresa(q, empresa_id).maybe_single().execute()
        if res is None or not res.data:
            return None
        d = res.data
        return TemplateResponse(id=d["id"], nombre=d["nombre"], descripcion=d.get("descripcion"),
                                empresa_id=d.get("empresa_id"), tareas=[])
