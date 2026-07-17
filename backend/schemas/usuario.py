"""
Schemas del ABM de usuarios del sistema.

Alta de usuarios: el rol viaja en el request pero se valida contra ROLES_VALIDOS
(fuente de verdad en utils/permisos.py) — un rol fuera de la lista es 422, nunca crea.
La contraseña temporal se devuelve UNA sola vez en la respuesta y no se persiste en claro.
"""
import re
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator

from utils.permisos import ROLES_VALIDOS

# Formato de email validado a mano en vez de EmailStr: EmailStr exige el paquete
# email_validator, que no está en requirements.txt — sin él pydantic falla en tiempo
# de import y el backend no arranca en un entorno limpio. El regex es deliberadamente
# laxo (estructura, no RFC 5322): la validez real de una casilla solo la prueba un
# envío. No agregar email_validator para "mejorarlo".
_EMAIL_RE = re.compile(r"[^@\s]+@[^@\s]+\.[^@\s]+")


class CrearUsuarioRequest(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=100)
    apellido: str = Field(..., min_length=1, max_length=100)
    email: str = Field(..., min_length=3, max_length=254)  # 254 = tope RFC 5321
    username: str = Field(..., min_length=3, max_length=50)
    rol: str  # validado contra ROLES_VALIDOS (fuente de verdad); rol inválido → 422
    empleado_id: Optional[UUID] = None  # opcional: vincula el user a su registro de empleado

    @field_validator("email")
    @classmethod
    def _email_valido(cls, v: str) -> str:
        v = v.strip()
        if not _EMAIL_RE.fullmatch(v):
            raise ValueError("Email inválido. Debe tener el formato usuario@dominio.com")
        return v

    @field_validator("rol")
    @classmethod
    def _rol_valido(cls, v: str) -> str:
        if v not in ROLES_VALIDOS:
            raise ValueError(f"Rol inválido. Debe ser uno de: {', '.join(sorted(ROLES_VALIDOS))}")
        return v


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
