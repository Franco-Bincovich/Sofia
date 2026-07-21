"""
Parser de los dos CSV de evaluaciones -> estructuras en memoria (fase 2). SOLO parseo:
sin matcheo de empleados, sin persistencia, sin endpoints. Molde de tolerancia = nómina:
no aborta; clasifica OK / problema (con motivo) / anomalía del cruce.

Cruce: el DESGLOSE es la fuente de evaluados (trae los tipos -> perfil, y las notas por
competencia); NOTAS FINALES solo aporta nota_final. Un evaluado del desglose sin nota final
NO es error (nota_final=None). Una identidad en notas finales sin desglose SÍ es anomalía.
"""
import csv
import io
from typing import Dict, Iterator, List, Optional, Tuple

from schemas.evaluacion_import import (
    EvaluadoParseado, FilaProblema, ResultadoParseado, ResultadoParseo,
)
from services import _evaluacion_import_transforms as tx


def parsear(notas_bytes: bytes, desglose_bytes: bytes) -> ResultadoParseo:
    """Parsea ambos archivos y devuelve evaluados + problemas de fila + anomalías del cruce."""
    problemas: List[FilaProblema] = []
    notas, nombres = _parsear_notas(notas_bytes, problemas)
    evaluados, claves, anom_perfil = _parsear_desglose(desglose_bytes, notas, problemas)
    anom_cruce = [f"'{nombres[c]}' está en notas finales pero no en el desglose"
                  for c in notas if c not in claves]
    # 0 filas de notas = algo salió mal (encoding/cabecera), NO "todos sin nota". Se surface.
    anom_vacio = ["El archivo de notas finales no aportó ninguna nota (0 filas leídas). "
                  "Revisá el archivo y su formato."] if not notas else []
    return ResultadoParseo(evaluados=evaluados, problemas=problemas,
                           anomalias=anom_vacio + anom_perfil + anom_cruce)


def _leer(data: bytes, archivo: str, requeridas: List[str],
          problemas: List[FilaProblema]) -> Iterator[Tuple[int, Dict[str, str]]]:
    """Decodifica + DictReader(';') + valida cabeceras. Falla de archivo -> problema en fila 0
    y no rinde filas. Cada fila se rinde con claves trim+UPPER y valores trim."""
    try:
        texto = tx.decodificar(data)
    except ValueError as exc:
        problemas.append(FilaProblema(archivo=archivo, fila=0, motivo=str(exc)))
        return
    reader = csv.DictReader(io.StringIO(texto), delimiter=";")
    faltan = tx.headers_faltantes(reader.fieldnames, requeridas)
    if faltan:
        hallado = ", ".join(f for f in (reader.fieldnames or []) if f) or "(ninguna)"
        problemas.append(FilaProblema(archivo=archivo, fila=0,
                                      motivo=f"Faltan columnas: {faltan}. Encabezados encontrados: {hallado}"))
        return
    for n, raw in enumerate(reader, start=2):
        yield n, {(k or "").strip().upper(): (v or "").strip() for k, v in raw.items() if k}


def _parsear_notas(data: bytes, problemas: List[FilaProblema]) -> Tuple[Dict[str, Optional[float]], Dict[str, str]]:
    """Devuelve (clave -> nota_final) y (clave -> 'APELLIDO NOMBRE' para anomalías)."""
    notas: Dict[str, Optional[float]] = {}
    nombres: Dict[str, str] = {}
    for n, row in _leer(data, "notas_finales", tx.HEADERS_NOTAS, problemas):
        try:
            clave, display = _identidad(row)
            notas[clave] = tx.parse_nota(row["NOTA FINAL"])
            nombres[clave] = display
        except ValueError as exc:
            problemas.append(FilaProblema(archivo="notas_finales", fila=n, motivo=str(exc)))
    return notas, nombres


def _parsear_desglose(data: bytes, notas: Dict[str, Optional[float]], problemas: List[FilaProblema],
                      ) -> Tuple[List[EvaluadoParseado], set, List[str]]:
    """Agrupa filas por evaluado, acumula resultados y tipos; deriva perfil, adjunta nota_final,
    y reporta la incoherencia perfil↔tipo como anomalía (no la corrige)."""
    acc: Dict[str, dict] = {}
    for n, row in _leer(data, "desglose", tx.HEADERS_DESGLOSE, problemas):
        try:
            clave, _ = _identidad(row)
            tipo = tx.normalizar_tipo(row["TIPO EVALUACION"])
            resultados = _resultados_de_fila(row, tipo)
        except ValueError as exc:
            problemas.append(FilaProblema(archivo="desglose", fila=n, motivo=str(exc)))
            continue
        e = acc.setdefault(clave, _nuevo(row))
        e["tipos"].add(tipo)
        e["resultados"].extend(resultados)
    evaluados, anomalias = [], []
    for e in acc.values():
        ev = _a_evaluado(e, notas.get(tx.clave_identidad(e["apellido_evaluado"], e["nombre_evaluado"])))
        evaluados.append(ev)
        anom = _anomalia_perfil(ev, e["tipos"])
        if anom:
            anomalias.append(anom)
    return evaluados, set(acc.keys()), anomalias


def _identidad(row: Dict[str, str]) -> Tuple[str, str]:
    """(clave normalizada, 'APELLIDO NOMBRE'). ValueError si no hay apellido ni nombre."""
    ap, no = row.get("APELLIDO EVALUADO", ""), row.get("NOMBRE EVALUADO", "")
    if not ap and not no:
        raise ValueError("evaluado sin apellido ni nombre")
    return tx.clave_identidad(ap, no), f"{ap} {no}".strip()


def _resultados_de_fila(row: Dict[str, str], tipo: str) -> List[ResultadoParseado]:
    """Una fila (evaluado × tipo) -> resultados de sus celdas NO vacías. Vacía = no aplica."""
    out: List[ResultadoParseado] = []
    for orden, comp in enumerate(tx.COMPETENCIAS, start=1):
        nota = tx.parse_nota(row.get(comp))
        if nota is not None:
            out.append(ResultadoParseado(tipo_evaluador=tipo, competencia=comp, orden=orden, nota=nota))
    return out


def _nuevo(row: Dict[str, str]) -> dict:
    """Acumulador de un evaluado: identidad cruda (primera fila vista) + tipos + resultados."""
    return {
        "apellido_evaluado": row["APELLIDO EVALUADO"], "nombre_evaluado": row["NOMBRE EVALUADO"],
        "apellido_superior": row.get("APELLIDO SUPERIOR") or None,
        "nombre_superior": row.get("NOMBRE SUPERIOR") or None,
        "organismo": row.get("ORGANISMO") or None, "gerencia": row.get("GERENCIA") or None,
        "sector": row.get("SECTOR") or None, "tipos": set(), "resultados": [],
    }


def _anomalia_perfil(ev: EvaluadoParseado, tipos: set) -> Optional[str]:
    """Corrobora perfil (por competencias) contra el tipo de evaluador. Discrepancia = anomalía."""
    tiene_tipo_lider = bool(tipos & tx.TIPOS_LIDER)
    nombre = f"{ev.apellido_evaluado} {ev.nombre_evaluado}".strip()
    if ev.perfil == "lider" and not tiene_tipo_lider:
        return f"'{nombre}': competencias de líder pero ningún tipo de evaluador de líder"
    if ev.perfil == "general" and tiene_tipo_lider:
        return f"'{nombre}': tipo de evaluador de líder pero ninguna competencia de líder"
    return None


def _a_evaluado(e: dict, nota_final: Optional[float]) -> EvaluadoParseado:
    """Cierra un acumulador: perfil por las competencias de líder presentes + nota_final del cruce."""
    comps = {r.competencia for r in e["resultados"]}
    perfil = "lider" if comps & tx.COMPETENCIAS_LIDER else "general"
    return EvaluadoParseado(
        apellido_evaluado=e["apellido_evaluado"], nombre_evaluado=e["nombre_evaluado"],
        apellido_superior=e["apellido_superior"], nombre_superior=e["nombre_superior"],
        organismo=e["organismo"], gerencia=e["gerencia"], sector=e["sector"],
        perfil=perfil, nota_final=nota_final, resultados=e["resultados"],
    )
