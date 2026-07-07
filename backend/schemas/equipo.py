"""Schema de salida del roster "mi equipo" (GET /api/equipo)."""
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class EquipoMiembroResponse(BaseModel):
    """Miembro visible por ownership: identidad mínima + empresa legible (nombre, no UUID)."""

    id: UUID
    nombre: str
    apellido: str
    empresa: Optional[str] = None
