"""
Helpers de la importación masiva de empleados: loaders dirigidos (chequeo de
duplicados acotado por los valores del CSV) + proyección de columnas.

Extraídos de empleado_import_repo.py para mantenerlo bajo el límite de 100 líneas.
Viven en la capa de repositorios (acceso a DB permitido). Precedente: patrón _*_utils
del proyecto.
"""
from integrations.supabase_client import supabase_admin

_TABLE = "empleados"

# Columnas reales de empleados que la importación inserta/actualiza. `roles` (TEXT[])
# reemplazó a cargo/rol (S5); cargo/rol quedan deprecadas y NO se escriben desde el import.
COLS = (
    "nombre", "apellido", "email_corporativo", "roles", "area_id",
    "tipo_contrato", "modalidad_trabajo", "fecha_ingreso", "dni", "cuil",
    "legajo", "empresa_id",
)


def changes(fila: dict) -> dict:
    """Proyecta una fila de importación a columnas reales de empleados, descartando None."""
    return {c: fila[c] for c in COLS if fila.get(c) is not None}


def areas_map(empresa_id: str) -> dict:
    """Mapa nombre→id de áreas activas de la empresa (para resolver el área del CSV)."""
    rows = (supabase_admin.table("areas").select("id, nombre")
            .eq("activo", True).eq("empresa_id", empresa_id).execute().data or [])
    return {r["nombre"]: str(r["id"]) for r in rows}


def existing_dnis(empresa_id: str, dnis: list) -> set:
    """DNIs ya registrados en la empresa, acotado a los del CSV (chequeo dirigido)."""
    if not dnis:
        return set()
    rows = (supabase_admin.table(_TABLE).select("dni")
            .eq("empresa_id", empresa_id).in_("dni", dnis).execute().data or [])
    return {r["dni"] for r in rows if r.get("dni")}


def existing_emails(emails: list) -> set:
    """Emails ya registrados (UNIQUE global, sin filtro de empresa), acotado a los del CSV."""
    if not emails:
        return set()
    rows = (supabase_admin.table(_TABLE).select("email_corporativo")
            .in_("email_corporativo", emails).execute().data or [])
    return {r["email_corporativo"] for r in rows if r.get("email_corporativo")}


def existing_legajos(empresa_id: str, legajos: list) -> set:
    """Legajos ya registrados en la empresa (UNIQUE por empresa), acotado a los del CSV."""
    if not legajos:
        return set()
    rows = (supabase_admin.table(_TABLE).select("legajo")
            .eq("empresa_id", empresa_id).in_("legajo", legajos).execute().data or [])
    return {r["legajo"] for r in rows if r.get("legajo")}
