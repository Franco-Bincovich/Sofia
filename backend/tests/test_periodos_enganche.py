"""
Tests del enganche del bloqueo por período (B3.2) en ausencias, vacaciones y costos.

Repos fake + FakePeriodos inyectado por constructor (patrón audit/roles_repo). Foco:
crear/editar/borrar de un registro cuya fecha cae en un período cerrado → 409 PERIODO_CERRADO;
fuera del período cerrado → pasa. Nómina: el mes cerrado se convierte a rango [1, fin de mes].
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

from schemas.ausencias import AusenciaCreate, AusenciaResponse, AusenciaUpdate
from schemas.costo import NominaCreate, NominaResponse
from schemas.periodo import PeriodoResponse
from schemas.vacaciones import SolicitudVacacionesCreate, SolicitudVacacionesResponse
from services.ausencias_service import AusenciasService
from services.costo_service import CostoService
from services.vacaciones_service import VacacionesService
from utils.errors import AppError

_EMP = uuid4()
_TIPO = uuid4()
_DENTRO = date(2026, 3, 15)   # dentro del período cerrado (marzo 2026)
_FUERA = date(2026, 4, 15)    # fuera


def _periodo(modulo=None) -> PeriodoResponse:
    return PeriodoResponse(
        id="p1", empresa_id="e1", modulo=modulo, desde=date(2026, 3, 1), hasta=date(2026, 3, 31),
        estado="cerrado", cerrado_por="u1", cerrado_at=datetime(2026, 3, 1, 9, 0),
    )


class _FakeAudit:
    def registrar(self, **kwargs) -> None:
        pass


class _FakePeriodos:
    """Solo implementa lo que usa verificar_periodo_abierto: find_cerrados."""

    def __init__(self, cerrados=None) -> None:
        self._c = cerrados or []

    def find_cerrados(self, empresa_id, modulo):
        return [p for p in self._c if p.modulo is None or p.modulo == modulo]


def _ausencia(fd, fh) -> AusenciaResponse:
    return AusenciaResponse(
        id="a1", empresa_id="e1", empleado_id=str(_EMP), tipo_id=str(_TIPO),
        fecha_desde=fd, fecha_hasta=fh, dias=1, justificada=True, created_at=datetime(2026, 1, 1, 9, 0),
    )


class _FakeAusRepo:
    def __init__(self, existing=None) -> None:
        self._existing = existing
        self.saved = False
        self.deleted = False

    def find_empresa_for_empleado(self, empleado_id):
        return "e1"

    def find_by_id(self, id, empresa_id=None):
        return self._existing

    def save(self, *a, **k):
        self.saved = True
        return _ausencia(_FUERA, _FUERA)

    def update(self, id, empresa_id, payload):
        return _ausencia(_FUERA, _FUERA)

    def delete(self, id, empresa_id=None):
        self.deleted = True
        return True


# ── Ausencias ────────────────────────────────────────────────────────────────

def test_ausencia_crear_en_periodo_cerrado_409():
    svc = AusenciasService(repo=_FakeAusRepo(), audit=_FakeAudit(), periodo_repo=_FakePeriodos([_periodo()]))
    with pytest.raises(AppError) as e:
        svc.create(AusenciaCreate(empleado_id=_EMP, tipo_id=_TIPO, fecha_desde=_DENTRO, fecha_hasta=_DENTRO), "u1", rol="admin_rrhh")
    assert e.value.code == "PERIODO_CERRADO" and e.value.status_code == 409


def test_ausencia_crear_fuera_ok():
    repo = _FakeAusRepo()
    svc = AusenciasService(repo=repo, audit=_FakeAudit(), periodo_repo=_FakePeriodos([_periodo()]))
    svc.create(AusenciaCreate(empleado_id=_EMP, tipo_id=_TIPO, fecha_desde=_FUERA, fecha_hasta=_FUERA), "u1", rol="admin_rrhh")
    assert repo.saved is True


def test_ausencia_editar_en_periodo_cerrado_409():
    repo = _FakeAusRepo(existing=_ausencia(_DENTRO, _DENTRO))
    svc = AusenciasService(repo=repo, audit=_FakeAudit(), periodo_repo=_FakePeriodos([_periodo()]))
    with pytest.raises(AppError) as e:
        svc.update(uuid4(), AusenciaUpdate(motivo="x"), rol="admin_rrhh")
    assert e.value.code == "PERIODO_CERRADO"


def test_ausencia_borrar_en_periodo_cerrado_409():
    repo = _FakeAusRepo(existing=_ausencia(_DENTRO, _DENTRO))
    svc = AusenciasService(repo=repo, audit=_FakeAudit(), periodo_repo=_FakePeriodos([_periodo()]))
    with pytest.raises(AppError) as e:
        svc.delete(uuid4(), rol="admin_rrhh")
    assert e.value.code == "PERIODO_CERRADO" and repo.deleted is False


# ── Vacaciones ───────────────────────────────────────────────────────────────

class _FakeVacRepo:
    def find_empresa_for_empleado(self, empleado_id):
        return "e1"

    def find_overlapping(self, *a, **k):
        return []

    def save(self, *a, **k):
        return SolicitudVacacionesResponse(
            id="v1", empresa_id="e1", empleado_id=str(_EMP), fecha_desde=_FUERA, fecha_hasta=_FUERA,
            dias=1, tipo="vacaciones", cancelada=False, estado="planificada", created_at=datetime(2026, 1, 1, 9, 0),
        )


def test_vacacion_crear_en_periodo_cerrado_409():
    svc = VacacionesService(repo=_FakeVacRepo(), audit=_FakeAudit(), periodo_repo=_FakePeriodos([_periodo()]))
    with pytest.raises(AppError) as e:
        svc.create(SolicitudVacacionesCreate(empleado_id=_EMP, fecha_desde=_DENTRO, fecha_hasta=_DENTRO), "u1", rol="admin_rrhh")
    assert e.value.code == "PERIODO_CERRADO"


def test_vacacion_crear_fuera_ok():
    svc = VacacionesService(repo=_FakeVacRepo(), audit=_FakeAudit(), periodo_repo=_FakePeriodos([_periodo()]))
    out = svc.create(SolicitudVacacionesCreate(empleado_id=_EMP, fecha_desde=_FUERA, fecha_hasta=_FUERA), "u1", rol="admin_rrhh")
    assert out.id == "v1"


# ── Costos / Nómina ──────────────────────────────────────────────────────────

class _FakeNominaRepo:
    def save_nomina(self, data):
        return NominaResponse(
            id="n1", empleado_id=str(_EMP), empresa_id="e1", empleado_nombre="Ana Lopez",
            area_nombre="Sistemas", mes=data.mes, anio=data.anio, monto_bruto=100.0, monto_neto=80.0, total=100.0,
        )


def test_nomina_cargar_mes_cerrado_409():
    svc = CostoService(nomina_repo=_FakeNominaRepo(), audit=_FakeAudit(), periodo_repo=_FakePeriodos([_periodo()]))
    data = NominaCreate(empleado_id=str(_EMP), mes=3, anio=2026, monto_bruto=100.0, monto_neto=80.0)
    with pytest.raises(AppError) as e:
        svc.cargar_nomina(data, empresa_id="e1", usuario_id="u1")
    assert e.value.code == "PERIODO_CERRADO"


def test_nomina_cargar_mes_abierto_ok():
    svc = CostoService(nomina_repo=_FakeNominaRepo(), audit=_FakeAudit(), periodo_repo=_FakePeriodos([_periodo()]))
    data = NominaCreate(empleado_id=str(_EMP), mes=4, anio=2026, monto_bruto=100.0, monto_neto=80.0)
    out = svc.cargar_nomina(data, empresa_id="e1", usuario_id="u1")
    assert out.mes == 4
