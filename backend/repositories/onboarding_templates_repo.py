"""
Repositorio de templates de onboarding — CRUD de templates y tareas.
Interfaz: get_templates · get_template · create_template · update_template
          delete_template · add_tarea · update_tarea · delete_tarea
"""
from typing import Optional
from uuid import UUID

from integrations.supabase_client import supabase_admin
from schemas.onboarding import TareaResponse, TemplateResponse
from utils.errors import AppError

_TT, _TMPL, _TI = "onboarding_tareas", "onboarding_templates", "onboarding_instancias"
_TT_COLS = f"{_TT}(id,template_id,nombre,descripcion,semana,orden)"


def _with_empresa(q, empresa_id: Optional[UUID]):
    return q.eq("empresa_id", str(empresa_id)) if empresa_id else q


def _tarea(t: dict) -> TareaResponse:
    return TareaResponse(id=t["id"], template_id=t["template_id"], titulo=t["nombre"],
                         descripcion=t.get("descripcion"), semana=t.get("semana", 1), orden=t.get("orden", 1))


class OnboardingTemplatesRepo:
    def get_templates(self, empresa_id: Optional[UUID] = None) -> list[TemplateResponse]:
        """Retorna todos los templates activos con conteo de tareas, filtrado por empresa."""
        q = supabase_admin.table(_TMPL).select(f"id,empresa_id,nombre,descripcion,empresas(nombre),{_TT}(id)").eq("activo", True)
        return [
            TemplateResponse(
                id=r["id"], nombre=r["nombre"], descripcion=r.get("descripcion"),
                empresa_id=r.get("empresa_id"), empresa_nombre=(r.get("empresas") or {}).get("nombre"),
                tareas=[], tareas_total=len(r.get("onboarding_tareas") or []),
            )
            for r in (_with_empresa(q, empresa_id).execute().data or [])
        ]

    def get_template(self, template_id: str, empresa_id: Optional[UUID] = None) -> Optional[TemplateResponse]:
        """Retorna un template con todas sus tareas ordenadas por semana y orden."""
        q = supabase_admin.table(_TMPL).select(f"id,empresa_id,nombre,descripcion,empresas(nombre),{_TT_COLS}").eq("id", template_id).eq("activo", True)
        res = _with_empresa(q, empresa_id).maybe_single().execute()
        if not (res and res.data):
            return None
        r = res.data
        tareas = sorted([_tarea(t) for t in (r.get("onboarding_tareas") or [])], key=lambda x: (x.semana, x.orden))
        return TemplateResponse(id=r["id"], nombre=r["nombre"], descripcion=r.get("descripcion"),
                                empresa_id=r.get("empresa_id"), empresa_nombre=(r.get("empresas") or {}).get("nombre"),
                                tareas=tareas, tareas_total=len(tareas))

    def create_template(self, nombre: str, descripcion: Optional[str], empresa_id: UUID) -> TemplateResponse:
        """Crea un nuevo template de onboarding asociado a la empresa indicada."""
        res = supabase_admin.table(_TMPL).insert({"nombre": nombre, "descripcion": descripcion, "activo": True, "empresa_id": str(empresa_id)}).execute()
        if not res.data:
            raise AppError("Error al crear template", "DB_ERROR", 500)
        r = res.data[0]
        return TemplateResponse(id=r["id"], nombre=r["nombre"], descripcion=r.get("descripcion"),
                                empresa_id=r.get("empresa_id"), tareas=[], tareas_total=0)

    def update_template(self, template_id: str, data: dict) -> Optional[TemplateResponse]:
        """Actualiza nombre y/o descripción de un template."""
        res = supabase_admin.table(_TMPL).update(data).eq("id", template_id).eq("activo", True).execute()
        return self.get_template(template_id) if res.data else None

    def delete_template(self, template_id: str) -> bool:
        """Soft delete si tiene instancias; hard delete si no."""
        has_inst = bool(supabase_admin.table(_TI).select("id").eq("template_id", template_id).limit(1).execute().data)
        if has_inst:
            supabase_admin.table(_TMPL).update({"activo": False}).eq("id", template_id).execute()
        else:
            supabase_admin.table(_TMPL).delete().eq("id", template_id).execute()
        return True

    def add_tarea(self, template_id: str, data: dict, empresa_id: str) -> TareaResponse:
        """Agrega una tarea al template, heredando el empresa_id de la plantilla."""
        res = supabase_admin.table(_TT).insert({
            "template_id": template_id, "empresa_id": str(empresa_id), "nombre": data["titulo"],
            "descripcion": data.get("descripcion"), "semana": data["semana"],
            "orden": data["orden"], "responsable_tipo": data.get("responsable_tipo", "rrhh"),
            "dias_limite": data.get("dias_limite", 1),
        }).execute()
        if not res.data:
            raise AppError("Error al agregar tarea", "DB_ERROR", 500)
        return _tarea(res.data[0])

    def update_tarea(self, tarea_id: str, data: dict) -> Optional[TareaResponse]:
        """Actualiza los campos provistos de una tarea."""
        payload = {k: v for k, v in {"nombre": data.get("titulo"), "descripcion": data.get("descripcion"),
                                      "semana": data.get("semana"), "orden": data.get("orden")}.items() if v is not None}
        if not payload:
            return None
        res = supabase_admin.table(_TT).update(payload).eq("id", tarea_id).execute()
        return _tarea(res.data[0]) if res.data else None

    def delete_tarea(self, tarea_id: str) -> bool:
        """Elimina una tarea del template."""
        supabase_admin.table(_TT).delete().eq("id", tarea_id).execute()
        return True
