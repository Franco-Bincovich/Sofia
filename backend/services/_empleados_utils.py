"""
Helpers internos del módulo de empleados (capa service).

Dedup extraído de EmpleadoService (T18.4c) para descargar líneas del service tras
instrumentar audit, con comportamiento idéntico (mismos mensajes/códigos de AppError).
Precedente: _vacaciones_utils.py. Funciones finas, sin estado.
"""
from typing import Optional
from uuid import UUID

from repositories.empleado_repo import EmpleadoRepo
from schemas.empleado import EmpleadoResponse
from utils.errors import AppError


def ensure_legajo_unico(
    repo: EmpleadoRepo, legajo: Optional[str], empresa_id: Optional[UUID],
    exclude_id: Optional[str] = None,
) -> None:
    """Lanza LEGAJO_DUPLICADO (409) si `legajo` ya existe en la empresa (excluye exclude_id)."""
    if not legajo or not empresa_id:
        return
    existing = repo.find_by_legajo(legajo, empresa_id)
    if existing and existing.id != exclude_id:
        raise AppError("Ya existe un empleado con ese legajo en esta empresa", "LEGAJO_DUPLICADO", 409)


def empleado_or_404(empleado: Optional[EmpleadoResponse]) -> EmpleadoResponse:
    """Devuelve el empleado o lanza EMPLEADO_NOT_FOUND (404) si es None."""
    if not empleado:
        raise AppError("Empleado no encontrado", "EMPLEADO_NOT_FOUND", 404)
    return empleado
