# CLAUDE.md — Sofia (HR Karstec)

> **Ubicación:** raíz del repo (`RRHH/`), junto a `.claude/`.
> Claude Code lo lee al inicio de cada sesión. No moverlo a subdirectorios.

---

## Documentos de referencia (leer cuando aplique)

- `Sofia/docs/MODELO_DATOS.md` — fuente de verdad del schema. Si algo contradice una tabla, manda este doc.
- `Sofia/docs/BASES-DE-DESARROLLO.md` — convenciones de arquitectura, errores, logging, testing.
- `Sofia/docs/ORDEN-Y-LEGIBILIDAD.md` — límites de archivo, naming, estructura de carpetas.
- `Sofia/docs/SEGURIDAD-PENTEST.md` — autenticación, validación, rate limiting, secrets.
- `Sofia/docs/UX-UI.md` — componentes, responsive, accesibilidad, design system.

---

## Qué es este proyecto

Sofia es el repositorio del producto **HR Karstec**: plataforma multiempresa de gestión del ciclo de vida del empleado. Un equipo de RRHH (3 personas) administra entre 2 y 5 empresas desde la misma instancia, con datos aislados por `empresa_id` y vistas consolidadas.

Módulos: empleados, organigrama, onboarding/offboarding, vacantes, costos, sucesión, assessment, vacaciones, ausencias, capacitaciones, evaluaciones de desempeño, inventario, objetivos, proyectos, reportes con IA, configuración y procesos.

---

## Stack

- **Frontend**: Next.js 15 (App Router) · TypeScript estricto · Tailwind CSS · Shadcn/ui — Vercel
- **Backend**: Python 3.11 · FastAPI · arquitectura por capas — Vercel (serverless), migración a AWS planificada
- **Base de datos**: Supabase (PostgreSQL) · RLS activo en la mayoría de tablas
- **Auth**: Supabase Auth · JWT · refresh token con rotación (delegado a Supabase Auth)
- **Storage**: Supabase Storage — buckets: `documentos`, `cvs`, `avatars`, `reportes`
- **IA**: Anthropic Claude Sonnet · tool use tipado
- **Email**: Resend — instalado en requirements.txt, pendiente de conectar
- **Exportaciones**: openpyxl (export), reportlab (PDF)

---

## Estructura de carpetas

```
RRHH/                          ← raíz del repo
├── CLAUDE.md                  ← este archivo
├── .claude/
└── Sofia/
    ├── backend/
    │   ├── main.py            ← punto de entrada, registra los 33 routers
    │   ├── config/
    │   │   └── settings.py    ← única fuente de variables de entorno
    │   ├── routers/           ← endpoints HTTP (max 80 líneas)
    │   ├── controllers/       ← VACÍO — capa no implementada, no usar
    │   ├── services/          ← lógica de negocio (max 150 líneas)
    │   ├── repositories/      ← acceso a DB via Supabase ORM (max 100 líneas)
    │   ├── integrations/      ← supabase_client.py, anthropic_client.py
    │   ├── schemas/           ← modelos Pydantic
    │   ├── middleware/        ← auth.py, error_handler.py, security_headers.py
    │   ├── utils/
    │   │   ├── errors.py      ← AppError centralizado
    │   │   └── logger.py      ← logger JSON estructurado
    │   ├── migrations/        ← 54 archivos SQL numerados (000–053)
    │   └── tests/
    └── frontend/
        ├── app/
        │   ├── (auth)/        ← login, cambio de contraseña
        │   ├── (dashboard)/   ← 28 rutas protegidas (todos los módulos)
        │   └── assessment/[token] ← evaluación pública sin login
        ├── components/
        │   ├── ui/            ← genéricos: Button, Input, Table, Modal
        │   ├── layout/        ← Sidebar, PageHeader, ThemeProvider
        │   └── features/      ← componentes específicos por módulo
        ├── hooks/
        ├── services/          ← llamadas a la API + empresaStore.ts
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
- **Errores**: siempre `AppError(message, code, status_code)` desde `utils/errors.py`. Nunca devolver formatos distintos.
- **Logs**: solo eventos de negocio importantes. Nunca `print()`. Usar `logger` de `utils/logger.py`.
- **Config**: nunca `os.environ` directamente. Solo `from config.settings import settings`.
- **Docstrings**: obligatorios en todos los métodos de `services/` e `integrations/`.
- **Naming**: `snake_case` funciones/variables · `PascalCase` clases · `UPPER_SNAKE_CASE` constantes.
- **Límites**: router 80 líneas · service 150 · repository 100. Si se supera, proponer división antes de escribir.
- **Schemas Pydantic**: patrón `Base → Create → Update → Response`. Siempre en `schemas/`, nunca inline.
- **IDs**: siempre `UUID` tipado en path params, nunca `str`.
- **DB**: siempre vía ORM de Supabase (`.eq()`, `.select()`, `.insert()`). Nunca concatenar strings en queries.
- **Secrets**: nunca hardcodeados. Solo vía `settings`.

### Frontend (TypeScript)

- Nunca usar `any`. TypeScript estricto en todo el proyecto.
- **Naming**: componentes `PascalCase` · hooks con prefijo `use` · constantes `UPPER_SNAKE_CASE`.
- **Estados obligatorios**: todo componente que carga datos implementa skeleton (cargando), EmptyState (vacío), ErrorState (error) y vista con datos.
- **Feedback de acciones**: usar Sonner (`toast.success`, `toast.error`) después de cada mutación. No dejar acciones que fallen silenciosamente.
- **Formularios**: label siempre visible, validación en tiempo real, errores específicos y accionables.
- **Touch targets**: mínimo 44×44px en mobile.
- **Mobile-first**: estilos base para mobile, `md:` y `lg:` para pantallas más grandes.

### Multiempresa

- Toda tabla de negocio nueva lleva `empresa_id UUID NOT NULL REFERENCES empresas(id)`.
- Toda query filtra por `empresa_id` usando el header `X-Empresa-Id` de la sesión activa.
- Antes de tocar cualquier schema, leer `MODELO_DATOS.md`.
- Toda nueva sección registra su identificador de sección (string estable) para la futura capa de permisos.

### Seguridad

- CORS configurado con lista blanca desde `settings.allowed_origins_list`. Nunca `allow_origins=["*"]`.
- Rate limiting con `slowapi` en endpoints sensibles.
- Validar MIME type y tamaño máximo en todo endpoint que reciba archivos.
- RLS habilitado en todas las tablas nuevas. Sin excepción.
- Los mensajes de error de auth son siempre genéricos — no revelar si el usuario existe o el motivo del rechazo.

---

## Reglas para Claude Code (OBLIGATORIAS)

1. **Leer este archivo completo antes de escribir cualquier código.**
2. **No modificar archivos fuera del scope de la tarea.** Si la tarea es el router de empleados, no tocar settings.py ni el frontend.
3. **Si un archivo va a superar su límite de líneas, proponer cómo dividirlo ANTES de escribir.**
4. **Nunca usar `print()` ni `console.log()`. Usar el logger centralizado.**
5. **Ante dos enfoques válidos, preguntar antes de implementar.**
6. **Nunca duplicar lógica que ya existe en otro módulo. Revisar antes de crear.**
7. **Los schemas Pydantic van en `schemas/`, nunca inline.**
8. **Los IDs son siempre `UUID` tipado, nunca `str`.**
9. **Toda tabla nueva lleva `empresa_id`. Toda query filtra por empresa activa.**
10. **Siempre incluir docstring en funciones de `services/` e `integrations/`.**
11. **No crear la capa `controllers/` — no existe en la arquitectura real del proyecto.**
12. **Cada sesión implementa una sola tarea atómica. No mezclar features.**
13. **Verificar que el código nuevo no rompe módulos existentes antes de terminar.**

---

## Estado del proyecto (junio 2026)

### Métricas del repo
- **Migraciones SQL**: 54 (000–053)
- **Routers registrados**: 33 (todos montados en main.py, sin huérfanos)
- **Services**: 38 archivos
- **Repositories**: 33 archivos (32 `*_repo.py` + 1 helper `_vacaciones_utils.py`)
- **Rutas frontend**: 28 `page.tsx` en `app/(dashboard)/`

### Módulos por estado

**Completos (cadena verificada):**
Vacaciones · Ausencias · Evaluaciones de desempeño · Proyectos · Capacitaciones · Inventario · Objetivos · Empleados · Vacantes · Configuración · Procesos · Dashboard (datos reales, sin mocks) · Reportes con IA (end-to-end funcional)

**Parciales (gaps conocidos):**
- Empresas/Selector — backend completo, selector visual en topbar no implementado (TODO en `services/empresaStore.ts:5`)
- Onboarding — cadena completa pero migraciones no tienen `empresa_id` y el código sí filtra por esa columna
- Offboarding — ídem + `empleado.estado` no pasa a `baja` al iniciar el proceso
- Costos — ídem mismatch `empresa_id` en migraciones
- Sucesión — ídem + queries N+1 en `sucesion_repo`

**Rotos:**
- Assessment — UI deshabilitada por código (`assessment/page.tsx:73-75` redirige a `/dashboard`). Backend completo. Mismatch `empresa_id` en migración 020.

**No implementados:**
- Asistencia — no existe ningún archivo relacionado en backend ni frontend

### Archivos fuera de límite de líneas
Los siguientes archivos superan sus límites y deben dividirse antes de modificarlos:

| Archivo | Límite | Líneas reales |
|---|---|---|
| `services/reporte_export_service.py` | 150 | 332 |
| `services/reporte_generators.py` | 150 | 249 |
| `services/integracion_service.py` | 150 | 201 |
| `services/csv_service.py` | 150 | 171 |
| `services/reporte_anual.py` | 150 | 154 |
| `repositories/ev_instancias_repo.py` | 100 | 146 |
| `repositories/ev_plantillas_repo.py` | 100 | 129 |
| `repositories/assessment_repo.py` | 100 | 130 |
| `repositories/costo_repo.py` | 100 | 135 |
| `repositories/empleado_repo.py` | 100 | 132 |
| `repositories/nomina_repo.py` | 100 | 107 |
| `repositories/proyectos_repo.py` | 100 | 104 |
| `routers/importacion.py` | 80 | 88 |
| `routers/ev_plantillas.py` | 80 | 87 |
| `routers/empleados.py` | 80 | 81 |
| `frontend/.../empleados/page.tsx` | 150 | 295 |

---

## Plan de entregas (contexto para priorización)

### Entrega 1 — Interna técnica (en curso)
Objetivo: estabilidad técnica antes de abrir a usuarios reales.
- Bloqueantes de producción: fix cliente Supabase, timeouts Vercel, batchear imports, validación uploads, versionar retrofit multiempresa, páginas de error, RLS faltante, mismatch assessment.
- Módulos parciales: selector de empresa, alinear migraciones de Onboarding/Offboarding/Costos, corregir estado baja en Offboarding.
- UX técnico: Sonner en todos los módulos, paginación en vacaciones/ausencias/horas, skeletons faltantes.

### Entrega 2 — RRHH mínimo viable
Roles funcionales · Audit log extendido · Bloqueos por módulo · Legajo ampliado · Adjuntos genéricos · Import/Export en todos los módulos · Features: vacaciones historial, proyectos por equipo, objetivos import.

### Entrega 3 — RRHH completo
Alertas · Plantillas de mail · Filtros completos · Subobjetivos · Estadísticas evaluaciones · Offboarding estructurado · Organigrama rediseñado · Assessment/Costos/Sucesión · AWS.

---

## Deuda técnica activa

- `supabase_client.py:23-24` — singleton sin manejo de `RemoteProtocolError`. Falla en Vercel serverless con conexiones warm. Fix ya implementado en Agent-Admin, pendiente de portar. **[Entrega 1 — tarea 01]**
- `vercel.json` — `maxDuration: 30` (30 segundos). Insuficiente para reportes IA e imports. **[Entrega 1 — tarea 02]**
- `migrations/` — el retrofit multiempresa (tabla `empresas` + `empresa_id` en ~12 tablas históricas) se hizo a mano en Supabase y nunca se versionó. `run_all.sql` no reproduce la DB real. **[Entrega 1 — tarea 05]**
- `assessment/page.tsx:73-75` — redirige a `/dashboard` con código inalcanzable debajo. UI deliberadamente deshabilitada. **[Entrega 3 — tarea 40]**
- `integracion_service.py:19` — `os.environ.setdefault()` directo dentro de guard `if settings.app_env == "development"`. Viola convención de usar solo `settings`. Baja prioridad.
- `controllers/` — carpeta vacía documentada en CLAUDE.md anterior como capa obligatoria. No existe en la arquitectura real. No crear controllers.
- `TODO` activo: `frontend/services/empresaStore.ts:5` — migrar a Zustand cuando se construya el selector visual de empresa en topbar. **[Entrega 1 — tarea 10]**

---

## Roles y modelo de acceso (estado actual)

El enum `public.users.rol` (`admin_rrhh` / `management` / `empleado`) existe en DB pero **hoy no diferencia funcionalidad**: no hay checks de rol en el backend. Todo el equipo de RRHH tiene acceso completo.

La capa de permisos real se construye en la Entrega 2: roles funcionales (`admin_rrhh` completo, `gerencia` solo lectura, `mandos_medios` vacaciones + ausencias de su área), tabla `acceso_empresa`, validación de `X-Empresa-Id` contra el acceso del usuario.

**Hasta completar la Entrega 2:** no agregar checks de rol en código nuevo. El sistema lo opera el equipo de RRHH completo.
**A partir de la Entrega 2:** seguir el modelo de roles que se implementa en esa entrega.

El empleado nunca es usuario del sistema. Donde necesita aportar datos, lo hace por link público con token, sin login.