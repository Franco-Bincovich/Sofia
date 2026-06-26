"""
Tests de importación CSV de empleados (T18.6b): validación exhaustiva + confirmar robusto.

validar_fila se prueba como función pura (sin DB). El service.confirmar se prueba con repo
fake + audit fake inyectados: reporta la carrera sin 500 y audita el lote una sola vez.
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

from schemas.importacion import FilaPreview
from services._csv_empleados_utils import validar_fila
from services.empleado_import_service import EmpleadoImportService

_AREAS = {"Tecnología": "area-1"}


def _row(**over) -> dict:
    base = {
        "nombre": "Ana", "apellido": "Lopez", "email_corporativo": "ana@x.com",
        "cargo": "Dev", "area": "Tecnología", "tipo_contrato": "efectivo",
        "modalidad_trabajo": "remoto", "fecha_ingreso": "2025-01-01", "dni": "111",
    }
    base.update(over)
    return base


def _validar(row, dnis=None, emails=None, legajos=None, seen=None):
    seen = seen or (set(), set(), set())
    return validar_fila(row, 2, _AREAS, dnis or set(), emails or set(), legajos or set(), *seen)


class TestValidarFila:
    def test_fila_valida(self) -> None:
        valida, error = _validar(_row())
        assert error is None
        assert valida["es_actualizacion"] is False
        assert valida["area_id"] == "area-1"

    def test_email_duplicado_en_db_es_error(self) -> None:
        valida, error = _validar(_row(), emails={"ana@x.com"})
        assert valida is None
        assert error["campo"] == "email_corporativo"

    def test_email_duplicado_no_bloquea_si_es_actualizacion(self) -> None:
        # DNI existente → es_actualizacion; el email propio no debe bloquear.
        valida, error = _validar(_row(), dnis={"111"}, emails={"ana@x.com"})
        assert error is None and valida["es_actualizacion"] is True

    def test_legajo_duplicado_en_db_es_error(self) -> None:
        valida, error = _validar(_row(legajo="L1"), legajos={"L1"})
        assert valida is None
        assert error["campo"] == "legajo"

    def test_duplicado_intra_csv(self) -> None:
        seen = (set(), set(), set())
        v1, e1 = _validar(_row(dni="111", email_corporativo="ana@x.com"), seen=seen)
        v2, e2 = _validar(_row(dni="111", email_corporativo="otro@x.com"), seen=seen)
        assert e1 is None and v1 is not None
        assert v2 is None and e2["campo"] == "dni"  # DNI repetido en el archivo

    def test_tipo_contrato_invalido(self) -> None:
        valida, error = _validar(_row(tipo_contrato="indefinido"))
        assert valida is None and error["campo"] == "tipo_contrato"


class _FakeImportRepo:
    def __init__(self) -> None:
        self.emails: set = set()
        self.dnis: set = set()
        self.legajos: set = set()
        self.upserted: list | None = None

    def existing_emails(self, emails):
        return self.emails & set(emails)

    def existing_dnis(self, empresa_id, dnis):
        return self.dnis & set(dnis)

    def existing_legajos(self, empresa_id, legajos):
        return self.legajos & set(legajos)

    def batch_upsert_empleados(self, filas):
        self.upserted = filas
        return [{"dni": f["dni"]} for f in filas]


class _FakeAudit:
    def __init__(self) -> None:
        self.calls: list[dict] = []

    def registrar(self, **kwargs) -> None:
        self.calls.append(kwargs)


def _fila(dni: str, es_act: bool = False, email: str = "n@x.com") -> FilaPreview:
    return FilaPreview(
        fila=2, nombre="N", apellido="A", email_corporativo=email, cargo="Dev",
        area_id="area-1", area_nombre="Tec", tipo_contrato="efectivo",
        modalidad_trabajo="remoto", fecha_ingreso="2025-01-01", dni=dni, es_actualizacion=es_act,
    )


class TestConfirmar:
    def test_inserta_validos_y_audita_una_vez(self) -> None:
        repo, audit = _FakeImportRepo(), _FakeAudit()
        svc = EmpleadoImportService(repo=repo, audit=audit)
        resp = svc.confirmar("e1", [_fila("111"), _fila("222")], usuario_id="u1")
        assert resp.importados == 2 and len(resp.errores) == 0
        assert len(audit.calls) == 1
        assert audit.calls[0]["evento"] == "importacion_empleados"
        assert audit.calls[0]["datos_nuevos"]["importados"] == 2

    def test_carrera_email_reporta_sin_500(self) -> None:
        repo, audit = _FakeImportRepo(), _FakeAudit()
        repo.emails = {"dup@x.com"}  # email tomado entre preview y confirmar
        svc = EmpleadoImportService(repo=repo, audit=audit)
        resp = svc.confirmar("e1", [_fila("111", email="dup@x.com"), _fila("222", email="ok@x.com")], usuario_id="u1")
        assert resp.importados == 1
        assert len(resp.errores) == 1
        assert "ya está en uso" in resp.errores[0].error
        # la fila en conflicto no se insertó
        assert repo.upserted is not None and all(f["dni"] != "111" for f in repo.upserted)
