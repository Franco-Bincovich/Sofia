"""
Tests críticos de flujos de negocio — HR Karstec.
Todos deben pasar antes de hacer deploy. Sin excepciones.

Flujos cubiertos:
  - Health check: /health devuelve 200 con status "ok"
  - Auth: acceso sin token → 401 MISSING_TOKEN
  - Auth: token inválido → 401 INVALID_TOKEN
  - AppError: creación con message, code, status_code
  - Settings: variables requeridas cargan sin error

Ver BASES-DE-DESARROLLO.md — Base 9 para la filosofía de testing.
"""
import os

# Patch env vars antes de cualquier import del proyecto.
# pydantic-settings lee os.environ en el momento de Settings(), que ocurre
# al importar config.settings. Usar setdefault para no pisar un .env real.
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

import httpx
import pytest

from config.settings import settings
from main import app
from utils.errors import AppError

_TRANSPORT = httpx.ASGITransport(app=app)


def _client() -> httpx.AsyncClient:
    return httpx.AsyncClient(transport=_TRANSPORT, base_url="http://test")


# ─── Health check ─────────────────────────────────────────────────────────────


class TestHealthCheck:
    async def test_returns_200(self) -> None:
        async with _client() as c:
            resp = await c.get("/health")
        assert resp.status_code == 200

    async def test_body_status_ok(self) -> None:
        async with _client() as c:
            resp = await c.get("/health")
        assert resp.json()["status"] == "ok"


# ─── Auth middleware ───────────────────────────────────────────────────────────


class TestAuth:
    async def test_missing_token_returns_401(self) -> None:
        async with _client() as c:
            resp = await c.get("/api/empleados/")
        assert resp.status_code == 401

    async def test_missing_token_code(self) -> None:
        async with _client() as c:
            resp = await c.get("/api/empleados/")
        assert resp.json()["code"] == "MISSING_TOKEN"

    async def test_invalid_token_returns_401(self) -> None:
        async with _client() as c:
            resp = await c.get(
                "/api/empleados/",
                headers={"Authorization": "Bearer esto.no.es.un.jwt.valido"},
            )
        assert resp.status_code == 401

    async def test_invalid_token_code(self) -> None:
        async with _client() as c:
            resp = await c.get(
                "/api/empleados/",
                headers={"Authorization": "Bearer esto.no.es.un.jwt.valido"},
            )
        assert resp.json()["code"] == "INVALID_TOKEN"


# ─── AppError ─────────────────────────────────────────────────────────────────


class TestAppError:
    def test_creates_with_all_fields(self) -> None:
        err = AppError("Empleado no encontrado", "EMPLEADO_NOT_FOUND", 404)
        assert err.message == "Empleado no encontrado"
        assert err.code == "EMPLEADO_NOT_FOUND"
        assert err.status_code == 404

    def test_default_status_code_is_500(self) -> None:
        err = AppError("Error interno", "INTERNAL")
        assert err.status_code == 500

    def test_is_exception(self) -> None:
        err = AppError("Test", "TEST_CODE", 400)
        assert isinstance(err, Exception)

    def test_str_returns_message(self) -> None:
        err = AppError("Mensaje de error", "ERR_CODE", 422)
        assert str(err) == "Mensaje de error"


# ─── Settings ─────────────────────────────────────────────────────────────────


class TestSettings:
    def test_required_vars_loaded(self) -> None:
        assert settings.supabase_url
        assert settings.supabase_anon_key
        assert settings.supabase_service_key
        assert settings.jwt_secret
        assert settings.anthropic_api_key
        assert settings.resend_api_key

    def test_defaults_are_valid(self) -> None:
        assert settings.jwt_expiration_minutes > 0
        assert settings.refresh_token_expiration_days > 0
        assert settings.resend_from_email
        assert settings.allowed_origins

    def test_allowed_origins_list_parses(self) -> None:
        origins = settings.allowed_origins_list
        assert isinstance(origins, list)
        assert len(origins) >= 1
        assert all(o.strip() == o for o in origins)
