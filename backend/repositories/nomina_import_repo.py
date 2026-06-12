"""
Repositorio de importación masiva de nómina.
batch_upsert_nomina persiste todo el lote en una sola query, en vez de los ~3
round-trips por fila que excedían el timeout de Vercel. Vive aparte de
nomina_repo.py para respetar el límite de 100 líneas por repositorio.
"""
from integrations.supabase_client import supabase_admin
from utils.logger import logger

_NOM = "costos_nomina"


class NominaImportRepo:
    def batch_upsert_nomina(self, filas: list[dict]) -> list[dict]:
        """
        Inserta o actualiza un lote de registros de nómina en una sola query.

        Reemplaza el upsert fila-por-fila por un único UPSERT con conflicto sobre
        (empleado_id, anio, mes) —la clave única real de costos_nomina—. Los registros
        llegan ya listos para persistir: con empleado_id, empresa_id y cargas_sociales
        calculadas. La columna `total` es generada y no se envía.

        Args:
            filas: Registros a persistir, cada uno con empleado_id, anio, mes,
                   salario_bruto, cargas_sociales y empresa_id.

        Returns:
            Lista de registros resultantes tal como los devuelve Supabase.
        """
        if not filas:
            return []
        res = supabase_admin.table(_NOM).upsert(filas, on_conflict="empleado_id,anio,mes").execute()
        logger.info("Importación batch de nómina", extra={"registros": len(res.data or [])})
        return res.data or []
