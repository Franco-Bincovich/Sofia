"""
Logger JSON estructurado. Usar en todos los módulos — nunca print().
Solo loguear eventos de negocio importantes (ver BASES-DE-DESARROLLO.md Base 7).

Uso:
    from utils.logger import logger
    logger.info("Empleado creado", extra={"empleado_id": str(id), "user_id": user_id})
    logger.warning("Login fallido", extra={"ip": ip, "email": email})
    logger.error("Error en assessment", extra={"error": str(e), "link_id": link_id})

Qué loguear:
    INFO    — eventos de negocio: alta de empleado, assessment completado, pago
    WARNING — anomalías: login fallido, rate limit, token inválido
    ERROR   — fallos: servicio externo caído, error en webhook, excepción inesperada
    DEBUG   — solo en desarrollo local, nunca en producción
"""
import json
import logging
from datetime import datetime, timezone

_SKIP_KEYS = frozenset([
    "args", "asctime", "created", "exc_info", "exc_text", "filename",
    "funcName", "id", "levelname", "levelno", "lineno", "module", "msecs",
    "message", "msg", "name", "pathname", "process", "processName",
    "relativeCreated", "stack_info", "thread", "threadName",
])


class _JSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log_data: dict = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "message": record.getMessage(),
            "module": record.module,
        }
        for key, value in record.__dict__.items():
            if key not in _SKIP_KEYS:
                log_data[key] = value
        return json.dumps(log_data, ensure_ascii=False, default=str)


def _build_logger() -> logging.Logger:
    _logger = logging.getLogger("hrkarstec")
    _logger.setLevel(logging.DEBUG)
    _handler = logging.StreamHandler()
    _handler.setFormatter(_JSONFormatter())
    _logger.addHandler(_handler)
    return _logger


logger = _build_logger()
