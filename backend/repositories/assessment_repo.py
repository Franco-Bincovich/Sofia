"""
Repositorio Assessment Engine — queries Supabase.
"""
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from integrations.supabase_client import supabase_admin
from schemas.assessment import CampanaCreate, CampanaResponse, LinkCreate, LinkResponse, ResultadoResponse
from utils.errors import AppError

_CAMP, _LINK, _RES = "assessment_campanas", "assessment_links", "assessment_resultados"
_RES_Q = "*, assessment_links(nombre_destino, email_destino, campana_id, assessment_campanas(tipo))"
_TIPO_TO   = {"completo": "mixto"}
_TIPO_FROM = {"mixto": "completo"}


def _t_db(t: str) -> str: return _TIPO_TO.get(t, t)
def _t_api(t: str) -> str: return _TIPO_FROM.get(t, t)


def _camp_row(r: dict, total: int = 0, done: int = 0) -> CampanaResponse:
    return CampanaResponse(id=r["id"], nombre=r["nombre"], tipo=_t_api(r["tipo"]),
                           estado=r["estado"], links_enviados=total, completados=done,
                           created_at=r["created_at"])


def _link_row(r: dict) -> LinkResponse:
    return LinkResponse(id=r["id"], campana_id=r["campana_id"], token=r["token"],
                        evaluado_nombre=r.get("nombre_destino") or "",
                        evaluado_email=r.get("email_destino") or "",
                        completado=r.get("estado") == "completado", created_at=r["created_at"])


def _res_row(r: dict) -> ResultadoResponse:
    lnk  = r.get("assessment_links") or {}
    camp = lnk.get("assessment_campanas") or {}
    pun  = r.get("puntuacion") or {}
    perf = r.get("perfil_resultado") or {}
    return ResultadoResponse(id=r["id"], link_id=r["link_id"],
                             evaluado_nombre=lnk.get("nombre_destino") or "",
                             tipo=_t_api(camp.get("tipo") or ""),
                             fecha_completado=str(r["completado_en"]) if r.get("completado_en") else None,
                             perfil_dominante=perf.get("perfil_dominante"),
                             score_general=pun.get("general"), scores=pun)


class AssessmentRepo:
    def _counts(self, cid: str) -> tuple:
        rows = (supabase_admin.table(_LINK).select("estado").eq("campana_id", cid).execute().data or [])
        return len(rows), sum(1 for x in rows if x["estado"] == "completado")

    def get_campanas(self) -> list:
        res = supabase_admin.table(_CAMP).select("*").order("created_at", desc=True).execute()
        return [_camp_row(r, *self._counts(r["id"])) for r in (res.data or [])]

    def get_campana(self, campana_id: str) -> CampanaResponse:
        res = supabase_admin.table(_CAMP).select("*").eq("id", campana_id).maybe_single().execute()
        if not (res and res.data): raise AppError("Campaña no encontrada", "CAMPANA_NOT_FOUND", 404)
        return _camp_row(res.data, *self._counts(campana_id))

    def create_campana(self, data: CampanaCreate) -> CampanaResponse:
        ins = supabase_admin.table(_CAMP).insert(
            {"nombre": data.nombre, "tipo": _t_db(data.tipo), "estado": "activa"}
        ).execute()
        if not ins.data: raise AppError("Error al crear campaña", "DB_ERROR", 500)
        return _camp_row(ins.data[0])

    def create_link(self, data: LinkCreate) -> LinkResponse:
        token = uuid.uuid4().hex + uuid.uuid4().hex
        ins = supabase_admin.table(_LINK).insert({
            "campana_id": str(data.campana_id), "email_destino": data.evaluado_email,
            "nombre_destino": data.evaluado_nombre, "token": token,
        }).execute()
        if not ins.data: raise AppError("Error al crear link", "DB_ERROR", 500)
        return _link_row(ins.data[0])

    def get_link_by_token(self, token: str) -> Optional[LinkResponse]:
        res = supabase_admin.table(_LINK).select("*").eq("token", token).maybe_single().execute()
        return _link_row(res.data) if (res and res.data) else None

    def get_resultados(self) -> list:
        res = supabase_admin.table(_RES).select(_RES_Q).order("created_at", desc=True).execute()
        return [_res_row(r) for r in (res.data or [])]

    def get_resultado(self, resultado_id: str) -> ResultadoResponse:
        res = supabase_admin.table(_RES).select(_RES_Q).eq("id", resultado_id).maybe_single().execute()
        if not (res and res.data): raise AppError("Resultado no encontrado", "RESULTADO_NOT_FOUND", 404)
        return _res_row(res.data)

    def save_resultado(self, link_id: str, campana_id: str, respuestas: list,
                       puntuacion: dict, perfil_resultado: dict) -> ResultadoResponse:
        now = datetime.now(timezone.utc).isoformat()
        ins = supabase_admin.table(_RES).insert({
            "link_id": link_id, "campana_id": campana_id, "respuestas": respuestas,
            "puntuacion": puntuacion, "perfil_resultado": perfil_resultado, "completado_en": now,
        }).execute()
        if not ins.data: raise AppError("Error al guardar resultado", "DB_ERROR", 500)
        supabase_admin.table(_LINK).update({"estado": "completado"}).eq("id", link_id).execute()
        return self.get_resultado(ins.data[0]["id"])
