"""
Payloads de auditoría para cesiones (entidad hija de empleado).
Funciones puras: cada una devuelve el dict para AuditService.registrar(**payload).
Archivo propio (en vez de _audit_payloads_rrhh, ya cerca del límite). Entidad = "cesion".
"""
from typing import Optional

from services.audit_service import AuditService


def _campos(c) -> dict:
    """Subset auditado de una cesión (fecha + empresa externa)."""
    return {"fecha": str(c.fecha), "empresa_cesion": c.empresa_cesion}


def payload_alta_cesion(c, usuario_id: Optional[str]) -> dict:
    """Evento INSERT de alta de cesión."""
    return {
        "usuario_id": usuario_id, "entidad": "cesion", "registro_id": c.id,
        "accion": "INSERT", "evento": "alta_cesion", "empresa_id": c.empresa_id,
        "datos_anteriores": None, "datos_nuevos": _campos(c),
    }


def payload_update_cesion(prior, nuevo, usuario_id: Optional[str]) -> dict:
    """Evento UPDATE de edición de cesión (diff antes/después)."""
    antes, despues = AuditService._diff(_campos(prior), _campos(nuevo))
    return {
        "usuario_id": usuario_id, "entidad": "cesion", "registro_id": prior.id,
        "accion": "UPDATE", "evento": "update_cesion", "empresa_id": prior.empresa_id,
        "datos_anteriores": antes, "datos_nuevos": despues,
    }


def payload_baja_cesion(c, usuario_id: Optional[str]) -> dict:
    """Evento DELETE de baja de cesión."""
    return {
        "usuario_id": usuario_id, "entidad": "cesion", "registro_id": c.id,
        "accion": "DELETE", "evento": "baja_cesion", "empresa_id": c.empresa_id,
        "datos_anteriores": _campos(c), "datos_nuevos": None,
    }
