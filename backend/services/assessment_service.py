"""
Servicio de Assessment Engine — lógica de negocio.
Flujo: router → service → repository → DB
"""
from typing import Optional
from uuid import UUID

from repositories.assessment_repo import AssessmentRepo
from schemas.assessment import (
    CampanaCreate, CampanaResponse, LinkCreate, LinkResponse,
    ResultadoResponse, RespuestaCreate,
)
from utils.errors import AppError
from utils.logger import logger

_SELF_MAP  = {1: "apertura", 2: "responsabilidad", 3: "estabilidad", 4: "amabilidad", 5: "sociabilidad"}
_COG_OK    = {1: 2, 2: 2, 3: 3}
_TEC_OK    = {1: 2, 2: 2}
_AREAS_SET = frozenset(_SELF_MAP.values())


def _compute_scores(respuestas: list) -> tuple:
    """
    Calcula puntuación AREAS (Likert×20), cognitivo y técnico (MC) desde respuestas raw.
    Retorna (puntuacion_dict, perfil_resultado_dict) con scores por dimensión + general.
    """
    areas: dict = {k: [] for k in _SELF_MAP.values()}
    cog: list = []
    tec: list = []
    for r in respuestas:
        t, pid, resp = r.get("tipo"), r.get("pregunta_id"), r.get("respuesta")
        if t == "self" and pid in _SELF_MAP:
            areas[_SELF_MAP[pid]].append((resp or 1) * 20)
        elif t == "cognitivo" and pid in _COG_OK:
            cog.append(100 if resp == _COG_OK[pid] else 0)
        elif t == "tecnico" and pid in _TEC_OK:
            tec.append(100 if resp == _TEC_OK[pid] else 0)
    pun: dict = {k: int(sum(v) / len(v)) if v else 0 for k, v in areas.items()}
    if cog: pun["cognitivo"] = int(sum(cog) / len(cog))
    if tec: pun["tecnico"]   = int(sum(tec) / len(tec))
    vals = list(pun.values())
    pun["general"] = int(sum(vals) / len(vals)) if vals else 0
    dom = max((k for k in pun if k in _AREAS_SET), key=lambda k: pun[k], default=None)
    return pun, {"perfil_dominante": dom.capitalize() if dom else None, "score_general": pun.get("general")}


class AssessmentService:
    def __init__(self, repo: Optional[AssessmentRepo] = None) -> None:
        self._repo = repo or AssessmentRepo()

    def get_campanas(self) -> list:
        """Retorna todas las campañas de evaluación ordenadas por fecha de creación."""
        return self._repo.get_campanas()

    def create_campana(self, data: CampanaCreate) -> CampanaResponse:
        """
        Crea una nueva campaña de evaluación con estado 'activa'.

        Args:
            data: CampanaCreate con nombre y tipo (completo|conductual|cognitivo).

        Returns:
            CampanaResponse con la campaña recién creada.
        """
        campana = self._repo.create_campana(data)
        logger.info("Campaña de assessment creada",
                    extra={"campana_id": str(campana.id), "tipo": campana.tipo})
        return campana

    def create_link(self, data: LinkCreate) -> LinkResponse:
        """
        Crea un link de evaluación con token UUID. Valida que la campaña exista.

        Args:
            data: LinkCreate con campana_id, evaluado_nombre y evaluado_email.

        Returns:
            LinkResponse con el token generado.
        """
        self._repo.get_campana(str(data.campana_id))
        link = self._repo.create_link(data)
        logger.info("Link de assessment creado",
                    extra={"link_id": str(link.id), "email": link.evaluado_email})
        return link

    def get_evaluacion(self, token: str) -> LinkResponse:
        """
        Retorna el link por token para la ruta pública de evaluación.
        Lanza TOKEN_NOT_FOUND (404) si no existe o TOKEN_ALREADY_COMPLETED (409) si ya fue completado.
        """
        link = self._repo.get_link_by_token(token)
        if not link:
            raise AppError("Token de evaluación no encontrado", "TOKEN_NOT_FOUND", 404)
        if link.completado:
            raise AppError("Esta evaluación ya fue completada", "TOKEN_ALREADY_COMPLETED", 409)
        return link

    def submit_evaluacion(self, token: str, data: RespuestaCreate) -> ResultadoResponse:
        """
        Procesa respuestas: calcula scores AREAS + cognitivo + técnico y persiste el resultado.
        Lanza TOKEN_NOT_FOUND (404) si el token no existe o TOKEN_ALREADY_COMPLETED (409).

        Args:
            token: Token del link de evaluación.
            data: RespuestaCreate con lista de respuestas {tipo, pregunta_id, respuesta}.

        Returns:
            ResultadoResponse con scores calculados y perfil dominante.
        """
        link = self._repo.get_link_by_token(token)
        if not link:
            raise AppError("Token de evaluación no encontrado", "TOKEN_NOT_FOUND", 404)
        if link.completado:
            raise AppError("Esta evaluación ya fue completada", "TOKEN_ALREADY_COMPLETED", 409)
        puntuacion, perfil = _compute_scores(data.respuestas)
        resultado = self._repo.save_resultado(
            link_id=str(link.id), campana_id=str(link.campana_id),
            respuestas=data.respuestas, puntuacion=puntuacion, perfil_resultado=perfil,
        )
        logger.info("Evaluación completada",
                    extra={"link_id": str(link.id), "score": puntuacion.get("general")})
        return resultado

    def get_resultados(self) -> list:
        """Retorna todos los resultados de assessments completados."""
        return self._repo.get_resultados()

    def get_resultado(self, resultado_id: UUID) -> ResultadoResponse:
        """
        Retorna el detalle de un resultado. Lanza RESULTADO_NOT_FOUND (404) si no existe.
        """
        return self._repo.get_resultado(str(resultado_id))
