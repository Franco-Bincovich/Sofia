"""
Test de limpieza de columnas del export del catálogo de ítems de inventario.

Verifica que construir_filas_export NO emite keys de UUID crudo (id, empresa_id)
y SÍ emite el nombre de empresa + campos de negocio, con created_at dd/mm/aaaa.
Puro sobre el helper — no toca motor, router ni ownership.
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

from schemas.inventario import ItemResponse
from services._inventario_items_export import construir_filas_export

_UUID_KEYS = {"id", "empresa_id"}


def test_items_export_sin_uuids_con_nombres():
    row = ItemResponse(
        id="it-1", empresa_id="e-1", empresa_nombre="Karstec", nombre="Notebook Dell",
        tipo="Notebook", descripcion="i7 16GB", numero_serie="SN-9", estado="disponible",
        fecha_alta=date(2026, 2, 1), costo=1200.0, notas="ok", asignado_a=None,
        created_at=datetime(2026, 2, 1, 10, 30, 0),
    )
    fila = construir_filas_export([row])[0]
    assert _UUID_KEYS.isdisjoint(fila.keys())            # sin UUIDs crudos
    assert fila["Empresa"] == "Karstec" and fila["Nombre"] == "Notebook Dell"
    assert fila["Tipo"] == "Notebook" and fila["N° serie"] == "SN-9"
    assert fila["Estado"] == "disponible" and fila["Costo"] == 1200.0
    assert fila["Fecha alta"] == "01/02/2026" and fila["Creada"] == "01/02/2026"  # sin hora
    assert fila["Asignado a"] is None
