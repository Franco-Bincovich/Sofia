"""Empaquetado genérico de descargas: dataclass + filename sanitizado + media_type por formato.

Núcleo compartido del motor de export. Recibe el contenido ya renderizado más el nombre base
del archivo y produce un Descarga listo para que el router arme la respuesta HTTP.
Generaliza el viejo _reporte_export_descarga (de 2 a 4 formatos).
"""
import re
from dataclasses import dataclass

_SAFE_NAME_RE = re.compile(r"[^\w\s\-áéíóúüñÁÉÍÓÚÜÑ]")
# Límite holgado a propósito: el filename más largo de hoy ("reporte_<uuid>" = 44 chars)
# queda intacto, garantizando que en E2 los reportes mantengan su nombre byte-idéntico.
_MAX_FILENAME = 80

FORMATO_META: dict[str, tuple[str, str]] = {
    "pdf":   ("application/pdf", "pdf"),
    "excel": ("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx"),
    "csv":   ("text/csv; charset=utf-8", "csv"),
    "word":  ("application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx"),
}


@dataclass(frozen=True)
class Descarga:
    """Datos listos para que el router arme la respuesta HTTP de descarga."""

    content: bytes
    filename: str
    media_type: str


def empaquetar(content: bytes, filename_base: str, formato: str) -> Descarga:
    """Arma el filename sanitizado y el media_type de una descarga. Función pura.

    Args:
        content: Bytes ya renderizados del archivo.
        filename_base: Base del nombre de archivo, sin extensión.
        formato: Uno de "pdf" | "excel" | "csv" | "word".

    Returns:
        Descarga con content, filename (base sanitizado + extensión) y media_type.
    """
    media_type, ext = FORMATO_META[formato]
    safe = _SAFE_NAME_RE.sub("", filename_base)[:_MAX_FILENAME].strip() or "export"
    return Descarga(content, f"{safe}.{ext}", media_type)
