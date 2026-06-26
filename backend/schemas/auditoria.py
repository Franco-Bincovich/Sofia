"""
Schemas Pydantic del audit log (T18).

El audit log se ESCRIBE desde la capa de servicio (captura app-level, AuditService)
y se LEE paginado por la UI de auditoría. Patrón Response → ListResponse.

`accion` lleva el verbo CRUD (constraint CHECK de public.auditoria, migración 024);
`evento` lleva la semántica de negocio ('baja_empleado', 'cancelacion_vacacion').
"""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel

# Verbos permitidos por el CHECK de public.auditoria.accion (migración 024).
ACCIONES = {"INSERT", "UPDATE", "DELETE"}


class AuditLogResponse(BaseModel):
    id: str
    usuario_id: Optional[str] = None
    usuario_nombre: Optional[str] = None
    empresa_id: Optional[str] = None
    empresa_nombre: Optional[str] = None
    entidad: str
    evento: str
    accion: str
    registro_id: str
    datos_anteriores: Optional[dict] = None
    datos_nuevos: Optional[dict] = None
    created_at: datetime


class AuditLogListResponse(BaseModel):
    items: List[AuditLogResponse]
    total: int
