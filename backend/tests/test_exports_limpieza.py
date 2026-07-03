"""
Tests de limpieza de columnas del export en inventario, evaluaciones y objetivos.

Verifican que construir_filas_export de cada módulo NO emite keys de UUID crudo
(id, empresa_id, empleado_id, etc.) y SÍ emite los nombres resueltos + fechas
dd/mm/aaaa. Puro sobre los helpers — no toca motor, router ni ownership.
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

from schemas.evaluaciones import InstanciaResponse
from schemas.inventario import AsignacionResponse
from schemas.objetivo import ObjetivoResponse
from services._evaluaciones_export import construir_filas_export as filas_evaluaciones
from services._inventario_export import construir_filas_export as filas_inventario
from services._objetivos_export import construir_filas_export as filas_objetivos

# Ninguna fila del export debe contener estas keys (nombres de campo crudos con UUID).
_UUID_KEYS = {"id", "empresa_id", "empleado_id", "item_id", "ciclo_id", "evaluador_id", "responsable_id"}


# ── Inventario asignaciones ───────────────────────────────────────────────────

def test_inventario_export_sin_uuids_con_nombres():
    row = AsignacionResponse(
        id="a-1", empresa_id="e-1", empresa_nombre="Karstec", item_id="it-1",
        item_nombre="Notebook Dell", item_tipo="Notebook", item_numero_serie="SN-9",
        empleado_id="emp-1", empleado_nombre="Ana Lopez", fecha_asignacion=date(2026, 3, 1),
        fecha_devolucion=None, estado_devolucion=None, notas=None,
        created_at=datetime(2026, 3, 1, 10, 30, 0),
    )
    fila = filas_inventario([row])[0]
    assert _UUID_KEYS.isdisjoint(fila.keys())
    assert fila["Empresa"] == "Karstec" and fila["Empleado"] == "Ana Lopez"
    assert fila["Equipo"] == "Notebook Dell" and fila["N° serie"] == "SN-9"
    assert fila["Fecha asignación"] == "01/03/2026" and fila["Creada"] == "01/03/2026"
    assert fila["Fecha devolución"] == ""  # None → ''


# ── Evaluaciones instancias ───────────────────────────────────────────────────

def test_evaluaciones_export_sin_uuids_con_nombres():
    row = InstanciaResponse(
        id=uuid4(), empresa_id=uuid4(), empresa_nombre="Karstec", ciclo_id=uuid4(),
        ciclo_nombre="Q1 2026", empleado_id=uuid4(), empleado_nombre="Ana Lopez",
        empleado_area="Tecnología", evaluador_id=uuid4(), evaluador_nombre="Juan Pérez",
        estado="finalizada", puntaje_global=4.5, fecha_evaluacion=date(2026, 4, 10),
    )
    fila = filas_evaluaciones([row])[0]
    assert _UUID_KEYS.isdisjoint(fila.keys())
    assert fila["Empresa"] == "Karstec" and fila["Empleado"] == "Ana Lopez"
    assert fila["Ciclo"] == "Q1 2026" and fila["Evaluador"] == "Juan Pérez"
    assert fila["Área"] == "Tecnología" and fila["Estado"] == "finalizada"
    assert fila["Puntaje"] == 4.5 and fila["Fecha evaluación"] == "10/04/2026"


# ── Objetivos ─────────────────────────────────────────────────────────────────

def test_objetivos_export_sin_uuids_con_nombres():
    row = ObjetivoResponse(
        id="o-1", empresa_id="e-1", empresa_nombre="Karstec", responsable_id="u-1",
        responsable_nombre="Sofía RRHH", titulo="Migrar nómina", descripcion="Q2",
        prioridad="alta", estado="haciendo", fecha_entrega=date(2026, 6, 30),
        created_at=datetime(2026, 1, 5, 9, 0, 0), updated_at=datetime(2026, 2, 1, 12, 0, 0),
    )
    fila = filas_objetivos([row])[0]
    assert _UUID_KEYS.isdisjoint(fila.keys())
    assert fila["Empresa"] == "Karstec" and fila["Responsable"] == "Sofía RRHH"
    assert fila["Título"] == "Migrar nómina" and fila["Prioridad"] == "alta"
    assert fila["Fecha entrega"] == "30/06/2026"
    assert fila["Creada"] == "05/01/2026" and fila["Actualizada"] == "01/02/2026"  # sin hora
