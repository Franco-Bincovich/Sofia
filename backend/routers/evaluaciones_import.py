"""Router del import de evaluaciones (preview + confirmar). Gate EVALUACIONES + WRITE (solo
admin_rrhh). El preview parsea/resuelve sin persistir; el confirmar persiste lo aprobado."""
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile

from schemas.evaluacion_import_api import ConfirmarRequest, ConfirmarResponse, PreviewResponse
from services.evaluacion_import_orchestrator import EvaluacionImportOrchestrator
from utils.files import ALLOWED_TYPES_CSV, MAX_SIZE_CSV, validate_upload
from utils.permisos import Accion, Seccion, require_permission

router = APIRouter()
_GATE = [Depends(require_permission(Seccion.EVALUACIONES, Accion.WRITE))]


@router.post("/preview", response_model=PreviewResponse, dependencies=_GATE)
async def preview(
    empresa_id: str = Form(...),
    periodo: str = Form(...),
    notas: UploadFile = File(...),
    desglose: UploadFile = File(...),
) -> PreviewResponse:
    """Sube los dos CSV (notas finales + desglose), parsea y resuelve identidades sin persistir."""
    b_notas = await notas.read()
    validate_upload(b_notas, notas.content_type, ALLOWED_TYPES_CSV, MAX_SIZE_CSV, "CSV de notas finales")
    b_desglose = await desglose.read()
    validate_upload(b_desglose, desglose.content_type, ALLOWED_TYPES_CSV, MAX_SIZE_CSV, "CSV de desglose")
    return EvaluacionImportOrchestrator().preview(UUID(empresa_id), periodo, b_notas, b_desglose)


@router.post("/confirmar", response_model=ConfirmarResponse, dependencies=_GATE)
async def confirmar(body: ConfirmarRequest, request: Request) -> ConfirmarResponse:
    """Persiste el payload aprobado por el humano (no re-parsea ni re-resuelve)."""
    usuario_id = request.state.user.get("id")
    return EvaluacionImportOrchestrator().confirmar(body, usuario_id)
