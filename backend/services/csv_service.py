"""
Importación de empleados via CSV — orquestación del preview.

parse_empleados_csv coordina: carga de áreas y existentes (DB, vía empleado_import_repo,
con chequeo DIRIGIDO por los valores del CSV) + validación pura por fila (_csv_empleados_utils).
No accede a Supabase directamente ni valida inline; solo coordina.
"""
import csv
import io

from repositories.empleado_import_repo import EmpleadoImportRepo
from services._csv_empleados_utils import REQUIRED_FIELDS, validar_fila
from utils.logger import logger


def parse_empleados_csv(content: str, empresa_id: str) -> tuple[list[dict], list[dict]]:
    """
    Parsea y valida un CSV de empleados para la empresa indicada.

    Args:
        content: Contenido del archivo CSV (header + filas).
        empresa_id: Empresa destino; filtra áreas y acota el chequeo de duplicados.

    Returns:
        Tupla (filas_validas, errores). Cada error es {fila, campo, error}. Las filas válidas
        traen area_id resuelto y es_actualizacion=True si el DNI ya existe en la empresa.
    """
    repo = EmpleadoImportRepo()
    areas_map = repo.areas_map(empresa_id)
    try:
        reader = csv.DictReader(io.StringIO(content))
        if not reader.fieldnames:
            return [], [{"fila": 0, "campo": "archivo", "error": "El archivo está vacío o no tiene encabezados"}]

        fieldnames_lower = {f.strip().lower() for f in reader.fieldnames if f}
        missing = REQUIRED_FIELDS - fieldnames_lower
        if missing:
            return [], [{"fila": 0, "campo": "encabezados", "error": f"Faltan columnas requeridas: {', '.join(sorted(missing))}"}]

        rows = [
            (fila_num, {k.strip().lower(): (v.strip() if v else "") for k, v in raw.items() if k})
            for fila_num, raw in enumerate(reader, start=2)
        ]
        dnis = repo.existing_dnis(empresa_id, [r["dni"] for _, r in rows if r.get("dni")])
        emails = repo.existing_emails([r["email_corporativo"] for _, r in rows if r.get("email_corporativo")])
        legajos = repo.existing_legajos(empresa_id, [r["legajo"] for _, r in rows if r.get("legajo")])

        seen_email: set = set()
        seen_dni: set = set()
        seen_legajo: set = set()
        validas: list[dict] = []
        errores: list[dict] = []
        for fila_num, row in rows:
            valida, error = validar_fila(
                row, fila_num, areas_map, dnis, emails, legajos, seen_email, seen_dni, seen_legajo,
            )
            if error:
                errores.append(error)
            if valida:
                validas.append(valida)

        logger.info(
            "CSV de empleados parseado",
            extra={"validas": len(validas), "errores": len(errores), "empresa_id": empresa_id},
        )
        return validas, errores

    except Exception as exc:
        logger.error("Error al parsear CSV", extra={"error": str(exc)})
        return [], [{"fila": 0, "campo": "archivo", "error": f"Error al procesar el archivo: {exc}"}]
