"""
Clase base de errores tipados. Todos los errores del sistema usan AppError.
Nunca lanzar excepciones genéricas de Python en services o routers.
"""


class AppError(Exception):
    """
    Error tipado de la aplicación.

    Args:
        message: Descripción legible para el usuario (sin jerga técnica).
        code: Código interno en SNAKE_CASE para el frontend.
        status_code: HTTP status code. Default 500.

    Uso:
        raise AppError("Empleado no encontrado", "EMPLEADO_NOT_FOUND", 404)
        raise AppError("Email duplicado", "DUPLICATE_EMAIL", 409)
        raise AppError("No autorizado", "UNAUTHORIZED", 401)
        raise AppError("Claude no disponible", "CLAUDE_UNAVAILABLE", 503)
    """

    def __init__(self, message: str, code: str, status_code: int = 500):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
