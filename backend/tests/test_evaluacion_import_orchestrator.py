"""
Tests del orquestador de import de evaluaciones (fase 4) — fakes, sin red.

Cubre: preview con los 3 estados (resuelto/ambiguo/sin_candidato) y aviso de período
existente, y confirmar con reimportación que pisa, guardado selectivo de equivalencias,
evaluado sin candidato (empleado_id null) y el rechazo de un empleado de otra empresa.
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

from datetime import datetime, timezone
from uuid import uuid4

import pytest

from schemas.evaluacion_import import ResolucionIdentidad
from schemas.evaluacion_import_api import ConfirmarRequest, EvaluadoConfirm, ResultadoConfirm
from schemas.evaluacion_resultados import EvaluadoResponse, LoteResponse
from services import _evaluacion_import_transforms as tx
from services.evaluacion_import_orchestrator import EvaluacionImportOrchestrator
from utils.errors import AppError

EMPRESA = uuid4()


# ── Fakes ─────────────────────────────────────────────────────────────────────

class _FakeSvc:
    def __init__(self) -> None:
        self.lote_creado = None

    def crear_lote(self, data):
        self.lote_creado = LoteResponse(id=uuid4(), empresa_id=data.empresa_id, periodo=data.periodo,
                                        importado_por=data.importado_por, created_at=datetime.now(timezone.utc))
        return self.lote_creado

    def guardar_evaluados(self, lote_id, filas):
        return [EvaluadoResponse(id=uuid4(), lote_id=lote_id, created_at=datetime.now(timezone.utc),
                                 **f.model_dump()) for f in filas]

    def guardar_resultados(self, evaluado_id, filas):
        return len(filas)


class _FakeRepo:
    def __init__(self, prior=None, evaluados_prior=0) -> None:
        self.prior, self._n_prior, self.borrados = prior, evaluados_prior, []

    def find_lote_by_periodo(self, empresa_id, periodo):
        return self.prior

    def find_evaluados(self, lote_id):
        return [object()] * self._n_prior

    def delete_lote(self, id):
        self.borrados.append(id)
        return True


class _FakeMatcheo:
    def __init__(self, ids_empresa=()) -> None:
        from schemas.evaluacion_import import EmpleadoCandidato
        self._cands = [EmpleadoCandidato(empleado_id=i, apellido="X", nombre="Y") for i in ids_empresa]
        self.equivalencias = []

    def find_empleados_empresa(self, empresa_id):
        return list(self._cands)

    def crear_equivalencia(self, datos):
        self.equivalencias.append(datos)
        return datos


class _FakeAudit:
    def __init__(self) -> None:
        self.eventos = []

    def registrar(self, **kw):
        self.eventos.append(kw)


class _FakeResolutor:
    def __init__(self, por_nombre) -> None:
        self._m = por_nombre

    def resolver(self, empresa_id, apellido, nombre, apellido_superior=None, nombre_superior=None):
        return self._m[(apellido, nombre)]


# ── Helpers de CSV para el preview ────────────────────────────────────────────

def _desglose(filas: list[dict]) -> bytes:
    lineas = [";".join(tx.HEADERS_DESGLOSE)]
    lineas += [";".join(str(f.get(h, "")) for h in tx.HEADERS_DESGLOSE) for f in filas]
    return "\r\n".join(lineas).encode("utf-8")


def _fila(apellido, nombre, **comps) -> dict:
    return {"APELLIDO EVALUADO": apellido, "NOMBRE EVALUADO": nombre,
            "TIPO EVALUACION": "AUTOEVALUACION", **comps}


def _res(apellido, nombre, estado, empleado_id=None, fuente=None):
    return ResolucionIdentidad(apellido_csv=apellido, nombre_csv=nombre, estado=estado,
                               empleado_id=empleado_id, fuente=fuente)


# ── Preview ───────────────────────────────────────────────────────────────────

def test_preview_tres_estados_y_resumen():
    desglose = _desglose([
        _fila("GODOY", "SOL", AUTOGESTION="8"),
        _fila("BUSTAMANTE", "DARIO", AUTOGESTION="7", EMPATIA="6"),
        _fila("LERZO", "JUAN", AUTOGESTION="9"),
    ])
    resolutor = _FakeResolutor({
        ("GODOY", "SOL"): _res("GODOY", "SOL", "resuelto", empleado_id=uuid4(), fuente="nombre+superior"),
        ("BUSTAMANTE", "DARIO"): _res("BUSTAMANTE", "DARIO", "ambiguo"),
        ("LERZO", "JUAN"): _res("LERZO", "JUAN", "sin_candidato"),
    })
    orch = EvaluacionImportOrchestrator(resolutor=resolutor, repo=_FakeRepo(), matcheo_repo=_FakeMatcheo())
    r = orch.preview(EMPRESA, "Ciclo 2026", _desglose([]), desglose)
    assert r.resumen.evaluados == 3 and r.resumen.resueltos == 1
    assert r.resumen.ambiguos == 1 and r.resumen.sin_candidato == 1 and r.resumen.resultados == 4
    assert r.periodo_existe is False and r.registros_a_pisar == 0


def test_preview_avisa_periodo_existente():
    prior = LoteResponse(id=uuid4(), empresa_id=EMPRESA, periodo="Ciclo 2026",
                         importado_por=None, created_at=datetime.now(timezone.utc))
    desglose = _desglose([_fila("GODOY", "SOL", AUTOGESTION="8")])
    resolutor = _FakeResolutor({("GODOY", "SOL"): _res("GODOY", "SOL", "sin_candidato")})
    orch = EvaluacionImportOrchestrator(resolutor=resolutor, repo=_FakeRepo(prior=prior, evaluados_prior=7),
                                        matcheo_repo=_FakeMatcheo())
    r = orch.preview(EMPRESA, "Ciclo 2026", _desglose([]), desglose)
    assert r.periodo_existe is True and r.registros_a_pisar == 7


# ── Confirmar ─────────────────────────────────────────────────────────────────

def _confirm(empleado_id, apellido="GODOY", nombre="SOL", guardar_equiv=False, n_res=2) -> EvaluadoConfirm:
    resultados = [ResultadoConfirm(tipo_evaluador="AUTOEVALUACION", competencia=f"C{i}", orden=i, nota=8.0)
                  for i in range(1, n_res + 1)]
    return EvaluadoConfirm(apellido_evaluado=apellido, nombre_evaluado=nombre, perfil="general",
                           empleado_id=empleado_id, guardar_equivalencia=guardar_equiv, resultados=resultados)


def test_confirmar_reimporta_pisa_y_audita_una_vez():
    e1, e2 = uuid4(), uuid4()
    prior = LoteResponse(id=uuid4(), empresa_id=EMPRESA, periodo="Ciclo 2026",
                         importado_por=None, created_at=datetime.now(timezone.utc))
    repo, audit = _FakeRepo(prior=prior), _FakeAudit()
    orch = EvaluacionImportOrchestrator(persistencia=_FakeSvc(), repo=repo,
                                        matcheo_repo=_FakeMatcheo([e1, e2]), audit=audit)
    req = ConfirmarRequest(empresa_id=EMPRESA, periodo="Ciclo 2026", evaluados=[
        _confirm(e1, "GODOY", "SOL"), _confirm(e2, "AMADO", "ANDREA")])
    r = orch.confirmar(req, usuario_id=str(uuid4()))
    assert r.piso_periodo_anterior is True and repo.borrados == [str(prior.id)]
    assert r.evaluados == 2 and r.resultados == 4
    assert len(audit.eventos) == 1 and audit.eventos[0]["evento"] == "importacion_evaluaciones"


def test_confirmar_guarda_solo_equivalencias_marcadas():
    e1, e2 = uuid4(), uuid4()
    matcheo = _FakeMatcheo([e1, e2])
    orch = EvaluacionImportOrchestrator(persistencia=_FakeSvc(), repo=_FakeRepo(),
                                        matcheo_repo=matcheo, audit=_FakeAudit())
    req = ConfirmarRequest(empresa_id=EMPRESA, periodo="C", evaluados=[
        _confirm(e1, "GODOY", "SOL", guardar_equiv=True),
        _confirm(e2, "AMADO", "ANDREA", guardar_equiv=False)])
    r = orch.confirmar(req)
    assert r.equivalencias == 1 and len(matcheo.equivalencias) == 1
    assert matcheo.equivalencias[0]["apellido_csv"] == "godoy"  # normalizado


def test_confirmar_sin_candidato_persiste_con_null():
    orch = EvaluacionImportOrchestrator(persistencia=_FakeSvc(), repo=_FakeRepo(),
                                        matcheo_repo=_FakeMatcheo(), audit=_FakeAudit())
    req = ConfirmarRequest(empresa_id=EMPRESA, periodo="C",
                           evaluados=[_confirm(None, "LERZO", "JUAN", n_res=3)])
    r = orch.confirmar(req)
    assert r.evaluados == 1 and r.resultados == 3 and r.equivalencias == 0


def test_confirmar_rechaza_empleado_de_otra_empresa():
    ajeno = uuid4()  # no está en la empresa del lote
    orch = EvaluacionImportOrchestrator(persistencia=_FakeSvc(), repo=_FakeRepo(),
                                        matcheo_repo=_FakeMatcheo([uuid4()]), audit=_FakeAudit())
    req = ConfirmarRequest(empresa_id=EMPRESA, periodo="C", evaluados=[_confirm(ajeno)])
    with pytest.raises(AppError) as exc:
        orch.confirmar(req)
    assert exc.value.code == "EMPLEADO_FUERA_DE_EMPRESA"
