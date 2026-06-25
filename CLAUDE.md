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
- **Tests frontend**: vitest (`npm run test`) — runner agregado en 16.6a; dev-only, no afecta `next build`.

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
│   │   ├── files.py           ← validate_upload (MIME + tamaño)
│   │   └── permisos.py        ← núcleo de permisos: enum Seccion/Accion, puede(), require_permission()
│   ├── migrations/            ← 58 archivos SQL numerados (000–057)
│   └── tests/
└── frontend/
    ├── app/
    │   ├── (auth)/            ← login, cambio de contraseña
    │   ├── (dashboard)/       ← 28 rutas protegidas (todos los módulos), envueltas por AuthGuard
    │   ├── assessment/[token] ← evaluación pública sin login
    │   ├── error.tsx          ← error boundary (Next.js 16, "use client", unstable_retry)
    │   ├── not-found.tsx      ← página 404
    │   └── global-error.tsx   ← error boundary global con html/body propio
    ├── components/
    │   ├── ui/                ← genéricos: Button, Input, Table, Modal, Skeleton
    │   ├── auth/              ← Can.tsx (wrapper de permiso para ocultar acciones)
    │   ├── layout/            ← Sidebar (con EmpresaSelector), UserMenu, PageHeader, ThemeProvider, AuthGuard
    │   └── features/          ← componentes específicos por módulo
    ├── hooks/                 ← incluye useCanWrite.ts
    ├── services/              ← llamadas a la API + empresaStore.ts + permisos.ts (espejo de backend)
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
- **Permisos**: todo endpoint gateable lleva `dependencies=[Depends(require_permission(SECCION, Accion.READ|WRITE))]` (ver sección "Roles y modelo de acceso"). Acción según verbo HTTP: GET=READ, POST/PUT/PATCH/DELETE=WRITE. Cada router declara `SECCION = Seccion.X`.

### Frontend (TypeScript)

- Nunca usar `any`. TypeScript estricto en todo el proyecto.
- **Naming**: componentes `PascalCase` · hooks con prefijo `use` · constantes `UPPER_SNAKE_CASE`.
- **Estados obligatorios**: todo componente que carga datos implementa skeleton (cargando), EmptyState (vacío), ErrorState (error) y vista con datos.
- **Feedback de acciones**: usar Sonner (`toast.success`, `toast.error`) después de cada mutación. Nunca `catch {}` vacío ni silencioso.
- **Formularios**: label siempre visible, validación en tiempo real, errores específicos y accionables.
- **Touch targets**: mínimo 44×44px en mobile.
- **Mobile-first**: estilos base para mobile, `md:` y `lg:` para pantallas más grandes.
- **Next.js 16**: las páginas `error.tsx` y `global-error.tsx` usan `"use client"` y la firma `{ error, unstable_retry }`. `useRouter`/`usePathname` se importan de `next/navigation`, solo en client components. Leer `node_modules/next/dist/docs/` antes de crear páginas de error o tocar el guard.
- **Permisos en UI**: `services/permisos.ts` es el espejo de `backend/utils/permisos.py` (fuente canónica = backend). Para ocultar acciones por rol, usar el hook `useCanWrite(seccion?)` en páginas (deriva la sección de la ruta) o el wrapper `<Can seccion accion>` / prop `canWrite` en componentes hijos. Estrategia: OCULTAR (no renderizar) entry points de escritura, NO deshabilitar. El control de seguridad real lo hace el backend (403); esto es solo UX. Mantener `permisos.ts` sincronizado con el backend.

### Multiempresa

- Toda tabla de negocio nueva lleva `empresa_id UUID NOT NULL REFERENCES empresas(id)`.
- Toda query filtra por `empresa_id` usando el header `X-Empresa-Id` de la sesión activa.
- Antes de tocar cualquier schema, leer `MODELO_DATOS.md`.
- Toda nueva sección registra su identificador como `SECCION = Seccion.X` (enum en `utils/permisos.py`).
- **Todo usuario accede a TODAS las empresas** (decisión de producto — ver "Roles y modelo de acceso"). No hay restricción de empresa por usuario.

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
15. **Todo endpoint gateable lleva require_permission con su SECCION y la acción según verbo HTTP. Los endpoints públicos (PUBLIC_ROUTES, assessment por token) NO se gatean.**
16. **No es un diagnóstico salvo que se pida explícitamente. Si el prompt dice "implementar", escribir código — no devolver un reporte read-only.**

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

### Entrega 2 — RRHH mínimo viable (en curso)

| Tarea | Descripción | Estado |
|---|---|---|
| 16 | Sistema de roles funcionales (admin_rrhh / gerencia_lectura / mandos_medios) | ✅ COMPLETA |
| 17 | Validación X-Empresa-Id contra acceso real del usuario | ❌ NO APLICA (ver abajo) |
| 18 | Audit log extendido + UI | ⬜ próxima |
| 19 | Bloqueos por módulo | ⬜ |
| 20 | Legajo ampliado (campos nuevos + adjuntos) | ⬜ |
| 21 | Tracking de cambios | ⬜ |
| 22 | Import/Export en todos los módulos | ⬜ |
| 23 | Feature: vacaciones historial desde ingreso | ⬜ |
| 24 | Feature: proyectos por equipo/área | ⬜ |
| 25 | Feature: objetivos import masivo | ⬜ |

**T16 — desglose de sub-sesiones (todas completas):**

- **16.1** — Migración 057: CHECK de `users.rol` a los 3 roles funcionales + recreación de las 27 policies RLS que referenciaban `'management'`. Sin backfill (único usuario = admin_rrhh).
- **16.2** — `utils/permisos.py`: enum `Seccion` (24) + `Accion`, `puede(rol, seccion, accion)` puro fail-closed, dependency `require_permission`. Tests unitarios puros.
- **16.3** — Declarar `SECCION = Seccion.X` en los 24 routers primarios.
- **16.4a** — Dividir routers sobre límite: `ev_plantillas` split → `ev_criterios.py`; `empleados` y `ausencias` compactados. Los 4 quedan ≤80.
- **16.4b** — `require_permission` aplicado a los 142 endpoints gateables (inline por-endpoint) + `SECCION` en 8 sub-routers. 3 endpoints públicos exentos. Tests del 403.
- **16.5** — Frontend: `UserRol`/`ROL_LABEL` a valores nuevos · `services/permisos.ts` (espejo) · Sidebar filtrado · `UserMenu` real + logout · `AuthGuard` montado y extendido con guard por ruta (redirige a la primera sección permitida del rol).
- **16.6** — Ocultar botones de escritura por rol. Infra: `hooks/useCanWrite.ts` + `components/auth/Can.tsx` + tests (vitest). Cableados los entry points de escritura en todos los módulos (16.6a grupo CRUD; 16.6b acciones de estado + vacaciones/ausencias + barrido). Estrategia: ocultar entry points; submit de modales no tocados; modal de evaluación queda read-only con campos disabled (vista de consulta). `gerencia_lectura` no ve botones de escritura en ningún módulo; `mandos_medios` ve los de vacaciones/ausencias.

### T17 — NO APLICA (decisión de producto, jun 2026)

T17 era validar `X-Empresa-Id` contra el acceso real del usuario (restringir qué empresas ve cada uno). **No se implementa.** Decisión de producto: **todo usuario del sistema, sin importar el rol, accede a TODAS las empresas de la instancia.** Puede ver el consolidado (`empresa_id=None`, todas juntas) o seleccionar una empresa puntual vía `X-Empresa-Id`. No existe la noción de "usuario limitado a ciertas empresas", por lo tanto no hay nada que validar: no se crea la tabla `acceso_empresa` ni una dependency de empresa. El comportamiento actual es el correcto y definitivo. **NO reabrir.** (`acceso_seccion` del doc §8 quedó cubierto por el modelo de roles de T16.)

### Métricas del repo (post T16/16.6)

- **Migraciones SQL**: 58 (000–057)
- **Routers registrados**: 33 (24 primarios + 9 sub-routers, incluyendo `ev_criterios`)
- **Endpoints con permiso aplicado**: 142 gateados · 3 públicos exentos · auth sin gate
- **Services**: 38 archivos
- **Repositories**: 35 archivos
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

---

## Deuda técnica activa

### Archivos fuera de límite de líneas

Deuda de mantenibilidad/legibilidad (no de funcionamiento). Dividir antes de modificar a fondo. **Candidata a tarea de refactor propia** — atacar por peores primero, con diagnóstico→implementación archivo por archivo (NO en masa). Conteo real relevado en 16.6 (la lista previa subreportaba):

**Frontend (límite componente/página 150):**

| Archivo | Líneas |
|---|---|
| `frontend/.../sucesion/page.tsx` | 861 |
| `frontend/.../costos/page.tsx` | 608 |
| `frontend/.../vacantes/[id]/page.tsx` | 573 |
| `frontend/.../reportes/page.tsx` | 531 |
| `frontend/.../onboarding/page.tsx` | 405 |
| `frontend/.../onboarding/templates/[id]/page.tsx` | 393 |
| `frontend/.../configuracion/page.tsx` | 374 |
| `frontend/.../empleados/page.tsx` | 295 |
| `frontend/.../empleados/[id]/page.tsx` | 289 |
| `frontend/.../vacaciones/page.tsx` | 282 |
| `frontend/components/layout/Sidebar.tsx` | 277 |
| `frontend/.../ausencias/page.tsx` | 277 |
| `frontend/.../offboarding/page.tsx` | 268 |
| `frontend/.../areas/page.tsx` | 253 |
| `frontend/.../empresas/[id]/page.tsx` | 224 |
| `frontend/.../vacantes/page.tsx` | 213 |
| `frontend/.../empresas/page.tsx` | 194 |
| `frontend/.../objetivos/page.tsx` | 167 |

> `Sidebar.tsx` (277): dividir extrayendo `EmpresaSelector`, `NavItem`, `ThemeToggle` a archivos propios.

**Backend (límite service 150 / repo 100):**

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

> `routers/ausencias.py`, `ev_plantillas.py`, `empleados.py` salieron de la lista en 16.4a (divididos/compactados, ≤80).

### Build frontend rojo por errores TS pre-existentes

`next build` compila pero el type-check falla por 21 errores en 7 archivos **pre-existentes, ajenos a T16/16.6**: `assessment/[id]/page.tsx:113` ('resultado' possibly null), `organigrama` (×4), `EmpleadoModal`, `ProyectoModal`. Resolver antes de cualquier deploy. No bloquea desarrollo local.

### Otras

- `services/integracion_service.py:19` — `os.environ.setdefault()` directo dentro de guard `if settings.app_env == "development"`. Viola convención. Baja prioridad.
- `controllers/` — carpeta vacía. No crear controllers.
- `assessment/page.tsx:73-75` — UI deshabilitada por código (redirect a /dashboard). **[Entrega 3]**
- `services/assessment_service.py:130` — `save_resultado` puede llamarse sin `empresa_id` siendo columna `NOT NULL`. **[Entrega 3 — al reactivar Assessment]**
- `exportVacacionesCSV` / `exportAusenciasCSV` — exportan array en memoria (solo la página actual). Necesitan endpoint propio para exportar todo. **[Entrega 2]**
- `handleDeleteTarea` en `onboarding/templates/[id]/page.tsx` — usa `alert()` en lugar de Sonner. **[Entrega 2]**
- `migrations/000_run_all.sql` — agregado bootstrap que todavía contiene literales `'management'`. Re-bootstrapear desde cero reintroduce el valor viejo y choca con el CHECK de 057. Corregir si se regenera el agregado. **[T16]**
- `frontend/services/permisos.ts` es espejo manual de `backend/utils/permisos.py` — riesgo de divergencia. Solución durable: `GET /api/auth/me` que devuelva rol + permisos calculados por backend. **[Entrega 3]**
- `middleware/auth.py:86-94` — `X-Empresa-Id` acepta cualquier UUID bien formado sin verificar que exista en la tabla `empresas` (UUID inexistente → cae silenciosamente a consolidado). Higiene de input, NO seguridad (todo usuario accede a toda empresa — ver T17 NO APLICA). Validar contra `empresas` y rechazar con 400 si no existe. Baja prioridad.

---

## Plan de entregas

### Entrega 1 ✅ COMPLETA
Estabilidad técnica.

### Entrega 2 — RRHH mínimo viable (en curso)
Roles funcionales (T16 ✅) · X-Empresa-Id (T17 ❌ no aplica) · Audit log extendido + UI (T18 próxima) · Bloqueos por módulo · Legajo ampliado · Tracking de cambios · Import/Export en todos los módulos · Features: vacaciones historial desde ingreso, proyectos por equipo/área, objetivos import masivo.

**Estimación:** 111 hs · 22–28 sesiones Claude Code

### Entrega 3 — RRHH completo
Alertas configurables · Plantillas de mail + Resend · Filtros completos por área y proyecto · Subobjetivos · Estadísticas evaluaciones · Offboarding estructurado + estadísticas IA · Organigrama como cards de proyectos · Assessment/Costos/Sucesión · AWS (Dockerfile + CI/CD + ECS).

**Estimación:** 124 hs · 25–31 sesiones Claude Code

---

## Roles y modelo de acceso (modelo funcional vigente — T16)

A partir de T16 (Entrega 2), el control de acceso por rol está implementado y activo.

### Roles funcionales

`public.users.rol` es `VARCHAR(20)` con CHECK `IN ('admin_rrhh', 'gerencia_lectura', 'mandos_medios')` (migración 057).

| Rol | Capacidad |
|---|---|
| `admin_rrhh` | Acceso total: lectura + escritura en todas las secciones. |
| `gerencia_lectura` | Lectura en todas las secciones. Sin escritura (write → 403). |
| `mandos_medios` | Lectura + escritura SOLO en `vacaciones` y `ausencias`. El resto: sin acceso. |

Rol desconocido / ausente → sin acceso (fail-closed).

### Acceso a empresas

**Todo usuario, sin importar el rol, accede a TODAS las empresas** (decisión de producto). Puede operar sobre el consolidado (todas) o sobre una empresa puntual vía `X-Empresa-Id`. No hay restricción de empresa por usuario (ver "T17 NO APLICA"). El eje de control de acceso es solo el rol (capacidad R/W por sección), no la empresa.

### Cómo se enforcea

- **Núcleo**: `utils/permisos.py` — enum `Seccion` (24), `Accion` (READ/WRITE), `puede(rol, seccion, accion) -> bool` (pura, fail-closed), `require_permission(seccion, accion)` (dependency factory). Cambiar el modelo = cambiar este archivo.
- **Aplicación backend**: cada endpoint gateable lleva `dependencies=[Depends(require_permission(SECCION, Accion.X))]`. Acción según verbo HTTP. Cada router declara `SECCION = Seccion.X`.
- **Orden de control**: `AuthMiddleware` corta primero (sin token → 401). `require_permission` actúa con token válido + rol, devuelve 403 `FORBIDDEN` si no alcanza.
- **Exentos**: públicos (`PUBLIC_ROUTES`, assessment por token) no se gatean. `auth.py` sin sección.
- **RLS**: las policies por rol existen pero están dormidas para el tráfico de la API (backend usa `service_key`, bypasea RLS). El enforcement efectivo lo hace `require_permission`. La migración 057 mantiene las policies consistentes por higiene de schema.

### Frontend

- `services/permisos.ts` espeja `utils/permisos.py`. Filtra navegación (Sidebar) y rutas (`AuthGuard`) por rol — UX, no seguridad.
- Botones de escritura: ocultos por rol vía `useCanWrite()` / `<Can>` (16.6). El control real es el 403 del backend.
- El rol viaja en la sesión (`LoginResponse.user.rol`, persistida en `localStorage`).
- `AuthGuard`: sin sesión → `/login`; ruta sin permiso de lectura → primera sección que el rol puede ver.

El empleado nunca es usuario del sistema. Donde necesita aportar datos, lo hace por link público con token, sin login.