"""
Repositorio de vacantes. Acceso a Supabase con supabase_admin.
Interfaz: find_all · find_by_id · save · update · update_estado
          find_candidatos · save_candidato · update_etapa_candidato
"""
import json
from typing import List, Optional

from integrations.supabase_client import supabase_admin
from schemas.vacante import CandidatoCreate, CandidatoResponse, VacanteCreate, VacanteResponse, VacanteUpdate
from utils.errors import AppError
from utils.logger import logger

_V = "vacantes"
_C = "candidatos"
_JOIN = "*, areas!vacantes_area_id_fkey(nombre)"


def _vrow(r: dict) -> VacanteResponse:
    reqs = r.get("requisitos", [])
    if isinstance(reqs, str):
        try:
            reqs = json.loads(reqs)
        except (json.JSONDecodeError, TypeError):
            reqs = []
    area = r.get("areas")
    data = {k: v for k, v in r.items() if k not in ("areas", "requisitos")}
    data["area_id"] = str(data["area_id"])
    data["area_nombre"] = area["nombre"] if isinstance(area, dict) else None
    data["requisitos"] = reqs if isinstance(reqs, list) else []
    return VacanteResponse.model_validate(data)


def _crow(r: dict) -> CandidatoResponse:
    return CandidatoResponse(
        id=str(r["id"]), vacante_id=str(r["vacante_id"]),
        nombre=r["nombre"], apellido=r["apellido"], email=r["email"],
        cargo_anterior=r.get("cargo_anterior"), empresa_anterior=r.get("empresa_anterior"),
        etapa_pipeline=r.get("etapa", "postulado"), score_ia=r.get("score_ia"),
        created_at=r["created_at"],
    )


class VacanteRepo:
    def find_all(self, estado: Optional[str] = None) -> List[VacanteResponse]:
        q = supabase_admin.table(_V).select(_JOIN).order("created_at", desc=True)
        if estado:
            q = q.eq("estado", estado)
        return [_vrow(r) for r in (q.execute().data or [])]

    def find_by_id(self, id: str) -> Optional[VacanteResponse]:
        res = supabase_admin.table(_V).select(_JOIN).eq("id", id).maybe_single().execute()
        return _vrow(res.data) if res.data else None

    def save(self, data: VacanteCreate) -> VacanteResponse:
        payload = data.model_dump()
        payload["area_id"] = str(payload["area_id"])
        payload["estado"] = "nueva"
        res = supabase_admin.table(_V).insert(payload).execute()
        if not res.data:
            logger.error("Supabase insert vacío en vacantes")
            raise AppError("Error al crear vacante", "DB_ERROR", 500)
        return self.find_by_id(str(res.data[0]["id"]))  # type: ignore[return-value]

    def update(self, id: str, data: VacanteUpdate) -> Optional[VacanteResponse]:
        patch = data.model_dump(exclude_none=True)
        if not patch:
            return self.find_by_id(id)
        if "area_id" in patch:
            patch["area_id"] = str(patch["area_id"])
        res = supabase_admin.table(_V).update(patch).eq("id", id).execute()
        return self.find_by_id(id) if res.data else None

    def update_estado(self, id: str, estado: str) -> Optional[VacanteResponse]:
        res = supabase_admin.table(_V).update({"estado": estado}).eq("id", id).execute()
        return self.find_by_id(id) if res.data else None

    def find_candidatos(self, vacante_id: str) -> List[CandidatoResponse]:
        res = supabase_admin.table(_C).select("*").eq("vacante_id", vacante_id).order("created_at").execute()
        return [_crow(r) for r in (res.data or [])]

    def save_candidato(self, vacante_id: str, data: CandidatoCreate) -> CandidatoResponse:
        payload = data.model_dump(exclude_none=True)
        payload["vacante_id"] = vacante_id
        payload["etapa"] = "postulado"
        res = supabase_admin.table(_C).insert(payload).execute()
        if not res.data:
            logger.error("Supabase insert vacío en candidatos")
            raise AppError("Error al crear candidato", "DB_ERROR", 500)
        return _crow(res.data[0])

    def update_etapa_candidato(self, candidato_id: str, etapa: str) -> Optional[CandidatoResponse]:
        res = supabase_admin.table(_C).update({"etapa": etapa}).eq("id", candidato_id).execute()
        return _crow(res.data[0]) if res.data else None
