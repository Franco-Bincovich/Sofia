"""
Schemas Pydantic para el módulo de empresas.
Patrón: EmpresaBase → EmpresaCreate → EmpresaUpdate → EmpresaResponse → EmpresaListResponse
"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class EmpresaBase(BaseModel):
    nombre: str
    razon_social: Optional[str] = None
    cuit: Optional[str] = None
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    logo_url: Optional[str] = None
    activa: bool = True


class EmpresaCreate(EmpresaBase):
    pass


class EmpresaUpdate(BaseModel):
    nombre: Optional[str] = None
    razon_social: Optional[str] = None
    cuit: Optional[str] = None
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    logo_url: Optional[str] = None
    activa: Optional[bool] = None


class EmpresaActivaToggle(BaseModel):
    activa: bool


class EmpresaResponse(BaseModel):
    id: str
    nombre: str
    razon_social: Optional[str] = None
    cuit: Optional[str] = None
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    logo_url: Optional[str] = None
    activa: bool
    created_at: datetime
    updated_at: Optional[datetime] = None


class EmpresaListResponse(BaseModel):
    items: list[EmpresaResponse]
    total: int
