"""Empaquetado de descarga de reportes: dataclass + filename sanitizado + media_type por formato.

Helper de reporte_export_service (over-limit): la lógica pura de "qué archivo y cómo se llama"
vive acá para no crecer ese archivo. El router solo traduce ReporteDescarga a una respuesta HTTP.
"""
import re
from dataclasses import dataclass
from typing import Literal
from uuid import UUID

_SAFE_NAME_RE = re.compile(r"[^\w\s\-áéíóúüñÁÉÍÓÚÜÑ]")

_FORMATO_META: dict[str, tuple[str, str]] = {
    "pdf": ("application/pdf", "pdf"),
    "excel": ("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx"),
}


@dataclass(frozen=True)
class ReporteDescarga:
    """Datos listos para que el router arme la respuesta HTTP de descarga."""

    content: bytes
    filename: str
    media_type: str


def empaquetar_descarga(
    content: bytes, reporte_id: UUID, formato: Literal["pdf", "excel"]
) -> ReporteDescarga:
    """Arma el filename sanitizado y el media_type de una descarga de reporte. Función pura."""
    media_type, ext = _FORMATO_META[formato]
    safe = _SAFE_NAME_RE.sub("", str(reporte_id))[:40]
    return ReporteDescarga(content, f"reporte_{safe}.{ext}", media_type)
