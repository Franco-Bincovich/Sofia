"""
Tests del resolutor de identidad → empleado (fase 3) — fake repo, sin red.

Cubre: candidato único (superior coincide · candidato sin manager), dos candidatos,
superior que no coincide, sin candidato, equivalencia previa (sin evaluar señales),
empresa cruzada (un empleado de otra empresa nunca es candidato) y match acento-insensible.
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

from uuid import UUID, uuid4

from schemas.evaluacion_import import EmpleadoCandidato
from services.evaluacion_matcheo_service import ResolutorIdentidad

EMPRESA_A = uuid4()
EMPRESA_B = uuid4()


class _FakeRepo:
    def __init__(self, por_empresa: dict, equivalencias: dict | None = None) -> None:
        self._por_empresa = por_empresa           # {empresa_str: [EmpleadoCandidato]}
        self._equiv = equivalencias or {}         # {(empresa_str, ap_norm, no_norm): empleado_id_str}
        self.empresas_consultadas: list[str] = []

    def find_equivalencia(self, empresa_id, apellido_csv, nombre_csv):
        return self._equiv.get((empresa_id, apellido_csv, nombre_csv))

    def find_empleados_empresa(self, empresa_id):
        self.empresas_consultadas.append(empresa_id)
        return list(self._por_empresa.get(empresa_id, []))

    def crear_equivalencia(self, datos):  # el resolutor NO debe persistir
        raise AssertionError("el resolutor no persiste en fase 3")


def _emp(apellido, nombre, manager_id=None, gerencia=None) -> EmpleadoCandidato:
    return EmpleadoCandidato(empleado_id=uuid4(), apellido=apellido, nombre=nombre,
                             manager_id=manager_id, gerencia=gerencia)


def _resolver(repo, empresa=EMPRESA_A, **kw):
    return ResolutorIdentidad(repo).resolver(empresa, **kw)


def test_resuelto_candidato_unico_con_superior_que_coincide():
    jefe = _emp("ZABALA", "SOFIA")
    sub = _emp("AMADO", "ANDREA", manager_id=jefe.empleado_id)
    repo = _FakeRepo({str(EMPRESA_A): [jefe, sub]})
    r = _resolver(repo, apellido_csv="AMADO", nombre_csv="ANDREA",
                  apellido_superior="ZABALA", nombre_superior="SOFIA")
    assert r.estado == "resuelto" and r.empleado_id == sub.empleado_id and r.fuente == "nombre+superior"


def test_resuelto_candidato_unico_sin_manager():
    sub = _emp("BAEZ", "NOELIA")  # sin manager: el superior del CSV no puede contradecir
    repo = _FakeRepo({str(EMPRESA_A): [sub]})
    r = _resolver(repo, apellido_csv="BAEZ", nombre_csv="NOELIA",
                  apellido_superior="QUIEN", nombre_superior="SEA")
    assert r.estado == "resuelto" and r.empleado_id == sub.empleado_id


def test_ambiguo_superior_no_coincide():
    jefe = _emp("ZABALA", "SOFIA")
    sub = _emp("AMADO", "ANDREA", manager_id=jefe.empleado_id)
    repo = _FakeRepo({str(EMPRESA_A): [jefe, sub]})
    r = _resolver(repo, apellido_csv="AMADO", nombre_csv="ANDREA",
                  apellido_superior="PEREZ", nombre_superior="JUAN")
    assert r.estado == "ambiguo" and r.empleado_id is None and "superior" in r.motivo
    assert r.candidatos[0].superior_coincide is False


def test_ambiguo_dos_candidatos_mismo_nombre():
    a, b = _emp("BUSTAMANTE", "DARIO"), _emp("BUSTAMANTE", "DARIO")
    repo = _FakeRepo({str(EMPRESA_A): [a, b]})
    r = _resolver(repo, apellido_csv="BUSTAMANTE", nombre_csv="DARIO")
    assert r.estado == "ambiguo" and len(r.candidatos) == 2 and "más de un" in r.motivo


def test_sin_candidato():
    repo = _FakeRepo({str(EMPRESA_A): [_emp("OTRO", "NOMBRE")]})
    r = _resolver(repo, apellido_csv="FANTASMA", nombre_csv="JUAN")
    assert r.estado == "sin_candidato" and r.empleado_id is None


def test_equivalencia_previa_resuelve_sin_evaluar_senales():
    target = uuid4()
    repo = _FakeRepo({}, equivalencias={(str(EMPRESA_A), "godoy", "sol"): str(target)})
    r = _resolver(repo, apellido_csv="GODOY", nombre_csv="SOL")
    assert r.estado == "resuelto" and r.empleado_id == target and r.fuente == "equivalencia"
    assert repo.empresas_consultadas == []  # cortó en la equivalencia, no miró empleados


def test_empresa_cruzada_no_matchea_otra_empresa():
    godoy = _emp("GODOY", "SOL")
    repo = _FakeRepo({str(EMPRESA_B): [godoy]})  # GODOY SOL solo existe en la empresa B
    r = _resolver(repo, empresa=EMPRESA_A, apellido_csv="GODOY", nombre_csv="SOL")
    assert r.estado == "sin_candidato"
    assert repo.empresas_consultadas == [str(EMPRESA_A)]  # nunca consultó la empresa B


def test_match_ignora_acentos():
    sub = _emp("PEÑA", "JOSÉ")
    repo = _FakeRepo({str(EMPRESA_A): [sub]})
    r = _resolver(repo, apellido_csv="pena", nombre_csv="jose")
    assert r.estado == "resuelto" and r.empleado_id == sub.empleado_id
