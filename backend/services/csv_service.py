"""
Servicio de importación masiva de empleados via CSV.
parse_empleados_csv: parsea, valida y resuelve áreas desde un string CSV.
"""
import csv
import io
from datetime import date

from integrations.supabase_client import supabase_admin
from utils.logger import logger

VALID_TIPO_CONTRATO = {"efectivo", "plazo_fijo", "contratado", "pasantia"}
VALID_MODALIDAD = {"presencial", "remoto", "hibrido"}
REQUIRED_FIELDS = {
    "nombre", "apellido", "email_corporativo", "cargo",
    "area", "tipo_contrato", "modalidad_trabajo", "fecha_ingreso",
}


def _load_areas() -> dict[str, str]:
    """Carga todas las áreas activas y retorna un mapa nombre → id."""
    result = (
        supabase_admin.table("areas")
        .select("id, nombre")
        .eq("activo", True)
        .execute()
    )
    return {row["nombre"]: str(row["id"]) for row in (result.data or [])}


def parse_empleados_csv(content: str) -> tuple[list[dict], list[dict]]:
    """
    Parsea y valida el contenido de un CSV de empleados.

    Args:
        content: String con el contenido del archivo CSV (header + filas de datos).

    Returns:
        Tupla (filas_validas, errores). Las filas válidas incluyen area_id resuelto.
        Cada error contiene {fila, campo, error}.
    """
    areas_map = _load_areas()

    try:
        reader = csv.DictReader(io.StringIO(content))
        if not reader.fieldnames:
            return [], [{"fila": 0, "campo": "archivo", "error": "El archivo está vacío o no tiene encabezados"}]

        fieldnames_lower = {f.strip().lower() for f in reader.fieldnames if f}
        missing = REQUIRED_FIELDS - fieldnames_lower
        if missing:
            return [], [{
                "fila": 0,
                "campo": "encabezados",
                "error": f"Faltan columnas requeridas: {', '.join(sorted(missing))}",
            }]

        validas: list[dict] = []
        errores: list[dict] = []

        for fila_num, raw_row in enumerate(reader, start=2):
            row = {
                k.strip().lower(): (v.strip() if v else "")
                for k, v in raw_row.items()
                if k
            }

            # Campos requeridos vacíos
            missing_values = [f for f in REQUIRED_FIELDS if not row.get(f)]
            if missing_values:
                errores.append({
                    "fila": fila_num,
                    "campo": "múltiples",
                    "error": f"Campos requeridos vacíos: {', '.join(sorted(missing_values))}",
                })
                continue

            # tipo_contrato
            if row["tipo_contrato"] not in VALID_TIPO_CONTRATO:
                errores.append({
                    "fila": fila_num,
                    "campo": "tipo_contrato",
                    "error": (
                        f"Valor inválido '{row['tipo_contrato']}'. "
                        f"Válidos: {', '.join(sorted(VALID_TIPO_CONTRATO))}"
                    ),
                })
                continue

            # modalidad_trabajo
            if row["modalidad_trabajo"] not in VALID_MODALIDAD:
                errores.append({
                    "fila": fila_num,
                    "campo": "modalidad_trabajo",
                    "error": (
                        f"Valor inválido '{row['modalidad_trabajo']}'. "
                        f"Válidos: {', '.join(sorted(VALID_MODALIDAD))}"
                    ),
                })
                continue

            # fecha_ingreso
            try:
                fecha = date.fromisoformat(row["fecha_ingreso"])
            except ValueError:
                errores.append({
                    "fila": fila_num,
                    "campo": "fecha_ingreso",
                    "error": f"Formato inválido '{row['fecha_ingreso']}'. Usar YYYY-MM-DD",
                })
                continue

            # email básico
            email = row["email_corporativo"]
            if "@" not in email or "." not in email.split("@")[-1]:
                errores.append({
                    "fila": fila_num,
                    "campo": "email_corporativo",
                    "error": f"Email inválido '{email}'",
                })
                continue

            # área → id
            area_nombre = row["area"]
            area_id = areas_map.get(area_nombre)
            if not area_id:
                errores.append({
                    "fila": fila_num,
                    "campo": "area",
                    "error": f"Área '{area_nombre}' no encontrada en el sistema",
                })
                continue

            validas.append({
                "fila": fila_num,
                "nombre": row["nombre"],
                "apellido": row["apellido"],
                "email_corporativo": email,
                "cargo": row["cargo"],
                "rol": row.get("rol") or None,
                "area_id": area_id,
                "area_nombre": area_nombre,
                "tipo_contrato": row["tipo_contrato"],
                "modalidad_trabajo": row["modalidad_trabajo"],
                "fecha_ingreso": str(fecha),
                "cuil": row.get("cuil") or None,
                "legajo": row.get("legajo") or None,
            })

        logger.info(
            "CSV de empleados parseado",
            extra={"validas": len(validas), "errores": len(errores)},
        )
        return validas, errores

    except Exception as exc:
        logger.error("Error al parsear CSV", extra={"error": str(exc)})
        return [], [{"fila": 0, "campo": "archivo", "error": f"Error al procesar el archivo: {exc}"}]
