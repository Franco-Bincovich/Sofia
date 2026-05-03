"""
Schemas Pydantic para la configuración de empresa.
"""
from typing import Optional

from pydantic import BaseModel


class EmpresaResponse(BaseModel):
    nombre: str
    logo_url: Optional[str] = None


class EmpresaUpdate(BaseModel):
    nombre: Optional[str] = None
    logo_url: Optional[str] = None
