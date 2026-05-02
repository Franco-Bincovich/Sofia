"""
Repositorio de empleados. Datos mock — reemplazar por Supabase cuando el auth esté completo.
Interfaz pública: find_all · find_by_id · save · update · soft_delete
"""
from copy import deepcopy
from datetime import datetime, timezone
from typing import List, Optional, Tuple
from uuid import uuid4

from schemas.empleado import EmpleadoCreate, EmpleadoResponse, EmpleadoUpdate

_DB: List[dict] = [
    {"id": "11111111-1111-1111-1111-111111111111", "nombre": "Ana", "apellido": "García", "email_corporativo": "ana.garcia@karstec.com", "area_id": "aaaaaaaa-0000-0000-0000-000000000001", "cargo": "Desarrolladora Senior", "modalidad_trabajo": "hibrido", "tipo_contrato": "indefinido", "fecha_ingreso": "2022-03-01", "telefono": None, "fecha_nacimiento": None, "cuil": "20-30000001-1", "legajo": "001", "estado": "activo", "created_at": "2022-03-01T00:00:00+00:00"},
    {"id": "22222222-2222-2222-2222-222222222222", "nombre": "Carlos", "apellido": "López", "email_corporativo": "carlos.lopez@karstec.com", "area_id": "aaaaaaaa-0000-0000-0000-000000000002", "cargo": "Product Manager", "modalidad_trabajo": "remoto", "tipo_contrato": "indefinido", "fecha_ingreso": "2021-07-15", "telefono": None, "fecha_nacimiento": None, "cuil": "20-30000002-2", "legajo": "002", "estado": "activo", "created_at": "2021-07-15T00:00:00+00:00"},
    {"id": "33333333-3333-3333-3333-333333333333", "nombre": "María", "apellido": "Fernández", "email_corporativo": "maria.fernandez@karstec.com", "area_id": "aaaaaaaa-0000-0000-0000-000000000001", "cargo": "UX Designer", "modalidad_trabajo": "presencial", "tipo_contrato": "plazo_fijo", "fecha_ingreso": "2023-01-10", "telefono": None, "fecha_nacimiento": None, "cuil": "27-30000003-3", "legajo": "003", "estado": "licencia", "created_at": "2023-01-10T00:00:00+00:00"},
]


def _row(r: dict) -> EmpleadoResponse:
    return EmpleadoResponse.model_validate(r)


class EmpleadoRepo:
    def find_all(
        self,
        page: int,
        page_size: int,
        area_id: Optional[str] = None,
        estado: Optional[str] = None,
        search: Optional[str] = None,
    ) -> Tuple[List[EmpleadoResponse], int]:
        rows = deepcopy(_DB)
        if area_id:
            rows = [r for r in rows if r["area_id"] == area_id]
        if estado:
            rows = [r for r in rows if r["estado"] == estado]
        if search:
            s = search.lower()
            rows = [r for r in rows if s in r["nombre"].lower() or s in r["apellido"].lower()]
        total = len(rows)
        start = (page - 1) * page_size
        return [_row(r) for r in rows[start: start + page_size]], total

    def find_by_id(self, id: str) -> Optional[EmpleadoResponse]:
        row = next((r for r in _DB if r["id"] == id), None)
        return _row(deepcopy(row)) if row else None

    def save(self, data: EmpleadoCreate) -> EmpleadoResponse:
        row = data.model_dump()
        row["id"] = str(uuid4())
        row["area_id"] = str(row["area_id"])
        row["estado"] = "activo"
        row["created_at"] = datetime.now(timezone.utc)
        _DB.append(row)
        return _row(row)

    def update(self, id: str, data: EmpleadoUpdate) -> Optional[EmpleadoResponse]:
        for i, r in enumerate(_DB):
            if r["id"] == id:
                patch = {k: v for k, v in data.model_dump(exclude_none=True).items()}
                if "area_id" in patch:
                    patch["area_id"] = str(patch["area_id"])
                _DB[i] = {**r, **patch}
                return _row(deepcopy(_DB[i]))
        return None

    def soft_delete(self, id: str) -> bool:
        for i, r in enumerate(_DB):
            if r["id"] == id:
                _DB[i]["estado"] = "baja"
                return True
        return False
