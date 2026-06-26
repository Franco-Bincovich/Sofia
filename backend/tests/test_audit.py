"""
Tests del núcleo de auditoría (T18.2): AuditService.registrar / _diff.

Se mockea el repo (AuditService acepta repo inyectado) para no tocar DB. El foco está
en la propiedad de seguridad central: registrar() NUNCA propaga y todo el payload queda
JSON-serializable.
"""
import os

# Patch env antes de importar el proyecto (config.settings lee os.environ al instanciar,
# y la cadena de imports llega a integrations.supabase_client). setdefault no pisa un .env real.
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

from datetime import date
from uuid import uuid4

from services.audit_service import AuditService


class _FakeRepo:
    """Repo falso: captura el último payload y opcionalmente simula un fallo de DB."""

    def __init__(self) -> None:
        self.registrado: dict | None = None
        self.raise_on_registrar = False

    def registrar(self, payload: dict) -> None:
        if self.raise_on_registrar:
            raise RuntimeError("DB caída")
        self.registrado = payload

    def listar(self, *args, **kwargs):
        return [], 0


class TestRegistrar:
    def test_payload_correcto(self) -> None:
        fake = _FakeRepo()
        AuditService(repo=fake).registrar(
            usuario_id="u1", entidad="empleado", registro_id="r1",
            accion="INSERT", evento="alta_empleado", empresa_id="e1",
        )
        assert fake.registrado is not None
        assert fake.registrado["tabla"] == "empleado"      # tabla = entidad
        assert fake.registrado["entidad"] == "empleado"
        assert fake.registrado["accion"] == "INSERT"
        assert fake.registrado["evento"] == "alta_empleado"
        assert fake.registrado["registro_id"] == "r1"

    def test_accion_invalida_no_inserta(self) -> None:
        fake = _FakeRepo()
        AuditService(repo=fake).registrar(
            usuario_id="u1", entidad="empleado", registro_id="r1",
            accion="PATCH", evento="x",
        )
        assert fake.registrado is None  # acción fuera del CHECK → no se inserta

    def test_repo_excepcion_no_propaga(self) -> None:
        fake = _FakeRepo()
        fake.raise_on_registrar = True
        # No debe levantar: la auditoría es secundaria al negocio.
        AuditService(repo=fake).registrar(
            usuario_id="u1", entidad="empleado", registro_id="r1",
            accion="UPDATE", evento="baja_empleado",
        )
        # Si llegamos acá sin excepción, la propiedad se cumple.

    def test_json_serializable_uuid_y_date(self) -> None:
        fake = _FakeRepo()
        AuditService(repo=fake).registrar(
            usuario_id=uuid4(), entidad="vacacion", registro_id=uuid4(),
            accion="INSERT", evento="alta_vacacion", empresa_id=uuid4(),
            datos_nuevos={"id": uuid4(), "fecha": date(2026, 6, 25)},
        )
        p = fake.registrado
        assert isinstance(p["registro_id"], str)
        assert isinstance(p["usuario_id"], str)
        assert isinstance(p["empresa_id"], str)
        assert isinstance(p["datos_nuevos"]["id"], str)
        assert p["datos_nuevos"]["fecha"] == "2026-06-25"

    def test_usuario_y_empresa_none_quedan_none(self) -> None:
        fake = _FakeRepo()
        AuditService(repo=fake).registrar(
            usuario_id=None, entidad="usuario", registro_id="r1",
            accion="INSERT", evento="alta_usuario",
        )
        assert fake.registrado["usuario_id"] is None
        assert fake.registrado["empresa_id"] is None


class TestDiff:
    def test_solo_campos_cambiados(self) -> None:
        antes = {"nombre": "Ana", "cargo": "Dev", "estado": "activo"}
        despues = {"nombre": "Ana", "cargo": "Lead", "estado": "activo"}
        a, d = AuditService._diff(antes, despues)
        assert a == {"cargo": "Dev"}
        assert d == {"cargo": "Lead"}

    def test_diff_json_serializable(self) -> None:
        a, d = AuditService._diff({"x": uuid4()}, {"x": uuid4()})
        assert isinstance(a["x"], str)
        assert isinstance(d["x"], str)
