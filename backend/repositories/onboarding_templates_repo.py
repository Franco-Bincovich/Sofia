"""
Repositorio de templates de onboarding — CRUD de templates y tareas.
Interfaz: get_templates · get_template · create_template · update_template
          delete_template · add_tarea · update_tarea · delete_tarea
"""
from typing import Optional

from integrations.supabase_client import supabase_admin
from schemas.onboarding import TareaResponse, TemplateResponse
from utils.errors import AppError

_TT, _TMPL, _TI = "onboarding_tareas", "onboarding_templates", "onboarding_instancias"
_TT_COLS = f"{_TT}(id,template_id,nombre,descripcion,semana,orden)"


def _tarea(t: dict) -> TareaResponse:
    return TareaResponse(id=t["id"], template_id=t["template_id"], titulo=t["nombre"],
                         descripcion=t.get("descripcion"), semana=t.get("semana", 1), orden=t.get("orden", 1))


class OnboardingTemplatesRepo:
    def get_templates(self) -> list[TemplateResponse]:
        """Retorna todos los templates activos con conteo de tareas."""
        res = supabase_admin.table(_TMPL).select(f"id,nombre,descripcion,{_TT}(id)").eq("activo", True).execute()
        return [
            TemplateResponse(id=r["id"], nombre=r["nombre"], descripcion=r.get("descripcion"),
                             tareas=[], tareas_total=len(r.get("onboarding_tareas") or []))
            for r in (res.data or [])
        ]

    def get_template(self, template_id: str) -> Optional[TemplateResponse]:
        """Retorna un template con todas sus tareas ordenadas por semana y orden."""
        res = supabase_admin.table(_TMPL).select(f"id,nombre,descripcion,{_TT_COLS}").eq(
            "id", template_id).eq("activo", True).maybe_single().execute()
        if res is None or not res.data:
            return None
        r = res.data
        tareas = [_tarea(t) for t in sorted(
            r.get("onboarding_tareas") or [],
            key=lambda x: (x.get("semana", 1), x.get("orden", 1)),
        )]
        return TemplateResponse(id=r["id"], nombre=r["nombre"], descripcion=r.get("descripcion"),
                                tareas=tareas, tareas_total=len(tareas))

    def create_template(self, nombre: str, descripcion: Optional[str]) -> TemplateResponse:
        """Crea un nuevo template de onboarding."""
        res = supabase_admin.table(_TMPL).insert({"nombre": nombre, "descripcion": descripcion, "activo": True}).execute()
        if not res.data:
            raise AppError("Error al crear template", "DB_ERROR", 500)
        r = res.data[0]
        return TemplateResponse(id=r["id"], nombre=r["nombre"], descripcion=r.get("descripcion"), tareas=[], tareas_total=0)

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

    def add_tarea(self, template_id: str, data: dict) -> TareaResponse:
        """Agrega una tarea al template."""
        res = supabase_admin.table(_TT).insert({
            "template_id": template_id, "nombre": data["titulo"],
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
