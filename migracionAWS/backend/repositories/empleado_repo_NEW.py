"""
MOLDE de repo en asyncpg (patrón para los 43 restantes). Convenciones comentadas en su punto
de uso. PARIDAD EXACTA con empleado_repo.py (SDK). Lookups/bajas → empleado_lookup_repo_NEW.
"""
from typing import List, Optional, Tuple
from uuid import UUID

from integrations.postgres_client import fetch, fetchone
from schemas.empleado import EmpleadoCreate, EmpleadoResponse, EmpleadoUpdate
from utils.errors import AppError
from utils.logger import logger

_TABLE = "empleados"

# JOIN siempre LEFT (INNER perdería empleados sin área/empresa/manager). manager es self-join,
# aliasado distinto de e.nombre/e.apellido para no colisionar en el Record de asyncpg.
_COLS = (
    "e.*, a.nombre AS area_nombre, emp.nombre AS empresa_nombre, "
    "m.apellido AS _mgr_apellido, m.nombre AS _mgr_nombre"
)
_FROM = (
    "FROM empleados e "
    "LEFT JOIN areas a ON a.id = e.area_id "
    "LEFT JOIN empresas emp ON emp.id = e.empresa_id "
    "LEFT JOIN empleados m ON m.id = e.manager_id"
)
_SELECT = "SELECT " + _COLS + " " + _FROM  # SQLi: concatena constantes, nunca datos


def _row(r: dict) -> EmpleadoResponse:
    """Mapper único (lo importa el satélite). Dict ya PLANO por el JOIN: stringifica los UUID (el
    Response los tipa str, asyncpg devuelve UUID), compone manager_nombre y descarta auxiliares.
    Sirve para JOIN y para RETURNING * (sin JOIN → *_nombre None, paridad con el actual)."""
    ap, no = r.get("_mgr_apellido"), r.get("_mgr_nombre")
    data = {k: (str(v) if isinstance(v, UUID) else v) for k, v in r.items()
            if k not in ("_mgr_apellido", "_mgr_nombre", "total_count")}
    data["manager_nombre"] = f"{ap}, {no}" if ap is not None else None
    return EmpleadoResponse.model_validate(data)


class EmpleadoRepo:
    async def find_all(
        self, page: int, page_size: int, empresa_id: Optional[UUID] = None,
        area_id: Optional[str] = None, estado: Optional[str] = None,
        search: Optional[str] = None, es_lider: Optional[bool] = None,
    ) -> Tuple[List[EmpleadoResponse], int]:
        """Página + total. EMPRESA/filtros con ($n IS NULL OR col=$n): un SQL sin ramificar (None
        empresa=consolidado). Total: COUNT(*) OVER(). ORDER BY con columna única al final = molde."""
        sql = (
            "SELECT " + _COLS + ", COUNT(*) OVER() AS total_count " + _FROM +
            " WHERE ($1::uuid IS NULL OR e.empresa_id = $1)"
            " AND ($2::uuid IS NULL OR e.area_id = $2)"
            " AND ($3::text IS NULL OR e.estado = $3)"
            " AND ($4::bool IS NULL OR e.es_lider = $4)"
            " AND ($5::text IS NULL OR e.nombre ILIKE '%'||$5||'%' OR e.apellido ILIKE '%'||$5||'%')"
            # sin ORDER BY LIMIT/OFFSET es no-determinista; e.id al final = desempate estable
            # (molde: todo find_all paginado ordena por columnas de negocio + una ÚNICA al final)
            " ORDER BY e.apellido, e.nombre, e.id LIMIT $6 OFFSET $7"
        )
        rows = await fetch(sql, empresa_id, UUID(area_id) if area_id else None, estado,
                           es_lider, search, page_size, (page - 1) * page_size)
        return [_row(r) for r in rows], (rows[0]["total_count"] if rows else 0)

    async def find_by_id(self, id: str, empresa_id: Optional[UUID] = None) -> Optional[EmpleadoResponse]:
        """fetchone → None si no existe/no pertenece. El repo NUNCA levanta por 'no hallado'."""
        row = await fetchone(
            _SELECT + " WHERE e.id = $1 AND ($2::uuid IS NULL OR e.empresa_id = $2)",
            UUID(str(id)), empresa_id,
        )
        return _row(row) if row else None

    async def save(self, data: EmpleadoCreate, empresa_id: UUID) -> EmpleadoResponse:
        """INSERT ... RETURNING * (sin JOIN → area_nombre None, paridad con el actual; no 'arreglar')."""
        payload = {k: v for k, v in data.model_dump().items() if v is not None}
        payload["empresa_id"] = empresa_id  # el param del repo pisa al del body
        payload["estado"] = "activo"
        cols = list(payload)  # SQLi: dinámico SOLO de nombres de columna (del schema); valores por $n
        ph = ", ".join("$" + str(i) for i in range(1, len(cols) + 1))
        sql = "INSERT INTO " + _TABLE + " (" + ", ".join(cols) + ") VALUES (" + ph + ") RETURNING *"
        row = await fetchone(sql, *[payload[c] for c in cols])
        if not row:
            logger.error("Insert vacío en empleados")
            raise AppError("Error al crear empleado", "DB_ERROR", 500)
        return _row(row)

    async def update(self, id: str, data: EmpleadoUpdate, empresa_id: Optional[UUID] = None) -> Optional[EmpleadoResponse]:
        """UPDATE de los campos no-None ... RETURNING * (sin JOIN → area_nombre None, paridad)."""
        patch = data.model_dump(exclude_none=True)
        if not patch:
            return await self.find_by_id(id, empresa_id)
        cols = list(patch)
        sets = ", ".join(cols[i] + " = $" + str(i + 1) for i in range(len(cols)))
        p_id, p_emp = "$" + str(len(cols) + 1), "$" + str(len(cols) + 2)  # id y empresa_id van al final
        sql = (
            "UPDATE " + _TABLE + " SET " + sets + " WHERE id = " + p_id +
            " AND (" + p_emp + "::uuid IS NULL OR empresa_id = " + p_emp + ") RETURNING *"
        )
        row = await fetchone(sql, *[patch[c] for c in cols], UUID(str(id)), empresa_id)
        return _row(row) if row else None
