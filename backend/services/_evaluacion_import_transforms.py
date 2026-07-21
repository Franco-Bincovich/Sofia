"""
Helpers PUROS del parser de evaluaciones (fase 2): decode por BOM, normalización de
identidad (sin acentos), parseo de notas y de TIPO EVALUACION, validación de cabeceras.
Sin I/O, sin estado, sin dependencias del proyecto. Testeable en aislamiento.
"""
import unicodedata
from typing import List, Optional

# ── Vocabulario de columnas (nombres tal como vienen en los archivos, UPPER) ──

IDENTIDAD: List[str] = [
    "ORGANISMO", "GERENCIA", "SECTOR",
    "APELLIDO SUPERIOR", "NOMBRE SUPERIOR",
    "APELLIDO EVALUADO", "NOMBRE EVALUADO",
]
HEADERS_NOTAS: List[str] = IDENTIDAD + ["NOTA FINAL"]
COMPETENCIAS: List[str] = [
    "AUTOGESTION", "CONOCIMIENTO", "VISION ESTRATEGICA", "MANEJO CONFLICTOS",
    "ADAPTACION", "INICIATIVA", "EMPATIA", "ORGANIZACION", "TRABAJO EQUIPO",
    "CONDUCCION EQUIPOS", "PLANIFICACION", "RELACIONES INTERPERSONALES",
    "PROMEDIO PRODUCTIVIDAD", "RESPONSABILIDAD", "COMUNICACION",
]
HEADERS_DESGLOSE: List[str] = IDENTIDAD + ["TIPO EVALUACION"] + COMPETENCIAS

# Competencias EXCLUSIVAS del set de líder: su presencia define perfil='lider' (verificado
# contra los archivos reales: aparecen solo en las filas de los líderes). El perfil existe
# para no promediar sets de competencias distintos, así que la señal es la competencia, no el tipo.
COMPETENCIAS_LIDER = frozenset({
    "VISION ESTRATEGICA", "ORGANIZACION", "CONDUCCION EQUIPOS", "PLANIFICACION", "COMUNICACION",
})

# ── TIPO EVALUACION: valor del archivo -> valor del CHECK de la migración 078 ──

_TIPOS = {
    "AUTOEVALUACION": "AUTOEVALUACION",
    "AUTOEVALUACION LIDER": "AUTOEVALUACION_LIDER",
    "SUPERIOR INMEDIATO": "SUPERIOR_INMEDIATO",
    "PAR": "PAR",
    "COLABORADOR": "COLABORADOR",
    "LIBRES": "LIBRES",
}
# Un evaluado es 'lider' si aparece bajo alguno de estos tipos (regla de negocio, NO es_lider).
TIPOS_LIDER = frozenset({"AUTOEVALUACION_LIDER", "SUPERIOR_INMEDIATO"})


def decodificar(data: bytes) -> str:
    """Decodifica por BOM EXPLÍCITO (UTF-16 LE/BE, UTF-8 BOM) y, sin BOM, UTF-8 estricto.

    NUNCA cae a latin-1: latin-1 nunca falla y enmascara un UTF-16 como basura (el bug
    silencioso de importacion_nomina). Si no es determinable -> ValueError claro, no adivina.
    """
    if data[:2] in (b"\xff\xfe", b"\xfe\xff"):
        return data.decode("utf-16")      # el codec 'utf-16' lee el BOM, elige endianness y lo quita
    if data[:3] == b"\xef\xbb\xbf":
        return data.decode("utf-8-sig")
    utf16 = _detectar_utf16_sin_bom(data)  # el caso que se escapó: notas finales en UTF-16LE sin BOM
    if utf16:
        try:
            return data.decode(utf16)
        except UnicodeDecodeError:
            pass                           # la heurística falló → seguí al fallback UTF-8
    try:
        return data.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise ValueError(
            "Encoding no reconocido: sin BOM y no es UTF-8 válido. "
            "Guardá el archivo como UTF-8 o UTF-16."
        ) from exc


def _detectar_utf16_sin_bom(data: bytes) -> Optional[str]:
    """Heurística para UTF-16 SIN BOM sobre texto casi-ASCII: la mitad de los bytes son 0x00.
    LE → los 0x00 caen en posiciones IMPARES (byte alto del par); BE → en PARES. Umbral holgado
    (>30%) porque el contenido es ASCII casi puro. None si no parece UTF-16."""
    muestra = data[:2000]
    if len(muestra) < 2:
        return None
    pares, impares = muestra[0::2], muestra[1::2]
    ceros_pares = pares.count(0) / len(pares)
    ceros_impares = impares.count(0) / len(impares)
    if ceros_impares > 0.30 and ceros_impares > ceros_pares:
        return "utf-16-le"
    if ceros_pares > 0.30 and ceros_pares > ceros_impares:
        return "utf-16-be"
    return None


def _sin_acentos(s: str) -> str:
    """Quita diacríticos vía NFKD (á->a, ñ->n) — el _norm de nómina no lo hace."""
    return "".join(c for c in unicodedata.normalize("NFKD", s) if not unicodedata.combining(c))


def normalizar_campo(s: Optional[str]) -> str:
    """Un campo de identidad: trim + colapsa espacios + sin acentos + casefold."""
    return _sin_acentos(" ".join((s or "").split())).casefold()


def clave_identidad(apellido: str, nombre: str) -> str:
    """Clave de cruce A↔B (y de matcheo): apellido+nombre normalizados como un solo texto."""
    return normalizar_campo(f"{apellido} {nombre}")


def parse_nota(raw: Optional[str]) -> Optional[float]:
    """'  8.89' -> 8.89 · ' 10,00' -> 10.0 · '' / None -> None (no aplica). Inválido -> ValueError."""
    t = (raw or "").strip().replace(",", ".")
    if not t:
        return None
    try:
        return float(t)
    except ValueError as exc:
        raise ValueError(f"nota inválida '{raw}'") from exc


def normalizar_tipo(raw: Optional[str]) -> str:
    """Mapea TIPO EVALUACION al valor del CHECK 078. Desconocido -> ValueError (no se descarta)."""
    clave = " ".join((raw or "").split()).upper()
    tipo = _TIPOS.get(clave)
    if tipo is None:
        raise ValueError(f"tipo de evaluador desconocido '{raw}'")
    return tipo


def headers_faltantes(fieldnames: Optional[List[str]], requeridas: List[str]) -> str:
    """Devuelve las columnas requeridas ausentes (comparación trim+upper), como texto. '' = ok."""
    presentes = {(f or "").strip().upper() for f in (fieldnames or [])}
    return ", ".join(c for c in requeridas if c not in presentes)
