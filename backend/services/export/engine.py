"""Motor de export genérico: despacha (nombre, datos, filename_base, formato) y empaqueta.

Aditivo y sin dependencias de dominio. Los callers pasan `datos` con primitivos
(ej. model_dump(mode="json")); el motor NO coacciona tipos.
"""
from typing import Any, Callable, Dict

from services.export._csv import build_csv
from services.export._empaquetado import Descarga, empaquetar
from services.export._excel import build_excel
from services.export._pdf import build_pdf
from services.export._word import build_docx
from utils.errors import AppError
from utils.logger import logger

_RENDERERS: Dict[str, Callable[[str, Dict[str, Any]], bytes]] = {
    "pdf": build_pdf,
    "excel": build_excel,
    "csv": build_csv,
    "word": build_docx,
}


def build_export(nombre: str, datos: Dict[str, Any], filename_base: str, formato: str) -> Descarga:
    """Renderiza `datos` al `formato` pedido y lo empaqueta para descarga.

    Args:
        nombre: Título humano que encabeza el documento.
        datos: Estructura a renderizar (escalares + listas de dicts + `_sheets` opcional).
        filename_base: Base del nombre de archivo, sin extensión.
        formato: Uno de "pdf" | "excel" | "csv" | "word".

    Returns:
        Descarga con content (bytes), filename y media_type.

    Raises:
        AppError: EXPORT_FORMATO_INVALIDO (422) si el formato no existe.
        AppError: EXPORT_ERROR (500) si falla la generación.
    """
    render = _RENDERERS.get(formato)
    if render is None:
        raise AppError(f"Formato no soportado: {formato}", "EXPORT_FORMATO_INVALIDO", 422)
    try:
        content = render(nombre, datos)
    except Exception as exc:
        logger.error("Error al generar export", extra={"formato": formato, "error": str(exc)})
        raise AppError("Error al generar el archivo", "EXPORT_ERROR", 500) from exc
    return empaquetar(content, filename_base, formato)
