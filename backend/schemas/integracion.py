"""Schemas de integraciones por usuario."""
from typing import Optional

from pydantic import BaseModel


class IntegracionResponse(BaseModel):
    tipo: str
    email_cuenta: Optional[str] = None
    activo: bool
    connected: bool


class ApiKeyUpdate(BaseModel):
    api_key: str
