"""
Tests del bloqueo por período (B3.1).

Repo fake + AuditService fake (sin DB). Foco: verificar_periodo_abierto bloquea una fecha
dentro / un rango solapado y NO bloquea fuera; respeta módulo vs global; sin empresa no evalúa.
Service: cerrar crea + audita, rechaza rango inválido; reabrir audita y libera (find_cerrados vacío).
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

from datetime import date, datetime
from uuid import uuid4

import pytest

from schemas.periodo import PeriodoResponse
from services._periodo_utils import verificar_periodo_abierto
from services.periodo_service import PeriodoService
from utils.errors import AppError

_EMP = uuid4()


def _periodo(**over) -> PeriodoResponse:
    base = dict(
        id="p1", empresa_id="e1", modulo=None, desde=date(2026, 3, 1), hasta=date(2026, 3, 31),
        estado="cerrado", cerrado_por="u1", cerrado_at=datetime(2026, 3, 1, 9, 0),
        reabierto_por=None, reabierto_at=None,
    )
    base.update(over)
    return PeriodoResponse(**base)


class _FakeAudit:
    def __init__(self) -> None:
        self.calls: list[dict] = []

    def registrar(self, **kwargs) -> None:
        self.calls.append(kwargs)


class _FakeRepo:
    def __init__(self, cerrados=None) -> None:
        self._cerrados = cerrados or []
        self.creado: dict | None = None
        self.reabierto: str | None = None

    def find_cerrados(self, empresa_id, modulo):
        return [p for p in self._cerrados if p.modulo is None or p.modulo == modulo]

    def crear(self, datos: dict) -> PeriodoResponse:
        self.creado = datos
        return _periodo(modulo=datos.get("modulo"), desde=date(2026, 3, 1), hasta=date(2026, 3, 31))

    def find_by_id(self, id):
        return _periodo(id=id)

    def reabrir(self, id, usuario_id) -> None:
        self.reabierto = id


# ── verificar_periodo_abierto ────────────────────────────────────────────────

def test_bloquea_fecha_dentro():
    repo = _FakeRepo([_periodo()])
    with pytest.raises(AppError) as e:
        verificar_periodo_abierto(_EMP, "ausencias", fecha=date(2026, 3, 15), repo=repo)
    assert e.value.code == "PERIODO_CERRADO" and e.value.status_code == 409


def test_bloquea_rango_solapado():
    repo = _FakeRepo([_periodo()])
    with pytest.raises(AppError) as e:
        verificar_periodo_abierto(_EMP, "ausencias", desde=date(2026, 2, 25), hasta=date(2026, 3, 5), repo=repo)
    assert e.value.code == "PERIODO_CERRADO"


def test_no_bloquea_fecha_fuera():
    repo = _FakeRepo([_periodo()])
    verificar_periodo_abierto(_EMP, "ausencias", fecha=date(2026, 4, 1), repo=repo)


def test_no_bloquea_rango_fuera():
    repo = _FakeRepo([_periodo()])
    verificar_periodo_abierto(_EMP, "ausencias", desde=date(2026, 4, 1), hasta=date(2026, 4, 10), repo=repo)


def test_modulo_especifico_no_afecta_otro_modulo():
    repo = _FakeRepo([_periodo(modulo="ausencias")])
    # cierre de 'ausencias' no bloquea una vacación en las mismas fechas
    verificar_periodo_abierto(_EMP, "vacaciones", fecha=date(2026, 3, 15), repo=repo)
    # pero sí bloquea una ausencia
    with pytest.raises(AppError):
        verificar_periodo_abierto(_EMP, "ausencias", fecha=date(2026, 3, 15), repo=repo)


def test_periodo_global_bloquea_cualquier_modulo():
    repo = _FakeRepo([_periodo(modulo=None)])
    with pytest.raises(AppError):
        verificar_periodo_abierto(_EMP, "vacaciones", fecha=date(2026, 3, 15), repo=repo)


def test_sin_empresa_no_evalua():
    repo = _FakeRepo([_periodo()])
    verificar_periodo_abierto(None, "ausencias", fecha=date(2026, 3, 15), repo=repo)


def test_reabrir_libera():
    # tras reabrir, no hay cerrados → una fecha antes bloqueada ahora pasa
    repo = _FakeRepo([])
    verificar_periodo_abierto(_EMP, "ausencias", fecha=date(2026, 3, 15), repo=repo)


# ── PeriodoService ───────────────────────────────────────────────────────────

def test_cerrar_crea_y_audita():
    repo, audit = _FakeRepo(), _FakeAudit()
    svc = PeriodoService(repo=repo, audit=audit)
    p = svc.cerrar(_EMP, "ausencias", date(2026, 3, 1), date(2026, 3, 31), "u1")
    assert repo.creado["modulo"] == "ausencias" and p.estado == "cerrado"
    assert [c["evento"] for c in audit.calls] == ["cierre_periodo"]


def test_cerrar_rechaza_rango_invalido():
    with pytest.raises(AppError) as e:
        PeriodoService(repo=_FakeRepo(), audit=_FakeAudit()).cerrar(
            _EMP, None, date(2026, 3, 31), date(2026, 3, 1), "u1"
        )
    assert e.value.code == "FECHA_INVALIDA"


def test_reabrir_audita_reapertura():
    repo, audit = _FakeRepo(), _FakeAudit()
    PeriodoService(repo=repo, audit=audit).reabrir("p1", None, "u1")
    assert repo.reabierto == "p1"
    assert [c["evento"] for c in audit.calls] == ["reapertura_periodo"]
