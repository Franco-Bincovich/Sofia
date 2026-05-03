"""
Repositorio de configuración de empresa — tabla singleton.
Interfaz pública: get_config · update_config
"""
from typing import Optional

from integrations.supabase_client import supabase_admin
from schemas.empresa import EmpresaResponse, EmpresaUpdate

_TABLE = "configuracion_empresa"


def _to_response(row: dict) -> EmpresaResponse:
    return EmpresaResponse(nombre=row["nombre"], logo_url=row.get("logo_url"))


class EmpresaRepo:
    def get_config(self) -> Optional[EmpresaResponse]:
        """Retorna la configuración de empresa (primera fila). None si la tabla está vacía."""
        res = supabase_admin.table(_TABLE).select("nombre, logo_url").limit(1).execute()
        if not res.data:
            return None
        return _to_response(res.data[0])

    def update_config(self, data: EmpresaUpdate) -> Optional[EmpresaResponse]:
        """
        Actualiza los campos no-None de la configuración de empresa.
        Obtiene el id de la primera fila antes de actualizar.

        Returns:
            EmpresaResponse actualizado, o None si la tabla está vacía.
        """
        patch = data.model_dump(exclude_none=True)
        if not patch:
            return self.get_config()

        first = supabase_admin.table(_TABLE).select("id").limit(1).execute()
        if not first.data:
            return None

        row_id = first.data[0]["id"]
        res = supabase_admin.table(_TABLE).update(patch).eq("id", row_id).execute()
        if not res.data:
            return None
        return _to_response(res.data[0])
