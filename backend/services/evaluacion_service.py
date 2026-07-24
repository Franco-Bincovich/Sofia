"""
Servicio de resultados de evaluaciones importados (fase 1: persistir + leer).
Flujo: router → service → repository → DB. SIN lógica de import — el parser, el matcheo de
empleados y el reemplazo por reimport son fases posteriores. Acá solo se crea un lote, se
guardan sus evaluados y resultados (bulk), y se leen. El motor ev_* NO se usa (ver migración 078).
"""
from typing import List, Optional
from uuid import UUID

from repositories.evaluacion_repo import EvaluacionRepo
from schemas.evaluacion_resultados import (
    EvaluadoCreate, EvaluadoListResponse, EvaluadoResponse,
    LoteCreate, LoteListResponse, LoteResponse,
    ResultadoCreate, ResultadoListResponse,
)
from services._audit_payloads_ev import payload_baja_lote_evaluaciones
from services.audit_service import AuditService
from utils.errors import AppError
from utils.logger import logger


class EvaluacionService:
    def __init__(self, repo: Optional[EvaluacionRepo] = None,
                 audit: Optional[AuditService] = None) -> None:
        self._repo = repo or EvaluacionRepo()
        self._audit = audit or AuditService()

    # ── Escritura ──
    def crear_lote(self, data: LoteCreate) -> LoteResponse:
        """Crea el lote (período de importación). (empresa_id, periodo) es la llave lógica."""
        return self._repo.crear_lote({
            "empresa_id": str(data.empresa_id),
            "periodo": data.periodo,
            "importado_por": str(data.importado_por) if data.importado_por else None,
        })

    def guardar_evaluados(self, lote_id: UUID, filas: List[EvaluadoCreate]) -> List[EvaluadoResponse]:
        """Persiste los evaluados de un lote (bulk). Valida que el lote exista (404 si no)."""
        self._lote_or_404(lote_id)
        return self._repo.crear_evaluados([self._evaluado_dict(lote_id, f) for f in filas])

    def guardar_resultados(self, evaluado_id: UUID, filas: List[ResultadoCreate]) -> int:
        """Persiste los resultados de un evaluado (bulk). Devuelve cuántos insertó.

        La existencia del evaluado la garantiza la FK evaluado_id (falla el insert si es inválido);
        no se pre-consulta para no agregar un round-trip en el camino de import.
        """
        payload = [{
            "evaluado_id": str(evaluado_id), "tipo_evaluador": f.tipo_evaluador,
            "competencia": f.competencia, "orden": f.orden, "nota": f.nota,
        } for f in filas]
        return len(self._repo.crear_resultados(payload))

    def delete_lote(self, lote_id: UUID, empresa_id: Optional[UUID],
                    usuario_id: Optional[str] = None) -> None:
        """Elimina una importación completa: el CASCADE de las FK se lleva evaluados y resultados.

        Orden estricto: (1) exige empresa activa —en consolidado no se borra—, (2) carga el lote y
        valida que sea de esa empresa, (3) toma el snapshot ANTES de borrar (después del CASCADE no
        se puede reconstruir), (4) borra, (5) audita. Las equivalencias de nombres NO cascadean
        (cuelgan de empresa_id) y sobreviven a propósito: son el aprendizaje del matcheo.

        Raises: EMPRESA_REQUERIDA (400), LOTE_NOT_FOUND (404), DB_ERROR (500).
        """
        if empresa_id is None:
            raise AppError("Seleccioná una empresa para eliminar", "EMPRESA_REQUERIDA", 400)
        lote = self._repo.find_lote_by_id(str(lote_id))
        if not lote or str(lote.empresa_id) != str(empresa_id):
            # Mismo mensaje y code que "no existe": un lote de otra empresa no se confirma.
            raise AppError("Importación no encontrada", "LOTE_NOT_FOUND", 404)
        n_evaluados = len(self._repo.find_evaluados(str(lote_id)))
        if not self._repo.delete_lote(str(lote_id)):
            raise AppError("No se pudo eliminar la importación", "DB_ERROR", 500)
        self._audit.registrar(**payload_baja_lote_evaluaciones(
            str(lote_id), lote.periodo, str(lote.empresa_id), n_evaluados, usuario_id))
        logger.info("Importación de evaluaciones eliminada",
                    extra={"lote_id": str(lote_id), "periodo": lote.periodo})

    # ── Lectura ──
    def listar_lotes(self, empresa_id: Optional[UUID] = None) -> LoteListResponse:
        """Lista lotes, filtrados por la empresa activa si se indica."""
        items = self._repo.find_lotes(str(empresa_id) if empresa_id else None)
        return LoteListResponse(items=items, total=len(items))

    def get_lote(self, id: UUID) -> LoteResponse:
        """Lote por id. 404 si no existe."""
        return self._lote_or_404(id)

    def listar_evaluados(self, lote_id: UUID) -> EvaluadoListResponse:
        """Evaluados de un lote. Valida que el lote exista (404 si no)."""
        self._lote_or_404(lote_id)
        items = self._repo.find_evaluados(str(lote_id))
        return EvaluadoListResponse(items=items, total=len(items))

    def listar_resultados(self, evaluado_id: UUID) -> ResultadoListResponse:
        """Resultados de un evaluado, en el orden del archivo."""
        items = self._repo.find_resultados(str(evaluado_id))
        return ResultadoListResponse(items=items, total=len(items))

    # ── Helpers ──
    def _lote_or_404(self, id: UUID) -> LoteResponse:
        """Carga el lote o lanza 404."""
        lote = self._repo.find_lote_by_id(str(id))
        if not lote:
            raise AppError("Lote de evaluación no encontrado", "LOTE_NOT_FOUND", 404)
        return lote

    @staticmethod
    def _evaluado_dict(lote_id: UUID, f: EvaluadoCreate) -> dict:
        """Aplana un EvaluadoCreate a fila lista para insertar (UUIDs → str)."""
        return {
            "lote_id": str(lote_id),
            "empleado_id": str(f.empleado_id) if f.empleado_id else None,
            "nota_final": f.nota_final, "perfil": f.perfil,
            "organismo": f.organismo, "gerencia": f.gerencia, "sector": f.sector,
            "apellido_evaluado": f.apellido_evaluado, "nombre_evaluado": f.nombre_evaluado,
            "apellido_superior": f.apellido_superior, "nombre_superior": f.nombre_superior,
        }
