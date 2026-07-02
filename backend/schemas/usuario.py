"""
Schemas del ABM de usuarios del sistema.

Alta de usuarios con rol mandos_medios: el rol NO se recibe del cliente, lo fuerza el
service (este endpoint solo crea mandos medios). La contraseña temporal se devuelve UNA
sola vez en la respuesta y no se persiste en claro en ningún lado.
"""
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, model_validator


class CrearUsuarioRequest(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=100)
    apellido: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    empleado_id: Optional[UUID] = None  # opcional: vincula el user a su registro de empleado


class CrearUsuarioResponse(BaseModel):
    id: str
    username: str
    password_temporal: str  # se muestra una única vez; no es recuperable después


class CambiarPasswordRequest(BaseModel):
    """Cambio de contraseña self-service. El id del usuario NUNCA viaja en el body:
    sale del token (evita IDOR). La nueva debe diferir de la actual."""
    password_actual: str = Field(..., min_length=1)
    password_nueva: str = Field(..., min_length=8, max_length=72)  # 72 = tope bcrypt

    @model_validator(mode="after")
    def _debe_ser_distinta(self) -> "CambiarPasswordRequest":
        if self.password_nueva == self.password_actual:
            raise ValueError("La nueva contraseña debe ser distinta de la actual")
        return self


class CambiarPasswordResponse(BaseModel):
    ok: bool = True
