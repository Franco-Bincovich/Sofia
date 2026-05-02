"""
HR Karstec — Sofia
Punto de entrada de la aplicación FastAPI.
Solo configuración de la app — sin lógica de negocio.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from config.settings import settings
from middleware.auth import AuthMiddleware
from middleware.error_handler import global_error_handler
from middleware.security_headers import SecurityHeadersMiddleware
from routers.auth import limiter, router as auth_router
from routers.empleados import router as empleados_router

app = FastAPI(
    title="HR Karstec API",
    version="1.0.0",
    docs_url="/docs" if settings.app_env == "development" else None,
    redoc_url=None,
)

# ── Rate limiting ──────────────────────────────────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── Middlewares (LIFO: el último agregado se ejecuta primero en el request) ────
app.add_middleware(AuthMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)
app.add_exception_handler(Exception, global_error_handler)

# ── Health check (ruta pública) ────────────────────────────────────────────────
@app.get("/health")
async def health_check():
    return {"status": "ok", "env": settings.app_env}

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(empleados_router, prefix="/api/empleados", tags=["empleados"])
