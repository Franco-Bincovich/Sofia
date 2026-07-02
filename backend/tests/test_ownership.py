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

from services._ownership_filter import resolver_filtro_empleados
from services.ownership import ids_empleados_visibles, puede_gestionar_empleado

_USER = "u-1"
_SELF = "e-self"
_SUB1 = "e-sub1"
_SUB2 = "e-sub2"
_AREA = "a-1"


class _FakeRepo:
    """Doble de EmpleadoOwnershipRepo. empleado=None simula user sin vínculo."""

    def __init__(self, *, empleado=None, subordinados=None, area=None) -> None:
        self._empleado = empleado
        self._subordinados = subordinados or []
        self._area = area or []
        self.find_calls: list[str] = []
        self.sub_calls: list[str] = []
        self.area_calls: list = []

    def find_by_user_id(self, user_id):
        self.find_calls.append(user_id)
        return self._empleado

    def ids_subordinados(self, empleado_id):
        self.sub_calls.append(empleado_id)
        return list(self._subordinados)

    def ids_empleados_por_area(self, empresa_id, area_id):
        self.area_calls.append((empresa_id, area_id))
        return list(self._area)


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


# --- resolver_filtro_empleados: combinación ownership + área ----------------
# Contrato: (empleado_ids, vacio). None = sin filtro · [ids] = solo esos · vacio=True = vacío sin consultar.


def test_filtro_admin_sin_area_sin_restriccion():
    repo = _FakeRepo()
    ids, vacio = resolver_filtro_empleados(_USER, "admin_rrhh", None, None, repo)
    assert (ids, vacio) == (None, False)  # admin ve todo por empresa, como hoy
    assert repo.area_calls == []


def test_filtro_admin_con_area_solo_el_area():
    repo = _FakeRepo(area=[_SUB1, _SUB2])
    ids, vacio = resolver_filtro_empleados(_USER, "admin_rrhh", None, _AREA, repo)
    assert vacio is False and ids == [_SUB1, _SUB2]  # el area_id sigue funcionando


def test_filtro_gerencia_sin_area_sin_restriccion():
    ids, vacio = resolver_filtro_empleados(_USER, "gerencia_lectura", None, None, _FakeRepo())
    assert (ids, vacio) == (None, False)


def test_filtro_mando_con_subs_sin_area():
    repo = _FakeRepo(empleado={"id": _SELF}, subordinados=[_SUB1, _SUB2])
    ids, vacio = resolver_filtro_empleados(_USER, "mandos_medios", None, None, repo)
    assert vacio is False and ids == [_SELF, _SUB1, _SUB2]  # se ve a sí mismo + subordinados


def test_filtro_mando_sin_subs_vacio_sin_consultar():
    repo = _FakeRepo(empleado=None)
    ids, vacio = resolver_filtro_empleados(_USER, "mandos_medios", None, None, repo)
    assert (ids, vacio) == (None, True)  # vacio → el caller no consulta la tabla


def test_filtro_mando_con_area_es_interseccion():
    # visibles = [self, sub1, sub2]; área = [sub2, otro] → intersección = [sub2]
    repo = _FakeRepo(empleado={"id": _SELF}, subordinados=[_SUB1, _SUB2], area=[_SUB2, "otro"])
    ids, vacio = resolver_filtro_empleados(_USER, "mandos_medios", None, _AREA, repo)
    assert vacio is False and ids == [_SUB2]  # solo lo que está en AMBOS conjuntos


def test_filtro_mando_area_sin_solape_vacio():
    # área de otra gente, ninguno es subordinado del mando → intersección vacía
    repo = _FakeRepo(empleado={"id": _SELF}, subordinados=[_SUB1], area=["x", "y"])
    ids, vacio = resolver_filtro_empleados(_USER, "mandos_medios", None, _AREA, repo)
    assert (ids, vacio) == (None, True)


def test_filtro_area_sin_miembros_vacio():
    repo = _FakeRepo(empleado={"id": _SELF}, subordinados=[_SUB1], area=[])
    ids, vacio = resolver_filtro_empleados(_USER, "mandos_medios", None, _AREA, repo)
    assert (ids, vacio) == (None, True)  # área existe pero sin empleados


# --- puede_gestionar_empleado: guard de escritura por fila ------------------
# Contrato: None (admin/gerencia) → True siempre · [ids] → True si está · [] → False.


@pytest.mark.parametrize("rol", ["admin_rrhh", "gerencia_lectura"])
def test_gestionar_admin_gerencia_gestiona_cualquiera(rol):
    # None → True para cualquier empleado, sin consultar el vínculo
    repo = _FakeRepo()
    assert puede_gestionar_empleado(_USER, rol, "cualquier-id", repo) is True
    assert repo.find_calls == []


def test_gestionar_mando_su_subordinado_true():
    repo = _FakeRepo(empleado={"id": _SELF}, subordinados=[_SUB1, _SUB2])
    assert puede_gestionar_empleado(_USER, "mandos_medios", _SUB1, repo) is True
    assert puede_gestionar_empleado(_USER, "mandos_medios", _SELF, repo) is True  # a sí mismo


def test_gestionar_mando_ajeno_false():
    repo = _FakeRepo(empleado={"id": _SELF}, subordinados=[_SUB1])
    assert puede_gestionar_empleado(_USER, "mandos_medios", _SUB2, repo) is False


def test_gestionar_mando_sin_empleado_false():
    assert puede_gestionar_empleado(_USER, "mandos_medios", _SUB1, _FakeRepo(empleado=None)) is False


@pytest.mark.parametrize("rol", ["superadmin", "", None])
def test_gestionar_rol_desconocido_false(rol):
    repo = _FakeRepo(empleado={"id": _SELF}, subordinados=[_SUB1])
    assert puede_gestionar_empleado(_USER, rol, _SUB1, repo) is False  # fail-closed


def test_gestionar_acepta_uuid_o_str():
    # empleado_id puede llegar como UUID (del body) o str (de la fila) — se compara por str
    from uuid import UUID
    uid = UUID("00000000-0000-0000-0000-000000000abc")
    repo = _FakeRepo(empleado={"id": _SELF}, subordinados=[str(uid)])
    assert puede_gestionar_empleado(_USER, "mandos_medios", uid, repo) is True
