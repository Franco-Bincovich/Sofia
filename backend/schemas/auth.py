"""
Schemas de autenticación. Validación de entrada y salida para los endpoints de /api/auth.
"""
from uuid import UUID

from pydantic import BaseModel


class LoginRequest(BaseModel):
    email: str
    password: str


class UserInfo(BaseModel):
    id: UUID
    email: str
    rol: str
    nombre: str


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    user: UserInfo


class RefreshRequest(BaseModel):
    refresh_token: str


class RefreshResponse(BaseModel):
    access_token: str
    refresh_token: str
