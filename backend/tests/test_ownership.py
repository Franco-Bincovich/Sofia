"""
Tests de la función central de ownership (services/ownership.py).

Repo fake (sin DB): cubre cada rama del contrato del retorno
None | [] | [ids]. Foco: admin/gerencia → None (sin filtro), mando medio →
[self, ...subordinados], fail-closed ([]) para mando sin empleado y rol desconocido.
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

import pytest

from services.ownership import ids_empleados_visibles

_USER = "u-1"
_SELF = "e-self"
_SUB1 = "e-sub1"
_SUB2 = "e-sub2"


class _FakeRepo:
    """Doble de EmpleadoOwnershipRepo. empleado=None simula user sin vínculo."""

    def __init__(self, *, empleado=None, subordinados=None) -> None:
        self._empleado = empleado
        self._subordinados = subordinados or []
        self.find_calls: list[str] = []
        self.sub_calls: list[str] = []

    def find_by_user_id(self, user_id):
        self.find_calls.append(user_id)
        return self._empleado

    def ids_subordinados(self, empleado_id):
        self.sub_calls.append(empleado_id)
        return list(self._subordinados)


def test_admin_rrhh_devuelve_none_sin_tocar_repo():
    repo = _FakeRepo()
    assert ids_empleados_visibles(_USER, "admin_rrhh", repo) is None
    assert repo.find_calls == []  # None corta antes de consultar ownership


def test_gerencia_lectura_devuelve_none():
    repo = _FakeRepo()
    assert ids_empleados_visibles(_USER, "gerencia_lectura", repo) is None
    assert repo.find_calls == []


def test_mando_con_empleado_y_dos_subordinados_incluye_self():
    repo = _FakeRepo(empleado={"id": _SELF}, subordinados=[_SUB1, _SUB2])
    out = ids_empleados_visibles(_USER, "mandos_medios", repo)
    assert out == [_SELF, _SUB1, _SUB2]
    assert _SELF in out  # se ve a sí mismo, explícito
    assert repo.sub_calls == [_SELF]  # subordinados resueltos por su propio id


def test_mando_con_empleado_y_cero_subordinados_solo_self():
    repo = _FakeRepo(empleado={"id": _SELF}, subordinados=[])
    out = ids_empleados_visibles(_USER, "mandos_medios", repo)
    assert out == [_SELF]  # sin subordinados → solo su propio registro


def test_mando_sin_empleado_vinculado_fail_closed():
    repo = _FakeRepo(empleado=None)
    out = ids_empleados_visibles(_USER, "mandos_medios", repo)
    assert out == []  # [] = no ve nada, NUNCA None (que sería "ve todo")
    assert repo.sub_calls == []  # no se buscan subordinados de un empleado inexistente


@pytest.mark.parametrize("rol", ["superadmin", "management", "empleado", "", None])
def test_rol_desconocido_o_none_fail_closed(rol):
    repo = _FakeRepo(empleado={"id": _SELF}, subordinados=[_SUB1])
    assert ids_empleados_visibles(_USER, rol, repo) == []
    assert repo.find_calls == []  # ni siquiera consulta el vínculo
