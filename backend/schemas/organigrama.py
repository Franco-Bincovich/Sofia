"""Schemas de respuesta para el módulo de Organigrama (vistas empresa y proyecto)."""
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel


# ── Vista por empresa: Empresa → Área → Empleado ──────────────────────────────

class EmpleadoNodoResponse(BaseModel):
    id: UUID
    nombre: str
    apellido: str
    cargo: Optional[str] = None
    avatar_url: Optional[str] = None


class AreaNodoResponse(BaseModel):
    id: UUID
    nombre: str
    responsable: Optional[EmpleadoNodoResponse] = None
    empleados: List[EmpleadoNodoResponse] = []
    total_empleados: int


class EmpresaNodoResponse(BaseModel):
    id: UUID
    nombre: str
    total_empleados: int
    areas: List[AreaNodoResponse] = []


# ── Vista por proyecto: Empresa(dueña) → Proyectos → Empleados ───────────────

class EmpleadoProyectoNodoResponse(BaseModel):
    id: UUID
    nombre: str
    apellido: str
    iniciales: str
    cargo: Optional[str] = None
    rol: str
    empleado_empresa_id: UUID
    empleado_empresa_nombre: Optional[str] = None
    total_proyectos: int   # cuántos proyectos activos tiene este empleado


class ProyectoOrgNodoResponse(BaseModel):
    id: UUID
    nombre: str
    estado: str
    empresa_id: UUID
    empresa_nombre: Optional[str] = None
    total_asignados: int
    empleados: List[EmpleadoProyectoNodoResponse] = []


class EmpresaLeyendaResponse(BaseModel):
    """Entrada de leyenda de colores — todas las empresas activas ordenadas por nombre."""
    id: UUID
    nombre: str


class OrgProyectosResponse(BaseModel):
    proyectos: List[ProyectoOrgNodoResponse]
    empresas_orden: List[EmpresaLeyendaResponse]   # paleta de colores: índice → color
