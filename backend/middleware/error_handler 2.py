"""
Handler global de errores. Todos los errores pasan por acá.
El cliente siempre recibe el mismo formato de respuesta de error.
"""
from fastapi import Request
from fastapi.responses import JSONResponse

from utils.errors import AppError
from utils.logger import logger


async def global_error_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Captura todas las excepciones de la aplicación.
    AppError → log de warning con código y path.
    Cualquier otro error → log de error completo, sin exponer detalles al cliente.
    """
    if isinstance(exc, AppError):
        logger.warning(
            exc.message,
            extra={"code": exc.code, "path": str(request.url.path)},
        )
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": True,
                "message": exc.message,
                "code": exc.code,
            },
        )

    # Error inesperado — log completo pero sin exponer al cliente
    logger.error(
        "Error inesperado",
        extra={"error": str(exc), "path": str(request.url.path)},
    )
    return JSONResponse(
        status_code=500,
        content={
            "error": True,
            "message": "Error interno del servidor. Intentá de nuevo en unos minutos.",
            "code": "INTERNAL_ERROR",
        },
    )
