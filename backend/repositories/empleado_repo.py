"""
Repositorio de empleados — queries reales a Supabase.
Interfaz pública: find_all · find_by_id · save · update · soft_delete
"""
from typing import List, Optional, Tuple

from integrations.supabase_client import supabase_admin
from schemas.empleado import EmpleadoCreate, EmpleadoResponse, EmpleadoUpdate
from utils.errors import AppError
from utils.logger import logger

_TABLE = "empleados"


def _row(r: dict) -> EmpleadoResponse:
    """Convierte un dict de Supabase en EmpleadoResponse.
    Si el dict incluye la clave 'areas' (join con tabla areas), extrae area_nombre."""
    area_info = r.get("areas")
    data = {
        **{k: v for k, v in r.items() if k != "areas"},
        "area_nombre": area_info["nombre"] if isinstance(area_info, dict) else None,
    }
    return EmpleadoResponse.model_validate(data)


class EmpleadoRepo:
    def find_all(
        self,
        page: int,
        page_size: int,
        area_id: Optional[str] = None,
        estado: Optional[str] = None,
        search: Optional[str] = None,
    ) -> Tuple[List[EmpleadoResponse], int]:
        """Retorna la página de empleados con area_nombre resuelto y el total sin paginar."""
        start = (page - 1) * page_size
        end = start + page_size - 1

        query = supabase_admin.table(_TABLE).select("*, areas!empleados_area_id_fkey(nombre)", count="exact")

        if area_id:
            query = query.eq("area_id", area_id)
        if estado:
            query = query.eq("estado", estado)
        if search:
            query = query.or_(
                f"nombre.ilike.%{search}%,apellido.ilike.%{search}%"
            )

        result = query.range(start, end).execute()

        total = result.count if result.count is not None else 0
        return [_row(r) for r in result.data], total

    def find_by_id(self, id: str) -> Optional[EmpleadoResponse]:
        """Busca un empleado por UUID. Devuelve None si no existe."""
        result = supabase_admin.table(_TABLE).select("*").eq("id", id).maybe_single().execute()
        if not result.data:
            return None
        return _row(result.data)

    def save(self, data: EmpleadoCreate) -> EmpleadoResponse:
        """Inserta un nuevo empleado y devuelve el registro creado."""
        payload = {k: v for k, v in data.model_dump().items() if v is not None}
        payload["area_id"] = str(data.area_id)
        payload["fecha_ingreso"] = str(data.fecha_ingreso)
        if data.fecha_nacimiento:
            payload["fecha_nacimiento"] = str(data.fecha_nacimiento)
        payload["estado"] = "activo"

        result = supabase_admin.table(_TABLE).insert(payload).execute()
        if not result.data:
            logger.error("Supabase insert vacío en empleados")
            raise AppError("Error al crear empleado", "DB_ERROR", 500)
        return _row(result.data[0])

    def update(self, id: str, data: EmpleadoUpdate) -> Optional[EmpleadoResponse]:
        """Actualiza solo los campos no-None y devuelve el registro actualizado."""
        patch = {k: v for k, v in data.model_dump(exclude_none=True).items()}
        if not patch:
            return self.find_by_id(id)

        if "area_id" in patch:
            patch["area_id"] = str(patch["area_id"])
        if "fecha_ingreso" in patch:
            patch["fecha_ingreso"] = str(patch["fecha_ingreso"])
        if "fecha_nacimiento" in patch and patch["fecha_nacimiento"]:
            patch["fecha_nacimiento"] = str(patch["fecha_nacimiento"])

        result = supabase_admin.table(_TABLE).update(patch).eq("id", id).execute()
        if not result.data:
            return None
        return _row(result.data[0])

    def soft_delete(self, id: str) -> bool:
        """Marca el empleado como baja sin eliminar el registro."""
        result = supabase_admin.table(_TABLE).update({"estado": "baja"}).eq("id", id).execute()
        return bool(result.data)
