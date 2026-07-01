"""
Validación centralizada de archivos subidos (tamaño + MIME type), post-read.
Usar en todo endpoint que reciba un UploadFile, antes de procesar el contenido.
"""
from utils.errors import AppError

MAX_SIZE_CERTIFICADO = 10 * 1024 * 1024  # 10 MB
MAX_SIZE_LOGO = 2 * 1024 * 1024  # 2 MB
MAX_SIZE_CSV = 5 * 1024 * 1024  # 5 MB
MAX_SIZE_ADJUNTO = 10 * 1024 * 1024  # 10 MB

ALLOWED_TYPES_CERTIFICADO = ("application/pdf", "image/jpeg", "image/png", "image/webp")
ALLOWED_TYPES_IMAGEN = ("image/jpeg", "image/png", "image/webp")
ALLOWED_TYPES_CSV = ("text/csv", "text/plain", "application/vnd.ms-excel", "application/octet-stream")
# Adjuntos genéricos: PDF, Word (.docx), Excel (.xlsx) e imágenes.
ALLOWED_TYPES_ADJUNTO = (
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "image/jpeg",
    "image/png",
    "image/webp",
)


def validate_upload(
    content: bytes,
    content_type: str | None,
    allowed_types: tuple[str, ...],
    max_size: int,
    field_name: str,
) -> None:
    """
    Valida tamaño y MIME type de un archivo ya leído en memoria (post-read).

    Args:
        content: Bytes del archivo (resultado de `await file.read()`).
        content_type: MIME declarado por el cliente (`file.content_type`); puede ser None.
        allowed_types: MIME types permitidos para este endpoint.
        max_size: Tamaño máximo permitido, en bytes.
        field_name: Nombre legible del campo, usado en los mensajes de error.

    Raises:
        AppError: FILE_TOO_LARGE (400) si supera max_size; MISSING_CONTENT_TYPE (400)
                  si content_type es None; INVALID_FILE_TYPE (400) si el MIME no está permitido.
    """
    if len(content) > max_size:
        raise AppError(f"El {field_name} supera el tamaño máximo de {max_size // (1024 * 1024)} MB", "FILE_TOO_LARGE", 400)
    if content_type is None:
        raise AppError(f"No se pudo determinar el tipo del {field_name}", "MISSING_CONTENT_TYPE", 400)
    if content_type not in allowed_types:
        raise AppError(f"Tipo de {field_name} no permitido. Permitidos: {', '.join(allowed_types)}", "INVALID_FILE_TYPE", 400)
