"""
Repositorio de importación masiva de empleados.
batch_upsert_empleados aplica un lote de altas y actualizaciones en pocas queries,
en vez del round-trip por fila que excedía el timeout de Vercel.

Los loaders dirigidos (existing_*/areas_map) y la proyección de columnas viven en
_empleado_import_utils.py para mantener este archivo bajo el límite de 100 líneas.
"""
from integrations.supabase_client import supabase_admin
from repositories import _empleado_import_utils as u
from utils.logger import logger

_TABLE = "empleados"


class EmpleadoImportRepo:
    def areas_map(self, empresa_id: str) -> dict:
        """Mapa nombre→id de áreas activas de la empresa."""
        return u.areas_map(empresa_id)

    def existing_dnis(self, empresa_id: str, dnis: list) -> set:
        """DNIs ya registrados en la empresa, acotado a los del CSV."""
        return u.existing_dnis(empresa_id, dnis)

    def existing_emails(self, emails: list) -> set:
        """Emails ya registrados (UNIQUE global), acotado a los del CSV."""
        return u.existing_emails(emails)

    def existing_legajos(self, empresa_id: str, legajos: list) -> set:
        """Legajos ya registrados en la empresa, acotado a los del CSV."""
        return u.existing_legajos(empresa_id, legajos)

    def batch_upsert_empleados(self, filas: list[dict]) -> list[dict]:
        """
        Persiste un lote de empleados en como máximo tres queries (vs. una por fila).

        Las filas se separan por `es_actualizacion`:
        - Altas (False): un único INSERT con claves uniformes y estado='activo'.
        - Actualizaciones (True): un único SELECT trae las filas existentes por
          (empresa_id, dni); cada cambio no nulo se superpone sobre la fila actual
          —preservando los valores no provistos— y se aplica con un único UPSERT por PK.

        Args:
            filas: Filas validadas en el preview, cada una con `empresa_id`, `dni`,
                   `roles` y `es_actualizacion`. Las claves auxiliares (fila, area_nombre)
                   se ignoran al proyectar a columnas reales.

        Returns:
            Registros resultantes (altas + actualizaciones) tal como los devuelve
            Supabase. Las actualizaciones cuyo dni ya no existe en la empresa quedan fuera.
        """
        nuevas = [f for f in filas if not f.get("es_actualizacion")]
        updates = [f for f in filas if f.get("es_actualizacion")]
        resultados: list[dict] = []

        if nuevas:
            payloads = [{**{c: f.get(c) for c in u.COLS}, "estado": "activo"} for f in nuevas]
            resultados.extend(supabase_admin.table(_TABLE).insert(payloads).execute().data or [])

        if updates:
            empresa_id = updates[0]["empresa_id"]
            dnis = [f["dni"] for f in updates]
            actuales = {
                r["dni"]: r
                for r in (supabase_admin.table(_TABLE).select("*")
                          .eq("empresa_id", empresa_id).in_("dni", dnis).execute().data or [])
            }
            payloads = [{**actuales[f["dni"]], **u.changes(f)} for f in updates if f["dni"] in actuales]
            if payloads:
                resultados.extend(
                    supabase_admin.table(_TABLE).upsert(payloads, on_conflict="id").execute().data or []
                )

        logger.info(
            "Importación batch de empleados",
            extra={"altas": len(nuevas), "updates": len(updates), "aplicados": len(resultados)},
        )
        return resultados
