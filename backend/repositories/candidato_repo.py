"""
Repositorio de candidatos. Acceso a Supabase con supabase_admin.
Interfaz pública: find_candidatos · save_candidato · update_etapa_candidato
Todas las operaciones reciben empresa_id opcional para filtrado multiempresa.
"""
from typing import List, Optional
from uuid import UUID

from integrations.supabase_client import supabase_admin
from schemas.vacante import CandidatoCreate, CandidatoResponse
from utils.errors import AppError
from utils.logger import logger

_C = "candidatos"


def _crow(r: dict) -> CandidatoResponse:
    return CandidatoResponse(
        id=str(r["id"]), vacante_id=str(r["vacante_id"]),
        nombre=r["nombre"], apellido=r["apellido"], email=r["email"],
        cargo_anterior=r.get("cargo_anterior"), empresa_anterior=r.get("empresa_anterior"),
        etapa_pipeline=r.get("etapa", "postulado"), score_ia=r.get("score_ia"),
        created_at=r["created_at"],
    )


class CandidatoRepo:
    def find_candidatos(self, vacante_id: str, empresa_id: Optional[UUID] = None) -> List[CandidatoResponse]:
        """Retorna candidatos de una vacante, filtrados por empresa si se provee."""
        q = supabase_admin.table(_C).select("*").eq("vacante_id", vacante_id).order("created_at")
        if empresa_id:
            q = q.eq("empresa_id", str(empresa_id))
        return [_crow(r) for r in (q.execute().data or [])]

    def save_candidato(self, vacante_id: str, data: CandidatoCreate, empresa_id: str) -> CandidatoResponse:
        """Inserta un candidato con el empresa_id heredado de su vacante."""
        payload = data.model_dump(exclude_none=True)
        payload["vacante_id"] = vacante_id
        payload["empresa_id"] = empresa_id
        payload["etapa"] = "postulado"
        res = supabase_admin.table(_C).insert(payload).execute()
        if not res.data:
            logger.error("Supabase insert vacío en candidatos")
            raise AppError("Error al crear candidato", "DB_ERROR", 500)
        return _crow(res.data[0])

    def update_etapa_candidato(self, candidato_id: str, etapa: str, empresa_id: Optional[UUID] = None) -> Optional[CandidatoResponse]:
        """Actualiza la etapa del pipeline de un candidato."""
        q = supabase_admin.table(_C).update({"etapa": etapa}).eq("id", candidato_id)
        if empresa_id:
            q = q.eq("empresa_id", str(empresa_id))
        res = q.execute()
        return _crow(res.data[0]) if res.data else None
