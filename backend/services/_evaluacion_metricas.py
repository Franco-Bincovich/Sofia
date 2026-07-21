"""
Cálculo PURO de las métricas de un lote de evaluaciones (sin I/O). Trabaja sobre las filas
ya traídas (evaluados + resultados). Volumen chico (~30 evaluados, ~300 resultados) → Python;
PostgREST no expresa estos group-by (auto vs terceros, competencias por perfil, matriz) sin
vistas/RPC. Funciones testables con listas planas.
"""
from statistics import mean
from typing import Dict, List, Optional

from schemas.evaluacion_reportes import (
    BrechaItem, CompetenciaItem, CompetenciasReporte, FichaResponse, ResumenCiclo, SectorItem,
)

AUTO_TIPOS = frozenset({"AUTOEVALUACION", "AUTOEVALUACION_LIDER"})
_TIPO_ORDEN = ["AUTOEVALUACION", "AUTOEVALUACION_LIDER", "SUPERIOR_INMEDIATO", "PAR", "COLABORADOR", "LIBRES"]


def _prom(valores: List[float]) -> Optional[float]:
    return round(mean(valores), 2) if valores else None


def _agrupar(resultados) -> Dict[str, list]:
    out: Dict[str, list] = {}
    for r in resultados:
        out.setdefault(str(r.evaluado_id), []).append(r)
    return out


def resumen(evaluados, resultados) -> ResumenCiclo:
    notas = [e.nota_final for e in evaluados if e.nota_final is not None]
    pares = {(str(r.evaluado_id), r.tipo_evaluador) for r in resultados}
    return ResumenCiclo(
        evaluados=len(evaluados), con_nota_final=len(notas), promedio=_prom(notas),
        nota_mas_alta=max(notas) if notas else None, nota_mas_baja=min(notas) if notas else None,
        evaluaciones=len(pares))


def brecha(evaluados, resultados) -> List[BrechaItem]:
    por_ev = _agrupar(resultados)
    items = []
    for e in evaluados:
        rs = por_ev.get(str(e.id), [])
        auto = _prom([r.nota for r in rs if r.tipo_evaluador in AUTO_TIPOS])
        terceros = _prom([r.nota for r in rs if r.tipo_evaluador not in AUTO_TIPOS])
        dif = round(auto - terceros, 2) if auto is not None and terceros is not None else None
        items.append(BrechaItem(
            empleado_id=str(e.empleado_id) if e.empleado_id else None,
            apellido=e.apellido_evaluado, nombre=e.nombre_evaluado, auto=auto, terceros=terceros, brecha=dif))
    return sorted(items, key=lambda x: (x.brecha is None, -(x.brecha or 0.0)))  # sin brecha, al final


def por_sector(evaluados) -> List[SectorItem]:
    grupos: Dict[str, List[float]] = {}
    for e in evaluados:
        if e.nota_final is not None:  # solo con nota final
            grupos.setdefault(e.sector or "Sin sector", []).append(e.nota_final)
    return [
        SectorItem(sector=s, evaluados=len(v), promedio=_prom(v), minima=min(v), maxima=max(v))  # type: ignore[arg-type]
        for s, v in sorted(grupos.items())
    ]


def competencias(evaluados, resultados) -> CompetenciasReporte:
    perfil_por_id = {str(e.id): e.perfil for e in evaluados}
    tablas: Dict[str, Dict[str, List[float]]] = {"lider": {}, "general": {}}
    for r in resultados:
        if r.tipo_evaluador in AUTO_TIPOS:  # excluye autoevaluaciones
            continue
        perfil = perfil_por_id.get(str(r.evaluado_id))
        if perfil in tablas:
            tablas[perfil].setdefault(r.competencia, []).append(r.nota)
    return CompetenciasReporte(
        lider=_ranking(tablas["lider"]), general=_ranking(tablas["general"]),
        n_lider=sum(1 for e in evaluados if e.perfil == "lider"),
        n_general=sum(1 for e in evaluados if e.perfil == "general"))


def _ranking(comps: Dict[str, List[float]]) -> List[CompetenciaItem]:
    items = [CompetenciaItem(competencia=c, promedio=_prom(v), n=len(v)) for c, v in comps.items()]  # type: ignore[arg-type]
    return sorted(items, key=lambda x: -x.promedio)


def tipos_por_evaluado(resultados) -> Dict[str, List[str]]:
    """id de evaluado → tipos de evaluador presentes, en orden canónico."""
    vistos: Dict[str, set] = {}
    for r in resultados:
        vistos.setdefault(str(r.evaluado_id), set()).add(r.tipo_evaluador)
    return {k: [t for t in _TIPO_ORDEN if t in v] for k, v in vistos.items()}


def ficha(evaluado, resultados) -> FichaResponse:
    rs = [r for r in resultados if str(r.evaluado_id) == str(evaluado.id)]
    comps = [c for _, c in sorted({(r.orden, r.competencia) for r in rs})]
    tipos = [t for t in _TIPO_ORDEN if any(r.tipo_evaluador == t for r in rs)]
    celdas: Dict[str, Dict[str, float]] = {}
    terceros: Dict[str, List[float]] = {}
    for r in rs:
        celdas.setdefault(r.competencia, {})[r.tipo_evaluador] = r.nota
        if r.tipo_evaluador not in AUTO_TIPOS:
            terceros.setdefault(r.competencia, []).append(r.nota)
    return FichaResponse(
        apellido=evaluado.apellido_evaluado, nombre=evaluado.nombre_evaluado, sector=evaluado.sector,
        perfil=evaluado.perfil, nota_final=evaluado.nota_final, competencias=comps, tipos=tipos,
        celdas=celdas, promedio_terceros={c: _prom(v) for c, v in terceros.items()})  # type: ignore[misc]
