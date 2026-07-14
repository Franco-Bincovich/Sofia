"""
Transformaciones puras del CSV de nómina de empleados (27 columnas, separador ';', latin1).
Sin IO ni acceso a DB: valida headers, parsea fechas DD/MM/YYYY, SI/NO->bool, M/F->sexo,
"NO APLICA"/vacío->None, normaliza nombres (empresa/área) y arma el dict de una fila.
"""
from datetime import date, datetime
from typing import Optional

# Headers exactos del archivo real. El match se hace por nombre NORMALIZADO (case/espacios).
HEADERS = [
    "Apellido", "Nombre", "DNI", "CUIT", "Sexo", "Edad", "Email",
    "Fecha Nacimiento", "Fecha Ingreso", "Fecha Ingreso Reconocida",
    "Organismo", "Gerencia", "Sector", "Equipo", "Rol", "Seniority",
    "Categoria", "Modalidad Contratacion", "Co-sourcing", "Apellido Superior",
    "Nombre Superior", "Liderazgo", "Ubicación Física", "Carga Horaria",
    "Product Owner", "Fecha Baja", "Motivo Baja",
]

_VACIOS = {"", "NO APLICA", "N/A", "NA", "-", "--"}


def _norm(s: Optional[str]) -> str:
    """Normaliza para comparar: trim + colapsa espacios internos + casefold."""
    return " ".join((s or "").split()).casefold()


def normalizar_nombre(s: str) -> str:
    """Clave de match/dedup para empresas y áreas (trim + espacios + case-insensitive)."""
    return _norm(s)


def limpiar(v: Optional[str]) -> Optional[str]:
    """Texto libre: trim; '' o 'NO APLICA' (y variantes) -> None."""
    t = (v or "").strip()
    return None if t.upper() in _VACIOS else t


def parse_fecha(v: Optional[str]) -> Optional[date]:
    """DD/MM/YYYY -> date. Vacío -> None. Formato inválido -> ValueError con mensaje claro."""
    t = (v or "").strip()
    if not t:
        return None
    try:
        return datetime.strptime(t, "%d/%m/%Y").date()
    except ValueError:
        raise ValueError(f"Fecha inválida '{t}' (se espera DD/MM/YYYY)")


def parse_bool(v: Optional[str]) -> Optional[bool]:
    """'SI'->True, 'NO'->False, vacío/otro -> None."""
    t = (v or "").strip().upper()
    if t == "SI":
        return True
    if t == "NO":
        return False
    return None


def parse_sexo(v: Optional[str]) -> Optional[str]:
    """'M'->'Masculino', 'F'->'Femenino'. Otro -> texto limpio o None (sexo es texto libre)."""
    t = (v or "").strip().upper()
    if t == "M":
        return "Masculino"
    if t == "F":
        return "Femenino"
    return limpiar(v)


def validar_headers(fieldnames: Optional[list]) -> Optional[str]:
    """Devuelve un mensaje si faltan columnas requeridas; None si están todas."""
    if not fieldnames:
        return "El archivo está vacío o no tiene encabezados"
    presentes = {_norm(f) for f in fieldnames if f}
    faltan = [h for h in HEADERS if _norm(h) not in presentes]
    if faltan:
        return f"Faltan columnas: {', '.join(faltan)}"
    return None


def _get(row: dict, header: str) -> str:
    """Lee una celda por header normalizado (tolera variaciones de espacios/caso)."""
    objetivo = _norm(header)
    for k, v in row.items():
        if k and _norm(k) == objetivo:
            return (v or "").strip()
    return ""


def identificador(row: dict) -> str:
    """'APELLIDO, NOMBRE' desde la fila cruda (para el reporte, aun si el parseo falló)."""
    partes = [x for x in (_get(row, "Apellido"), _get(row, "Nombre")) if x]
    return ", ".join(partes) or "(sin nombre)"


def email_valido(email: Optional[str]) -> bool:
    """Email presente y con formato mínimo (para decidir si va como faltante)."""
    e = email or ""
    return "@" in e and "." in e.split("@")[-1]


def obligatorios_faltantes(f: dict) -> list:
    """Campos sin los que NO se puede crear el empleado (bloqueantes). Devuelve etiquetas.
    Los 3 del negocio (nombre/apellido/DNI) + los que exige el schema/DB para poder crear."""
    checks = [
        ("nombre", f["nombre"]), ("apellido", f["apellido"]), ("DNI", f["dni"]),
        ("Organismo (empresa)", f["_empresa"]), ("Sector (área)", f["_area"]),
        ("Rol", f["roles"]), ("Fecha Ingreso", f["fecha_ingreso"]),
    ]
    return [etiqueta for etiqueta, valor in checks if not valor]


def parsear_fila(row: dict) -> dict:
    """Extrae y tipa los campos de una fila. Lanza ValueError si una fecha es inválida.
    Devuelve los campos del empleado + empresa/área/superior aparte (claves con '_')."""
    rol = limpiar(_get(row, "Rol"))
    reconocida = parse_fecha(_get(row, "Fecha Ingreso Reconocida"))
    return {
        "apellido": _get(row, "Apellido"),
        "nombre": _get(row, "Nombre"),
        "dni": limpiar(_get(row, "DNI")),
        "cuil": limpiar(_get(row, "CUIT")),
        "sexo": parse_sexo(_get(row, "Sexo")),
        "email_corporativo": _get(row, "Email").lower(),
        "fecha_nacimiento": parse_fecha(_get(row, "Fecha Nacimiento")),
        "fecha_ingreso": parse_fecha(_get(row, "Fecha Ingreso")),
        "fecha_ingreso_reconocida": reconocida.isoformat() if reconocida else None,
        "gerencia": limpiar(_get(row, "Gerencia")),
        "equipo": limpiar(_get(row, "Equipo")),
        "roles": [rol] if rol else [],
        "seniority": limpiar(_get(row, "Seniority")),
        "categoria": limpiar(_get(row, "Categoria")),
        "tipo_contrato": _get(row, "Modalidad Contratacion"),  # texto libre tal cual
        "co_sourcing": parse_bool(_get(row, "Co-sourcing")),
        "liderazgo": limpiar(_get(row, "Liderazgo")),
        "ubicacion": limpiar(_get(row, "Ubicación Física")),
        "turno": limpiar(_get(row, "Carga Horaria")),
        "product_owner": parse_bool(_get(row, "Product Owner")),
        "fecha_baja": parse_fecha(_get(row, "Fecha Baja")),
        "motivo_baja": limpiar(_get(row, "Motivo Baja")),
        # No se persisten en empleados: se usan para crear empresa/área y para el reporte.
        "_empresa": _get(row, "Organismo"),
        "_area": _get(row, "Sector"),
        "_superior_apellido": limpiar(_get(row, "Apellido Superior")),
        "_superior_nombre": limpiar(_get(row, "Nombre Superior")),
    }
