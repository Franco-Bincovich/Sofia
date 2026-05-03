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
from routers.areas import router as areas_router
from routers.auth import limiter, router as auth_router
from routers.costos import router as costos_router
from routers.empleados import router as empleados_router
from routers.empresa import router as empresa_router
from routers.offboarding import router as offboarding_router
from routers.onboarding import router as onboarding_router
from routers.assessment import router as assessment_router
from routers.dashboard import router as dashboard_router
from routers.organigrama import router as organigrama_router
from routers.importacion import router as importacion_router
from routers.integraciones import router as integraciones_router
from routers.reportes import router as reportes_router
from routers.sucesion import router as sucesion_router
from routers.vacantes import candidatos_router, router as vacantes_router

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
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
app.add_exception_handler(Exception, global_error_handler)

# ── Health check (ruta pública) ────────────────────────────────────────────────
@app.get("/health")
async def health_check():
    return {"status": "ok", "env": settings.app_env}

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(areas_router, prefix="/api/areas", tags=["areas"])
app.include_router(empleados_router, prefix="/api/empleados", tags=["empleados"])
app.include_router(vacantes_router, prefix="/api/vacantes", tags=["vacantes"])
app.include_router(candidatos_router, prefix="/api/candidatos", tags=["candidatos"])
app.include_router(onboarding_router, prefix="/api/onboarding", tags=["onboarding"])
app.include_router(offboarding_router, prefix="/api/offboarding", tags=["offboarding"])
app.include_router(costos_router, prefix="/api/costos", tags=["costos"])
app.include_router(sucesion_router, prefix="/api/sucesion", tags=["sucesion"])
app.include_router(assessment_router, prefix="/api/assessment", tags=["assessment"])
app.include_router(organigrama_router, prefix="/api/organigrama", tags=["organigrama"])
app.include_router(dashboard_router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(empresa_router, prefix="/api/empresa", tags=["empresa"])
app.include_router(reportes_router, prefix="/api/reportes", tags=["reportes"])
app.include_router(importacion_router, prefix="/api/importacion", tags=["importacion"])
app.include_router(integraciones_router, prefix="/api/integraciones", tags=["integraciones"])
