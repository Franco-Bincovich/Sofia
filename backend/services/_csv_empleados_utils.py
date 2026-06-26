"""
Validación pura por fila de la importación CSV de empleados (T18.6b).

Extraído de csv_service para mantenerlo bajo el límite y aislar la lógica de validación
(sin IO). `validar_fila` recibe los conjuntos de existentes ya cargados (DB) y los sets
`seen_*` para detectar duplicados dentro del mismo archivo. Precedente: _vacaciones_utils.py.
"""
from datetime import date

REQUIRED_FIELDS = {
    "nombre", "apellido", "email_corporativo", "cargo",
    "area", "tipo_contrato", "modalidad_trabajo", "fecha_ingreso", "dni",
}
VALID_TIPO_CONTRATO = {"efectivo", "plazo_fijo", "contratado", "pasantia"}
VALID_MODALIDAD = {"presencial", "remoto", "hibrido"}


def _err(fila_num: int, campo: str, error: str) -> dict:
    return {"fila": fila_num, "campo": campo, "error": error}


def validar_fila(
    row: dict, fila_num: int, areas_map: dict,
    dnis_existentes: set, emails_existentes: set, legajos_existentes: set,
    seen_email: set, seen_dni: set, seen_legajo: set,
) -> tuple[dict | None, dict | None]:
    """
    Valida una fila normalizada del CSV. Devuelve (fila_valida, None) o (None, error).

    Pura: no hace IO. Recibe los conjuntos de existentes en DB (chequeo de duplicados) y
    muta los sets `seen_*` para detectar duplicados intra-archivo. El duplicado de email
    (global) y legajo (por empresa) se chequea solo en altas; el match de update es por DNI.
    """
    faltantes = [f for f in REQUIRED_FIELDS if not row.get(f)]
    if faltantes:
        return None, _err(fila_num, "múltiples", f"Campos requeridos vacíos: {', '.join(sorted(faltantes))}")
    if row["tipo_contrato"] not in VALID_TIPO_CONTRATO:
        return None, _err(fila_num, "tipo_contrato", f"Valor inválido '{row['tipo_contrato']}'. Válidos: {', '.join(sorted(VALID_TIPO_CONTRATO))}")
    if row["modalidad_trabajo"] not in VALID_MODALIDAD:
        return None, _err(fila_num, "modalidad_trabajo", f"Valor inválido '{row['modalidad_trabajo']}'. Válidos: {', '.join(sorted(VALID_MODALIDAD))}")
    try:
        fecha = date.fromisoformat(row["fecha_ingreso"])
    except ValueError:
        return None, _err(fila_num, "fecha_ingreso", f"Formato inválido '{row['fecha_ingreso']}'. Usar YYYY-MM-DD")
    email = row["email_corporativo"]
    if "@" not in email or "." not in email.split("@")[-1]:
        return None, _err(fila_num, "email_corporativo", f"Email inválido '{email}'")
    area_id = areas_map.get(row["area"])
    if not area_id:
        return None, _err(fila_num, "area", f"Área '{row['area']}' no encontrada en la empresa seleccionada")

    dni = row["dni"]
    legajo = row.get("legajo") or None
    # Duplicados dentro del mismo archivo
    if dni in seen_dni:
        return None, _err(fila_num, "dni", f"DNI '{dni}' duplicado dentro del archivo")
    if email in seen_email:
        return None, _err(fila_num, "email_corporativo", f"Email '{email}' duplicado dentro del archivo")
    if legajo and legajo in seen_legajo:
        return None, _err(fila_num, "legajo", f"Legajo '{legajo}' duplicado dentro del archivo")

    es_actualizacion = dni in dnis_existentes
    # Duplicados en DB (solo altas; el update matchea por DNI y puede traer su propio email/legajo)
    if not es_actualizacion and email in emails_existentes:
        return None, _err(fila_num, "email_corporativo", "Ya existe un empleado con ese email")
    if not es_actualizacion and legajo and legajo in legajos_existentes:
        return None, _err(fila_num, "legajo", "Ya existe un empleado con ese legajo en la empresa")

    seen_dni.add(dni)
    seen_email.add(email)
    if legajo:
        seen_legajo.add(legajo)
    return {
        "fila": fila_num, "nombre": row["nombre"], "apellido": row["apellido"],
        "email_corporativo": email, "cargo": row["cargo"], "rol": row.get("rol") or None,
        "area_id": area_id, "area_nombre": row["area"], "tipo_contrato": row["tipo_contrato"],
        "modalidad_trabajo": row["modalidad_trabajo"], "fecha_ingreso": str(fecha),
        "dni": dni, "cuil": row.get("cuil") or None, "legajo": legajo,
        "es_actualizacion": es_actualizacion,
    }, None
