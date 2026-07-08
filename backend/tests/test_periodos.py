"""
Tests del bloqueo por período (nueva semántica).

Repo fake + AuditService fake (sin DB). verificar_periodo_abierto bloquea SOLO a mandos_medios
cuando HOY (date.today()) cae dentro de un período cerrado; cualquier otro rol no bloquea nunca.
Las fechas del registro ya NO influyen. Períodos construidos relativos a hoy (deterministas).
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

from datetime import date, datetime, timedelta
from uuid import uuid4

import pytest

from schemas.periodo import PeriodoResponse
from services._periodo_utils import verificar_periodo_abierto
from services.periodo_service import PeriodoService
from utils.errors import AppError

_EMP = uuid4()
_HOY = date.today()
# Rangos relativos a hoy → deterministas sin importar cuándo corran los tests.
_CUBRE_HOY = dict(desde=_HOY - timedelta(days=1), hasta=_HOY + timedelta(days=1))
_PASADO = dict(desde=_HOY - timedelta(days=10), hasta=_HOY - timedelta(days=5))
_FUTURO = dict(desde=_HOY + timedelta(days=5), hasta=_HOY + timedelta(days=10))


def _periodo(**over) -> PeriodoResponse:
    base = dict(
        id="p1", empresa_id="e1", modulo=None,
        desde=_HOY - timedelta(days=1), hasta=_HOY + timedelta(days=1),  # por defecto cubre hoy
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


# ── verificar_periodo_abierto (mando + hoy dentro del período cerrado) ────────

def test_bloquea_fecha_dentro():
    # mando + período cerrado que cubre hoy → bloquea
    repo = _FakeRepo([_periodo()])
    with pytest.raises(AppError) as e:
        verificar_periodo_abierto(_EMP, "ausencias", "mandos_medios", repo=repo)
    assert e.value.code == "PERIODO_CERRADO" and e.value.status_code == 409


def test_bloquea_rango_solapado():
    # borde: hoy == hasta del período → sigue bloqueando (límite inclusivo)
    repo = _FakeRepo([_periodo(desde=_HOY - timedelta(days=3), hasta=_HOY)])
    with pytest.raises(AppError) as e:
        verificar_periodo_abierto(_EMP, "ausencias", "mandos_medios", repo=repo)
    assert e.value.code == "PERIODO_CERRADO"


def test_no_bloquea_fecha_fuera():
    # mando + período en el pasado (hoy fuera) → no bloquea
    repo = _FakeRepo([_periodo(**_PASADO)])
    verificar_periodo_abierto(_EMP, "ausencias", "mandos_medios", repo=repo)


def test_no_bloquea_rango_fuera():
    # mando + período en el futuro (hoy fuera) → no bloquea
    repo = _FakeRepo([_periodo(**_FUTURO)])
    verificar_periodo_abierto(_EMP, "ausencias", "mandos_medios", repo=repo)


def test_rol_no_mando_no_bloquea():
    # CORAZÓN de la nueva lógica: un rol NO-mando no se bloquea aunque hoy caiga en el período.
    repo = _FakeRepo([_periodo()])
    verificar_periodo_abierto(_EMP, "ausencias", "admin_rrhh", repo=repo)
    verificar_periodo_abierto(_EMP, "ausencias", "gerencia_lectura", repo=repo)
    verificar_periodo_abierto(_EMP, "ausencias", None, repo=repo)


def test_modulo_especifico_no_afecta_otro_modulo():
    repo = _FakeRepo([_periodo(modulo="ausencias")])
    # cierre de 'ausencias' vigente hoy no bloquea una vacación
    verificar_periodo_abierto(_EMP, "vacaciones", "mandos_medios", repo=repo)
    # pero sí bloquea una ausencia
    with pytest.raises(AppError):
        verificar_periodo_abierto(_EMP, "ausencias", "mandos_medios", repo=repo)


def test_periodo_global_bloquea_cualquier_modulo():
    repo = _FakeRepo([_periodo(modulo=None)])
    with pytest.raises(AppError):
        verificar_periodo_abierto(_EMP, "vacaciones", "mandos_medios", repo=repo)


def test_sin_empresa_no_evalua():
    # empresa None → no evalúa, aunque sea mando y el período cubra hoy
    repo = _FakeRepo([_periodo()])
    verificar_periodo_abierto(None, "ausencias", "mandos_medios", repo=repo)


def test_reabrir_libera():
    # tras reabrir, no hay cerrados → un mando ya no se bloquea
    repo = _FakeRepo([])
    verificar_periodo_abierto(_EMP, "ausencias", "mandos_medios", repo=repo)


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
