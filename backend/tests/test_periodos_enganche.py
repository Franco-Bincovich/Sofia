"""
Tests del enganche del bloqueo por período en ausencias, vacaciones y costos (nueva semántica).

Repos fake + FakePeriodos + FakeOwnership inyectados por constructor. El bloqueo aplica SOLO a
mandos_medios cuando HOY cae dentro de un período cerrado (las fechas del registro no influyen).
admin_rrhh / gerencia_lectura nunca se bloquean; costos (admin, rol=None) tampoco. Períodos
relativos a hoy (deterministas). Un mando gestiona a _EMP vía el FakeOwnership (subordinado).
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
_FECHA_REG = date(2026, 8, 15)  # fecha del registro (arbitraria): ya NO influye en el bloqueo
_FUERA = date(2026, 4, 15)      # otra fecha de registro arbitraria


def _periodo(modulo=None, desde=None, hasta=None) -> PeriodoResponse:
    """Período CERRADO. Por defecto cubre HOY (bloquea a un mando); pasar desde/hasta para variar."""
    hoy = date.today()
    return PeriodoResponse(
        id="p1", empresa_id="e1", modulo=modulo,
        desde=desde or hoy - timedelta(days=1), hasta=hasta or hoy + timedelta(days=1),
        estado="cerrado", cerrado_por="u1", cerrado_at=datetime(2026, 3, 1, 9, 0),
    )


def _periodo_pasado(modulo=None) -> PeriodoResponse:
    """Período CERRADO en el pasado (no cubre hoy → no bloquea ni a un mando)."""
    hoy = date.today()
    return _periodo(modulo=modulo, desde=hoy - timedelta(days=10), hasta=hoy - timedelta(days=5))


class _FakeAudit:
    def registrar(self, **kwargs) -> None:
        pass


class _FakePeriodos:
    """Solo implementa lo que usa verificar_periodo_abierto: find_cerrados."""

    def __init__(self, cerrados=None) -> None:
        self._c = cerrados or []

    def find_cerrados(self, empresa_id, modulo):
        return [p for p in self._c if p.modulo is None or p.modulo == modulo]


class _FakeOwnership:
    """Un mando cuyo subordinado directo es _EMP → puede_gestionar_empleado(_EMP) = True."""

    def find_by_user_id(self, user_id):
        return {"id": "mando-1"}

    def ids_subordinados(self, emp_id):
        return [str(_EMP)]


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
    # mando + período que cubre hoy → 409, aunque la fecha del registro (_FUERA) esté fuera del período
    svc = AusenciasService(repo=_FakeAusRepo(), audit=_FakeAudit(), periodo_repo=_FakePeriodos([_periodo()]), ownership_repo=_FakeOwnership())
    with pytest.raises(AppError) as e:
        svc.create(AusenciaCreate(empleado_id=_EMP, tipo_id=_TIPO, fecha_desde=_FUERA, fecha_hasta=_FUERA), "u1", rol="mandos_medios")
    assert e.value.code == "PERIODO_CERRADO" and e.value.status_code == 409


def test_ausencia_crear_fuera_ok():
    # mando + período que NO cubre hoy (pasado) → no bloquea
    repo = _FakeAusRepo()
    svc = AusenciasService(repo=repo, audit=_FakeAudit(), periodo_repo=_FakePeriodos([_periodo_pasado()]), ownership_repo=_FakeOwnership())
    svc.create(AusenciaCreate(empleado_id=_EMP, tipo_id=_TIPO, fecha_desde=_FECHA_REG, fecha_hasta=_FECHA_REG), "u1", rol="mandos_medios")
    assert repo.saved is True


def test_ausencia_crear_admin_no_bloquea():
    # rol NO-mando: admin_rrhh no se bloquea aunque el período cubra hoy (early return por rol)
    repo = _FakeAusRepo()
    svc = AusenciasService(repo=repo, audit=_FakeAudit(), periodo_repo=_FakePeriodos([_periodo()]))
    svc.create(AusenciaCreate(empleado_id=_EMP, tipo_id=_TIPO, fecha_desde=_FECHA_REG, fecha_hasta=_FECHA_REG), "u1", rol="admin_rrhh")
    assert repo.saved is True


def test_ausencia_editar_en_periodo_cerrado_409():
    repo = _FakeAusRepo(existing=_ausencia(_FECHA_REG, _FECHA_REG))
    svc = AusenciasService(repo=repo, audit=_FakeAudit(), periodo_repo=_FakePeriodos([_periodo()]), ownership_repo=_FakeOwnership())
    with pytest.raises(AppError) as e:
        svc.update(uuid4(), AusenciaUpdate(motivo="x"), rol="mandos_medios")
    assert e.value.code == "PERIODO_CERRADO"


def test_ausencia_borrar_en_periodo_cerrado_409():
    repo = _FakeAusRepo(existing=_ausencia(_FECHA_REG, _FECHA_REG))
    svc = AusenciasService(repo=repo, audit=_FakeAudit(), periodo_repo=_FakePeriodos([_periodo()]), ownership_repo=_FakeOwnership())
    with pytest.raises(AppError) as e:
        svc.delete(uuid4(), rol="mandos_medios")
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
    # mando + período que cubre hoy → 409 (la fecha del registro no importa)
    svc = VacacionesService(repo=_FakeVacRepo(), audit=_FakeAudit(), periodo_repo=_FakePeriodos([_periodo()]), ownership_repo=_FakeOwnership())
    with pytest.raises(AppError) as e:
        svc.create(SolicitudVacacionesCreate(empleado_id=_EMP, fecha_desde=_FUERA, fecha_hasta=_FUERA), "u1", rol="mandos_medios")
    assert e.value.code == "PERIODO_CERRADO"


def test_vacacion_crear_fuera_ok():
    # mando + período que NO cubre hoy (pasado) → no bloquea
    svc = VacacionesService(repo=_FakeVacRepo(), audit=_FakeAudit(), periodo_repo=_FakePeriodos([_periodo_pasado()]), ownership_repo=_FakeOwnership())
    out = svc.create(SolicitudVacacionesCreate(empleado_id=_EMP, fecha_desde=_FECHA_REG, fecha_hasta=_FECHA_REG), "u1", rol="mandos_medios")
    assert out.id == "v1"


# ── Costos / Nómina ──────────────────────────────────────────────────────────

class _FakeNominaRepo:
    def save_nomina(self, data):
        return NominaResponse(
            id="n1", empleado_id=str(_EMP), empresa_id="e1", empleado_nombre="Ana Lopez",
            area_nombre="Sistemas", mes=data.mes, anio=data.anio, monto_bruto=100.0, monto_neto=80.0, total=100.0,
        )


def test_nomina_no_bloquea_con_periodo_cerrado():
    # Costos lo opera admin (rol=None en el enganche) → nunca bloquea, aunque el período cubra hoy.
    svc = CostoService(nomina_repo=_FakeNominaRepo(), audit=_FakeAudit(), periodo_repo=_FakePeriodos([_periodo()]))
    data = NominaCreate(empleado_id=str(_EMP), mes=3, anio=2026, monto_bruto=100.0, monto_neto=80.0)
    out = svc.cargar_nomina(data, empresa_id="e1", usuario_id="u1")
    assert out.mes == 3


def test_nomina_cargar_sin_periodo_ok():
    # sin períodos cerrados → carga normal
    svc = CostoService(nomina_repo=_FakeNominaRepo(), audit=_FakeAudit(), periodo_repo=_FakePeriodos([]))
    data = NominaCreate(empleado_id=str(_EMP), mes=4, anio=2026, monto_bruto=100.0, monto_neto=80.0)
    out = svc.cargar_nomina(data, empresa_id="e1", usuario_id="u1")
    assert out.mes == 4
