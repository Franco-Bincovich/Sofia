"""
Repositorio de importación masiva de empleados.
batch_upsert_empleados aplica un lote de altas y actualizaciones en pocas queries,
en vez del round-trip por fila que excedía el timeout de Vercel. Vive aparte de
empleado_repo.py para respetar el límite de 100 líneas por repositorio.
"""
from integrations.supabase_client import supabase_admin
from utils.logger import logger

_TABLE = "empleados"
_COLS = (
    "nombre", "apellido", "email_corporativo", "cargo", "rol", "area_id",
    "tipo_contrato", "modalidad_trabajo", "fecha_ingreso", "dni", "cuil",
    "legajo", "empresa_id",
)


def _changes(fila: dict) -> dict:
    """Proyecta una fila de importación a columnas reales de empleados, descartando None."""
    return {c: fila[c] for c in _COLS if fila.get(c) is not None}


class EmpleadoImportRepo:
    def areas_map(self, empresa_id: str) -> dict:
        """Mapa nombre→id de áreas activas de la empresa (para resolver el área del CSV)."""
        rows = (supabase_admin.table("areas").select("id, nombre")
                .eq("activo", True).eq("empresa_id", empresa_id).execute().data or [])
        return {r["nombre"]: str(r["id"]) for r in rows}

    def existing_dnis(self, empresa_id: str, dnis: list) -> set:
        """DNIs ya registrados en la empresa, acotado a los del CSV (chequeo dirigido)."""
        if not dnis:
            return set()
        rows = (supabase_admin.table(_TABLE).select("dni")
                .eq("empresa_id", empresa_id).in_("dni", dnis).execute().data or [])
        return {r["dni"] for r in rows if r.get("dni")}

    def existing_emails(self, emails: list) -> set:
        """Emails ya registrados (UNIQUE global, sin filtro de empresa), acotado a los del CSV."""
        if not emails:
            return set()
        rows = (supabase_admin.table(_TABLE).select("email_corporativo")
                .in_("email_corporativo", emails).execute().data or [])
        return {r["email_corporativo"] for r in rows if r.get("email_corporativo")}

    def existing_legajos(self, empresa_id: str, legajos: list) -> set:
        """Legajos ya registrados en la empresa (UNIQUE por empresa), acotado a los del CSV."""
        if not legajos:
            return set()
        rows = (supabase_admin.table(_TABLE).select("legajo")
                .eq("empresa_id", empresa_id).in_("legajo", legajos).execute().data or [])
        return {r["legajo"] for r in rows if r.get("legajo")}

    def batch_upsert_empleados(self, filas: list[dict]) -> list[dict]:
        """
        Persiste un lote de empleados en como máximo tres queries (vs. una por fila).

        Las filas se separan por `es_actualizacion`:
        - Altas (False): un único INSERT con claves uniformes y estado='activo'.
        - Actualizaciones (True): un único SELECT trae las filas existentes por
          (empresa_id, dni); cada cambio no nulo se superpone sobre la fila actual
          —preservando los valores no provistos— y se aplica con un único UPSERT por PK.

        Args:
            filas: Filas validadas en el preview, cada una con `empresa_id`, `dni` y
                   `es_actualizacion`. Las claves auxiliares (fila, area_nombre) se
                   ignoran al proyectar a columnas reales.

        Returns:
            Registros resultantes (altas + actualizaciones) tal como los devuelve
            Supabase. Las actualizaciones cuyo dni ya no existe en la empresa quedan fuera.
        """
        nuevas = [f for f in filas if not f.get("es_actualizacion")]
        updates = [f for f in filas if f.get("es_actualizacion")]
        resultados: list[dict] = []

        if nuevas:
            payloads = [{**{c: f.get(c) for c in _COLS}, "estado": "activo"} for f in nuevas]
            resultados.extend(supabase_admin.table(_TABLE).insert(payloads).execute().data or [])

        if updates:
            empresa_id = updates[0]["empresa_id"]
            dnis = [f["dni"] for f in updates]
            actuales = {
                r["dni"]: r
                for r in (supabase_admin.table(_TABLE).select("*")
                          .eq("empresa_id", empresa_id).in_("dni", dnis).execute().data or [])
            }
            payloads = [{**actuales[f["dni"]], **_changes(f)} for f in updates if f["dni"] in actuales]
            if payloads:
                resultados.extend(
                    supabase_admin.table(_TABLE).upsert(payloads, on_conflict="id").execute().data or []
                )

        logger.info(
            "Importación batch de empleados",
            extra={"altas": len(nuevas), "updates": len(updates), "aplicados": len(resultados)},
        )
        return resultados
