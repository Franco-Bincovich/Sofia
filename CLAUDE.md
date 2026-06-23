# CLAUDE.md — Sofia (HR Karstec)

> **Ubicación:** raíz de `RRHH/Sofia/`, junto a `backend/` y `frontend/`.
> Claude Code lo lee al inicio de cada sesión. No moverlo a subdirectorios.

---

## Documentos de referencia (leer cuando aplique)

- `docs/MODELO_DATOS.md` — fuente de verdad del schema. Si algo contradice una tabla, manda este doc.
- `docs/BASES-DE-DESARROLLO.md` — convenciones de arquitectura, errores, logging, testing.
- `docs/ORDEN-Y-LEGIBILIDAD.md` — límites de archivo, naming, estructura de carpetas.
- `docs/SEGURIDAD-PENTEST.md` — autenticación, validación, rate limiting, secrets.
- `docs/UX-UI.md` — componentes, responsive, accesibilidad, design system.

---

## Qué es este proyecto

Sofia es el repositorio del producto **HR Karstec**: plataforma multiempresa de gestión del ciclo de vida del empleado. Un equipo de RRHH (3 personas) administra entre 2 y 5 empresas desde la misma instancia, con datos aislados por `empresa_id` y vistas consolidadas.

Módulos: empleados, organigrama, onboarding/offboarding, vacantes, costos, sucesión, assessment, vacaciones, ausencias, capacitaciones, evaluaciones de desempeño, inventario, objetivos, proyectos, reportes con IA, configuración y procesos.

---

## Stack

- **Frontend**: Next.js 16.2.4 (App Router) · TypeScript estricto · Tailwind CSS · Shadcn/ui — Vercel
- **Backend**: Python 3.11 · FastAPI · arquitectura por capas — Vercel (serverless), migración a AWS planificada
- **Base de datos**: Supabase (PostgreSQL) · RLS activo en todas las tablas
- **Auth**: Supabase Auth · JWT ES256 verificado vía `supabase_admin.auth.get_user(token)`
- **Storage**: Supabase Storage — buckets: `documentos`, `cvs`, `avatars`, `reportes`
- **IA**: Anthropic Claude Sonnet · cliente singleton en `integrations/anthropic_client.py` · timeout 25s
- **Email**: Resend — instalado en requirements.txt, pendiente de conectar módulo por módulo
- **Exportaciones**: openpyxl (export), reportlab (PDF)

---

## Estructura de carpetas

```
Sofia/                         ← raíz del repo (acá va este CLAUDE.md)
├── CLAUDE.md                  ← este archivo
├── .env.example               ← todas las variables documentadas
├── backend/
│   ├── main.py                ← punto de entrada, registra todos los routers
│   ├── config/
│   │   └── settings.py        ← única fuente de variables de entorno
│   ├── routers/               ← endpoints HTTP (max 80 líneas)
│   ├── controllers/           ← VACÍO — capa no implementada, no usar
│   ├── services/              ← lógica de negocio (max 150 líneas)
│   ├── repositories/          ← acceso a DB via Supabase ORM (max 100 líneas)
│   ├── integrations/
│   │   ├── supabase_client.py ← proxy resiliente con recreación ante RemoteProtocolError
│   │   └── anthropic_client.py ← singleton con timeout=25s, max_retries=0
│   ├── schemas/               ← modelos Pydantic
│   ├── middleware/            ← auth.py, error_handler.py, security_headers.py
│   ├── utils/
│   │   ├── errors.py          ← AppError centralizado
│   │   ├── logger.py          ← logger JSON estructurado
│   │   ├── empresa.py         ← get_empresa_id / require_empresa_id
│   │   └── files.py           ← validate_upload (MIME + tamaño)
│   ├── migrations/            ← 57 archivos SQL numerados (000–056)
│   └── tests/
└── frontend/
    ├── app/
    │   ├── (auth)/            ← login, cambio de contraseña
    │   ├── (dashboard)/       ← 28 rutas protegidas (todos los módulos)
    │   ├── assessment/[token] ← evaluación pública sin login
    │   ├── error.tsx          ← error boundary (Next.js 16, "use client", unstable_retry)
    │   ├── not-found.tsx      ← página 404
    │   └── global-error.tsx   ← error boundary global con html/body propio
    ├── components/
    │   ├── ui/                ← genéricos: Button, Input, Table, Modal, Skeleton
    │   ├── layout/            ← Sidebar (con EmpresaSelector), PageHeader, ThemeProvider
    │   └── features/          ← componentes específicos por módulo
    ├── hooks/
    ├── services/              ← llamadas a la API + empresaStore.ts
    ├── types/
    ├── styles/
    │   └── design-system.ts
    └── utils/
```

---

## Arquitectura real del backend

**La capa `controllers/` existe en la carpeta pero está vacía. No usarla.**

El flujo real y obligatorio es:

```
router → service → repository → DB
       ↘ integration → Supabase / Anthropic / Resend
```

Nunca saltear capas. El router no llama al repository directamente. El service no conoce detalles HTTP.

---

## Convenciones de código

### Backend (Python)

- **Flujo obligatorio**: `router → service → repository`. Sin controllers.
- **Errores**: siempre `AppError(message, code, status_code)` desde `utils/errors.py`.
- **Logs**: solo eventos de negocio importantes. Nunca `print()`. Usar `logger` de `utils/logger.py`.
- **Config**: nunca `os.environ` directamente. Solo `from config.settings import settings`.
- **Docstrings**: obligatorios en todos los métodos de `services/` e `integrations/`.
- **Naming**: `snake_case` funciones/variables · `PascalCase` clases · `UPPER_SNAKE_CASE` constantes.
- **Límites**: router 80 líneas · service 150 · repository 100. Si se supera, proponer división antes de escribir.
- **Schemas Pydantic**: patrón `Base → Create → Update → Response`. Siempre en `schemas/`, nunca inline.
- **IDs**: siempre `UUID` tipado en path params, nunca `str`.
- **DB**: siempre vía ORM de Supabase (`.eq()`, `.select()`, `.insert()`). Nunca concatenar strings en queries.
- **Secrets**: nunca hardcodeados. Solo vía `settings`.
- **Uploads**: todo endpoint que reciba `UploadFile` debe llamar a `validate_upload()` de `utils/files.py` después de `await file.read()`.
- **Paginación**: los endpoints de listado usan `page: int = Query(default=1, ge=1)` y `page_size: int = Query(default=20, ge=1, le=100)`. Los repos usan `.select("*", count="exact")` y `.range()`.

### Frontend (TypeScript)

- Nunca usar `any`. TypeScript estricto en todo el proyecto.
- **Naming**: componentes `PascalCase` · hooks con prefijo `use` · constantes `UPPER_SNAKE_CASE`.
- **Estados obligatorios**: todo componente que carga datos implementa skeleton (cargando), EmptyState (vacío), ErrorState (error) y vista con datos.
- **Feedback de acciones**: usar Sonner (`toast.success`, `toast.error`) después de cada mutación. Nunca `catch {}` vacío ni silencioso.
- **Formularios**: label siempre visible, validación en tiempo real, errores específicos y accionables.
- **Touch targets**: mínimo 44×44px en mobile.
- **Mobile-first**: estilos base para mobile, `md:` y `lg:` para pantallas más grandes.
- **Next.js 16**: las páginas `error.tsx` y `global-error.tsx` usan `"use client"` y la firma `{ error, unstable_retry }`. Leer `node_modules/next/dist/docs/` antes de crear páginas de error.

### Multiempresa

- Toda tabla de negocio nueva lleva `empresa_id UUID NOT NULL REFERENCES empresas(id)`.
- Toda query filtra por `empresa_id` usando el header `X-Empresa-Id` de la sesión activa.
- Antes de tocar cualquier schema, leer `MODELO_DATOS.md`.
- Toda nueva sección registra su identificador de sección (string estable) para la futura capa de permisos.

### Seguridad

- CORS configurado con lista blanca desde `settings.allowed_origins_list`. Nunca `allow_origins=["*"]`.
- Rate limiting con `slowapi` — ver `utils/rate_limiter.py`.
- Validar MIME type y tamaño máximo en todo endpoint que reciba archivos — usar `utils/files.py`.
- RLS habilitado en todas las tablas nuevas. Sin excepción.
- Los mensajes de error de auth son siempre genéricos.

---

## Reglas para Claude Code (OBLIGATORIAS)

1. **Leer este archivo completo antes de escribir cualquier código.**
2. **No modificar archivos fuera del scope de la tarea.**
3. **Si un archivo va a superar su límite de líneas, proponer cómo dividirlo ANTES de escribir.**
4. **Nunca usar `print()` ni `console.log()`. Usar el logger centralizado.**
5. **Ante dos enfoques válidos, elegir el más seguro, escalable y performante. Consultar solo si hay tradeoff real de funcionalidad.**
6. **Nunca duplicar lógica que ya existe en otro módulo. Revisar antes de crear.**
7. **Los schemas Pydantic van en `schemas/`, nunca inline.**
8. **Los IDs son siempre `UUID` tipado, nunca `str`.**
9. **Toda tabla nueva lleva `empresa_id`. Toda query filtra por empresa activa.**
10. **Siempre incluir docstring en funciones de `services/` e `integrations/`.**
11. **No crear la capa `controllers/` — no existe en la arquitectura real del proyecto.**
12. **Cada sesión implementa una sola tarea atómica. No mezclar features.**
13. **Verificar que el código nuevo no rompe módulos existentes antes de terminar.**
14. **Todo endpoint que reciba UploadFile debe llamar a validate_upload() de utils/files.py.**

---

## Estado del proyecto (junio 2026)

### Entrega 1 — Interna técnica ✅ COMPLETA

Todas las tareas verificadas con diagnóstico de Claude Code. Cero bloqueantes.

| Tarea | Descripción | Estado |
|---|---|---|
| 01 | Fix cliente Supabase — proxy resiliente ante RemoteProtocolError | ✅ |
| 02 | Timeout Vercel 300s + cliente Anthropic singleton timeout 25s | ✅ |
| 03 | Importaciones CSV en batch (empleados + nómina) | ✅ |
| 04 | Validación MIME + tamaño en los 4 endpoints de upload | ✅ |
| 05 | Versionar retrofit multiempresa (migraciones 054 + 055) | ✅ |
| 06 | Completar .env.example con variables de Google OAuth y FRONTEND_URL | ✅ |
| 07 | Páginas de error personalizadas (error.tsx, not-found.tsx, global-error.tsx) | ✅ |
| 08 | RLS en 6 tablas sin cubrir (migración 056) | ✅ |
| 09 | Mismatch assessment_resultados empresa_id | ✅ Resuelto por T05 |
| 10 | Selector de empresa activa en Sidebar + badge empresa | ✅ |
| 11 | Onboarding: add_tarea hereda empresa_id del template | ✅ |
| 12 | Offboarding: dar_de_baja al iniciar proceso | ✅ |
| 13 | Sonner en todas las mutaciones silenciosas | ✅ |
| 14 | Paginación backend en vacaciones, ausencias y horas | ✅ |
| 15 | Skeletons en objetivos y tabs de evaluaciones | ✅ |

### Métricas del repo (post Entrega 1)

- **Migraciones SQL**: 57 (000–056)
- **Routers registrados**: 33
- **Services**: 38 archivos
- **Repositories**: 35 archivos (incluyendo empleado_import_repo.py y nomina_import_repo.py)
- **Rutas frontend**: 28 `page.tsx` en `app/(dashboard)/`

### Módulos por estado

**Completos (cadena verificada):**
Vacaciones · Ausencias · Evaluaciones de desempeño · Proyectos · Capacitaciones · Inventario · Objetivos · Empleados · Vacantes · Configuración · Procesos · Dashboard · Reportes con IA · Empresas/Selector

**Parciales (gaps conocidos — Entrega 3):**
- Assessment — UI deshabilitada por código (`assessment/page.tsx:73-75` redirige a `/dashboard`)
- Costos — mismatch `empresa_id` en migraciones históricas
- Sucesión — queries N+1 en `sucesion_repo` + mismatch `empresa_id`

**No implementados:**
- Asistencia — no existe ningún archivo relacionado. Requiere decisión de producto.

### Archivos fuera de límite de líneas

Deuda pre-existente documentada. Dividir antes de modificar:

| Archivo | Límite | Líneas |
|---|---|---|
| `services/reporte_export_service.py` | 150 | 332 |
| `services/reporte_generators.py` | 150 | 249 |
| `services/integracion_service.py` | 150 | 201 |
| `services/csv_service.py` | 150 | 171 |
| `services/reporte_anual.py` | 150 | 154 |
| `repositories/ev_instancias_repo.py` | 100 | 146 |
| `repositories/empleado_repo.py` | 100 | ~155 |
| `repositories/assessment_repo.py` | 100 | 130 |
| `repositories/costo_repo.py` | 100 | 135 |
| `repositories/ev_plantillas_repo.py` | 100 | 129 |
| `repositories/nomina_repo.py` | 100 | 107 |
| `repositories/proyectos_repo.py` | 100 | 104 |
| `repositories/ausencias_repo.py` | 100 | 101 |
| `routers/ausencias.py` | 80 | 82 |
| `routers/ev_plantillas.py` | 80 | 87 |
| `routers/empleados.py` | 80 | 81 |
| `frontend/.../empleados/page.tsx` | 150 | 295 |
| `frontend/.../empresas/page.tsx` | 150 | 194 |

---

## Plan de entregas

### Entrega 1 ✅ COMPLETA
Estabilidad técnica. Ver tabla arriba.

### Entrega 2 — RRHH mínimo viable (próxima)
Roles funcionales (admin_rrhh, gerencia lectura, mandos_medios) · Validación X-Empresa-Id · Audit log extendido + UI · Bloqueos por módulo · Legajo ampliado (campos nuevos + adjuntos) · Tracking de cambios · Import/Export en todos los módulos · Features: vacaciones historial desde ingreso, proyectos por equipo/área, objetivos import masivo.

**Estimación:** 111 hs · 22–28 sesiones Claude Code

### Entrega 3 — RRHH completo
Alertas configurables · Plantillas de mail + Resend · Filtros completos por área y proyecto · Subobjetivos · Estadísticas evaluaciones · Offboarding estructurado + estadísticas IA · Organigrama como cards de proyectos · Assessment/Costos/Sucesión · AWS (Dockerfile + CI/CD + ECS).

**Estimación:** 124 hs · 25–31 sesiones Claude Code

---

## Deuda técnica activa

- `services/integracion_service.py:19` — `os.environ.setdefault()` directo dentro de guard `if settings.app_env == "development"`. Viola convención. Baja prioridad.
- `controllers/` — carpeta vacía. No crear controllers.
- `assessment/page.tsx:73-75` — UI deshabilitada por código (redirect a /dashboard). **[Entrega 3]**
- `services/assessment_service.py:130` — `save_resultado` puede llamarse sin `empresa_id` siendo columna `NOT NULL`. **[Entrega 3 — al reactivar Assessment]**
- `exportVacacionesCSV` / `exportAusenciasCSV` — exportan array en memoria (solo la página actual con paginación). Necesitan endpoint propio para exportar todo. **[Entrega 2]**
- `handleDeleteTarea` en `onboarding/templates/[id]/page.tsx` — usa `alert()` en lugar de Sonner. **[Entrega 2]**
- 18 archivos fuera de límite de líneas — ver tabla arriba. Dividir antes de modificar.

---

## Roles y modelo de acceso (estado actual)

El enum `public.users.rol` (`admin_rrhh` / `management` / `empleado`) existe en DB pero **hoy no diferencia funcionalidad**: no hay checks de rol en el backend. Todo el equipo de RRHH tiene acceso completo.

La capa de permisos real se construye en la **Entrega 2**: roles funcionales, tabla `acceso_empresa`, validación de `X-Empresa-Id` contra el acceso del usuario.

**Hasta completar la Entrega 2:** no agregar checks de rol en código nuevo.
**A partir de la Entrega 2:** seguir el modelo de roles que se implementa en esa entrega.

El empleado nunca es usuario del sistema. Donde necesita aportar datos, lo hace por link público con token, sin login.