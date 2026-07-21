"""
Tests de los helpers PUROS de métricas de evaluaciones (fase 5.2) — listas planas, sin red.

Cubre: resumen (promedio/max/min + pares evaluado×tipo), brecha (auto vs terceros, sin un
lado al final), sectores (solo con nota), competencias (2 tablas por perfil, excluye auto,
con su n), y ficha (matriz + promedio de terceros, celdas ausentes = no aplica).
"""
import os

_TEST_ENV: dict[str, str] = {
    "SUPABASE_URL": "https://test-project.supabase.co",
    "SUPABASE_ANON_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.anon",
    "SUPABASE_SERVICE_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.service",
    "JWT_SECRET": "test-secret-for-unit-tests-only-minimum-32-chars!!",
    "ANTHROPIC_API_KEY": "sk-ant-test",
    "RESEND_API_KEY": "re_test",
}
for _k, _v in _TEST_ENV.items():
    os.environ.setdefault(_k, _v)

from types import SimpleNamespace
from uuid import uuid4

from services import _evaluacion_metricas as met


def _ev(apellido, nombre, perfil="general", nota_final=None, sector=None, empleado_id=None):
    return SimpleNamespace(id=uuid4(), apellido_evaluado=apellido, nombre_evaluado=nombre,
                           perfil=perfil, nota_final=nota_final, sector=sector, empleado_id=empleado_id)


def _res(evaluado, tipo, competencia, nota, orden=1):
    return SimpleNamespace(evaluado_id=evaluado.id, tipo_evaluador=tipo, competencia=competencia,
                           nota=nota, orden=orden)


def test_resumen_promedios_y_pares_evaluado_tipo():
    a, b = _ev("A", "a", nota_final=8.0), _ev("B", "b", nota_final=6.0)
    c = _ev("C", "c")  # sin nota
    resultados = [
        _res(a, "AUTOEVALUACION", "X", 9), _res(a, "PAR", "X", 7),   # 2 pares para a
        _res(b, "SUPERIOR_INMEDIATO", "X", 5),                        # 1 par para b
    ]
    r = met.resumen([a, b, c], resultados)
    assert r.evaluados == 3 and r.con_nota_final == 2 and r.promedio == 7.0
    assert r.nota_mas_alta == 8.0 and r.nota_mas_baja == 6.0
    assert r.evaluaciones == 3  # (a,AUTO) (a,PAR) (b,SUPERIOR)


def test_brecha_auto_vs_terceros_y_sin_lado_al_final():
    a = _ev("Alta", "brecha")   # auto 9, terceros 6 -> brecha 3
    b = _ev("Baja", "brecha")   # auto 7, terceros 7 -> brecha 0
    c = _ev("Sin", "terceros")  # solo auto -> brecha None
    resultados = [
        _res(a, "AUTOEVALUACION", "X", 9), _res(a, "PAR", "X", 6),
        _res(b, "AUTOEVALUACION", "X", 7), _res(b, "COLABORADOR", "X", 7),
        _res(c, "AUTOEVALUACION", "X", 8),
    ]
    orden = met.brecha([a, b, c], resultados)
    assert [i.apellido for i in orden] == ["Alta", "Baja", "Sin"]  # desc, None al final
    assert orden[0].brecha == 3.0 and orden[1].brecha == 0.0 and orden[2].brecha is None
    assert orden[2].auto == 8.0 and orden[2].terceros is None


def test_por_sector_solo_con_nota_final():
    resultados = []
    evaluados = [
        _ev("A", "a", nota_final=8.0, sector="SALUD"), _ev("B", "b", nota_final=6.0, sector="SALUD"),
        _ev("C", "c", nota_final=None, sector="SALUD"),   # sin nota: no cuenta
        _ev("D", "d", nota_final=7.0, sector=None),       # sin sector -> "Sin sector"
    ]
    sectores = {s.sector: s for s in met.por_sector(evaluados)}
    assert sectores["SALUD"].evaluados == 2 and sectores["SALUD"].promedio == 7.0
    assert sectores["SALUD"].minima == 6.0 and sectores["SALUD"].maxima == 8.0
    assert "Sin sector" in sectores


def test_competencias_dos_tablas_excluye_auto_con_n():
    lider = _ev("L", "l", perfil="lider")
    g1, g2 = _ev("G1", "g", perfil="general"), _ev("G2", "g", perfil="general")
    resultados = [
        _res(lider, "AUTOEVALUACION_LIDER", "PLANIFICACION", 2),  # auto: EXCLUIDO
        _res(lider, "PAR", "PLANIFICACION", 8),
        _res(g1, "PAR", "AUTOGESTION", 6), _res(g2, "COLABORADOR", "AUTOGESTION", 8),
    ]
    c = met.competencias([lider, g1, g2], resultados)
    assert c.n_lider == 1 and c.n_general == 2
    plan = {i.competencia: i for i in c.lider}["PLANIFICACION"]
    assert plan.promedio == 8.0 and plan.n == 1   # el auto del líder no entró
    autog = {i.competencia: i for i in c.general}["AUTOGESTION"]
    assert autog.promedio == 7.0 and autog.n == 2
    assert all(i.competencia != "AUTOGESTION" for i in c.lider)  # tablas separadas


def test_ficha_matriz_y_promedio_terceros():
    ev = _ev("Uno", "solo", perfil="general", nota_final=7.5, sector="SALUD")
    resultados = [
        _res(ev, "AUTOEVALUACION", "AUTOGESTION", 9, orden=1),
        _res(ev, "PAR", "AUTOGESTION", 6, orden=1),
        _res(ev, "COLABORADOR", "AUTOGESTION", 8, orden=1),
        _res(ev, "PAR", "EMPATIA", 7, orden=2),
    ]
    f = met.ficha(ev, resultados)
    assert f.competencias == ["AUTOGESTION", "EMPATIA"]  # por orden
    assert f.celdas["AUTOGESTION"]["AUTOEVALUACION"] == 9 and f.celdas["AUTOGESTION"]["PAR"] == 6
    assert "AUTOEVALUACION" not in f.celdas["EMPATIA"]   # celda ausente = no aplica
    assert f.promedio_terceros["AUTOGESTION"] == 7.0     # (6+8)/2, sin el auto
    assert f.promedio_terceros["EMPATIA"] == 7.0
