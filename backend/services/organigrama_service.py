"""
Servicio de Organigrama — vista Empresa → Área → Empleado.
Flujo: router → service → DB
empresa_id None = consolidado de todas las empresas activas.
"""
from typing import List, Optional
from uuid import UUID

from integrations.supabase_client import supabase_admin
from schemas.organigrama import AreaNodoResponse, EmpleadoNodoResponse, EmpresaNodoResponse
from utils.errors import AppError
from utils.logger import logger


class OrganigramaService:
    def get_organigrama_empresa(self, empresa_id: Optional[UUID] = None) -> List[EmpresaNodoResponse]:
        """
        Retorna estructura Empresa → Área → Empleado filtrada por empresa.
        None devuelve todas las empresas activas.

        Returns:
            Lista de EmpresaNodoResponse ordenada alfabéticamente por nombre de empresa.

        Raises:
            AppError: ORGANIGRAMA_ERROR (500) si falla alguna consulta.
        """
        eid = str(empresa_id) if empresa_id else None
        try:
            emp_q = supabase_admin.table("empresas").select("id, nombre").eq("activa", True).order("nombre")
            if eid:
                emp_q = emp_q.eq("id", eid)
            empresas_map: dict[str, str] = {
                e["id"]: e["nombre"] for e in (emp_q.execute().data or [])
            }

            areas_q = (
                supabase_admin.table("areas")
                .select("id, nombre, empresa_id, "
                        "responsable:empleados!fk_areas_responsable(id, nombre, apellido, roles, foto_url)")
                .eq("activo", True).order("nombre")
            )
            if eid:
                areas_q = areas_q.eq("empresa_id", eid)
            areas_data = areas_q.execute().data or []

            emp_row_q = (
                supabase_admin.table("empleados")
                .select("id, nombre, apellido, roles, foto_url, area_id")
                .eq("estado", "activo")
            )
            if eid:
                emp_row_q = emp_row_q.eq("empresa_id", eid)
            emp_rows = emp_row_q.execute().data or []
        except Exception as exc:
            logger.error("Error al consultar organigrama empresa", extra={"error": str(exc)})
            raise AppError("Error al obtener el organigrama", "ORGANIGRAMA_ERROR", 500) from exc

        emp_por_area: dict[str, list] = {}
        for emp in emp_rows:
            if aid := emp.get("area_id"):
                emp_por_area.setdefault(aid, []).append(emp)

        areas_por_empresa: dict[str, list] = {}
        for area in areas_data:
            if eid_area := area.get("empresa_id"):
                areas_por_empresa.setdefault(eid_area, []).append(area)

        result: List[EmpresaNodoResponse] = []
        for eid_emp, nombre_emp in empresas_map.items():
            areas_nodos: List[AreaNodoResponse] = []
            total = 0
            for area in areas_por_empresa.get(eid_emp, []):
                raw = area.get("responsable")
                responsable = (
                    EmpleadoNodoResponse(
                        id=raw["id"], nombre=raw["nombre"], apellido=raw["apellido"],
                        cargo=(raw.get("roles") or [raw.get("cargo")])[0], avatar_url=raw.get("foto_url"),
                    ) if raw else None
                )
                empleados = [
                    EmpleadoNodoResponse(
                        id=e["id"], nombre=e["nombre"], apellido=e["apellido"],
                        cargo=(e.get("roles") or [e.get("cargo")])[0], avatar_url=e.get("foto_url"),
                    )
                    for e in emp_por_area.get(area["id"], [])
                ]
                total += len(empleados)
                areas_nodos.append(AreaNodoResponse(
                    id=area["id"], nombre=area["nombre"],
                    responsable=responsable, empleados=empleados, total_empleados=len(empleados),
                ))
            result.append(EmpresaNodoResponse(
                id=eid_emp, nombre=nombre_emp, total_empleados=total, areas=areas_nodos,
            ))

        logger.info("Organigrama empresa consultado", extra={"total_empresas": len(result)})
        return result
