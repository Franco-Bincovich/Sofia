"""
Servicio de Organigrama. Construye la vista organizacional agrupada por área.
Flujo: router → service → DB
"""
from typing import List

from integrations.supabase_client import supabase_admin
from schemas.organigrama import AreaNodoResponse, EmpleadoNodoResponse
from utils.errors import AppError
from utils.logger import logger


class OrganigramaService:
    def get_organigrama(self) -> List[AreaNodoResponse]:
        """
        Retorna la estructura organizacional agrupada por área.

        Consulta todas las áreas activas con su responsable asignado y los empleados
        activos de cada una. Las áreas sin empleados ni responsable se incluyen igualmente.

        Returns:
            Lista de AreaNodoResponse ordenada alfabéticamente por nombre de área.

        Raises:
            AppError: ORGANIGRAMA_ERROR (500) si falla la consulta a la base de datos.
        """
        try:
            areas_res = (
                supabase_admin.table("areas")
                .select(
                    "id, nombre, "
                    "responsable:empleados!fk_areas_responsable(id, nombre, apellido, cargo, foto_url)"
                )
                .eq("activo", True)
                .order("nombre")
                .execute()
            )
            emp_res = (
                supabase_admin.table("empleados")
                .select("id, nombre, apellido, cargo, foto_url, area_id")
                .eq("estado", "activo")
                .execute()
            )
        except Exception as exc:
            logger.error("Error al consultar organigrama", extra={"error": str(exc)})
            raise AppError("Error al obtener el organigrama", "ORGANIGRAMA_ERROR", 500) from exc

        emp_por_area: dict[str, list] = {}
        for emp in emp_res.data:
            area_id = emp.get("area_id")
            if area_id:
                emp_por_area.setdefault(area_id, []).append(emp)

        result: List[AreaNodoResponse] = []
        for area in areas_res.data:
            raw_resp = area.get("responsable")
            responsable = (
                EmpleadoNodoResponse(
                    id=raw_resp["id"],
                    nombre=raw_resp["nombre"],
                    apellido=raw_resp["apellido"],
                    cargo=raw_resp.get("cargo"),
                    avatar_url=raw_resp.get("foto_url"),
                )
                if raw_resp
                else None
            )

            empleados = [
                EmpleadoNodoResponse(
                    id=e["id"],
                    nombre=e["nombre"],
                    apellido=e["apellido"],
                    cargo=e.get("cargo"),
                    avatar_url=e.get("foto_url"),
                )
                for e in emp_por_area.get(area["id"], [])
            ]

            result.append(
                AreaNodoResponse(
                    id=area["id"],
                    nombre=area["nombre"],
                    responsable=responsable,
                    empleados=empleados,
                    total_empleados=len(empleados),
                )
            )

        logger.info("Organigrama consultado", extra={"total_areas": len(result)})
        return result
