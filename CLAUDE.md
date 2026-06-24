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
    │   ├── layout/            ← Sidebar (con EmpresaSelector), UserMenu, PageHeader, ThemeProvider, AuthGuard
    │   └── features/          ← componentes específicos por módulo
    ├── hooks/
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
- **Permisos en UI**: `services/permisos.ts` es el espejo de `backend/utils/permisos.py` (fuente canónica = backend). El frontend filtra navegación y rutas por rol como UX; el control de seguridad real lo hace el backend (403). Mantener ambos archivos sincronizados.

### Multiempresa

- Toda tabla de negocio nueva lleva `empresa_id UUID NOT NULL REFERENCES empresas(id)`.
- Toda query filtra por `empresa_id` usando el header `X-Empresa-Id` de la sesión activa.
- Antes de tocar cualquier schema, leer `MODELO_DATOS.md`.
- Toda nueva sección registra su identificador como `SECCION = Seccion.X` (enum en `utils/permisos.py`).

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

**T16 — desglose de sub-sesiones (todas completas):**

- **16.1** — Migración 057: CHECK de `users.rol` a los 3 roles funcionales + recreación de las 27 policies RLS que referenciaban `'management'` (21 lectura → `gerencia_lectura`, 1 write drop limpio, 5 write recreadas admin-only, 1 fix de `USING`→`WITH CHECK` en reportes). Sin backfill (único usuario = admin_rrhh).
- **16.2** — `utils/permisos.py`: enum `Seccion` (24) + `Accion`, `puede(rol, seccion, accion)` puro fail-closed, dependency factory `require_permission`. Tests unitarios puros.
- **16.3** — Declarar `SECCION = Seccion.X` en los 24 routers primarios (7 convertidos de string, 17 nuevos).
- **16.4a** — Dividir routers sobre límite: `ev_plantillas` split → `ev_criterios.py` (nuevo); `empleados` y `ausencias` compactados. Los 4 quedan ≤80.
- **16.4b** — `require_permission` aplicado a los 142 endpoints gateables (inline por-endpoint, uniforme) + `SECCION` en 8 sub-routers. 3 endpoints públicos exentos. Tests del 403.
- **16.5** — Frontend: `UserRol` y `ROL_LABEL` a los valores nuevos · `services/permisos.ts` (espejo) · Sidebar filtrado por permiso · `UserMenu` con usuario real + logout cableado · `AuthGuard` montado y extendido con chequeo de permiso por ruta (redirige a la primera sección permitida del rol).

**Pendientes de Entrega 2 (sub-descomposición en su diagnóstico):**
- **16.6** — Ocultar/deshabilitar botones de escritura por módulo para `gerencia_lectura` (UX, no seguridad — el backend ya devuelve 403). Volumen medio (~12 módulos, ~20-30 botones).
- T17 — Validación de `X-Empresa-Id` contra el acceso real del usuario (mismo eje de control de acceso que T16; converge en `permisos.py`).
- T18 — Audit log extendido + UI.
- T19 — Bloqueos por módulo.
- T20 — Legajo ampliado (campos nuevos + adjuntos).
- T21 — Tracking de cambios.
- T22 — Import/Export en todos los módulos.
- T23/24/25 — Features: vacaciones historial desde ingreso · proyectos por equipo/área · objetivos import masivo.

**Estimación Entrega 2:** 111 hs · 22–28 sesiones Claude Code

### Métricas del repo (post T16)

- **Migraciones SQL**: 58 (000–057)
- **Routers registrados**: 33 (24 primarios + 9 sub-routers, incluyendo `ev_criterios`)
- **Endpoints con permiso aplicado**: 142 gateados · 3 públicos exentos · auth sin gate
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
| `frontend/components/layout/Sidebar.tsx` | 150 | 277 |
| `frontend/.../empleados/page.tsx` | 150 | 295 |
| `frontend/.../empresas/page.tsx` | 150 | 194 |

> Nota: `routers/ausencias.py`, `routers/ev_plantillas.py` y `routers/empleados.py` salieron de esta lista en 16.4a (divididos/compactados, ahora ≤80).

---

## Plan de entregas

### Entrega 1 ✅ COMPLETA
Estabilidad técnica. Ver tabla arriba.

### Entrega 2 — RRHH mínimo viable (en curso)
Roles funcionales (T16 ✅) · Validación X-Empresa-Id · Audit log extendido + UI · Bloqueos por módulo · Legajo ampliado (campos nuevos + adjuntos) · Tracking de cambios · Import/Export en todos los módulos · Features: vacaciones historial desde ingreso, proyectos por equipo/área, objetivos import masivo.

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
- `migrations/000_run_all.sql` — agregado bootstrap que todavía contiene literales `'management'`. Re-bootstrapear desde cero reintroduce el valor viejo y choca con el CHECK de 057. Corregir si se regenera el agregado. **[deuda nueva — T16]**
- `frontend/services/permisos.ts` es un espejo manual de `backend/utils/permisos.py` — riesgo de divergencia. La solución durable es un `GET /api/auth/me` que devuelva rol + permisos calculados por el backend (fuente única). **[Entrega 3]**
- `frontend/components/layout/Sidebar.tsx` — 277 líneas (límite 150). Requiere extraer `EmpresaSelector`, `NavItem` y `ThemeToggle` a archivos propios. Refactor estructural propio. **[deuda nueva — T16]**
- 16 archivos fuera de límite de líneas — ver tabla arriba. Dividir antes de modificar.

---

## Roles y modelo de acceso (modelo funcional vigente — T16)

A partir de T16 (Entrega 2), el control de acceso por rol está implementado y activo.

### Roles funcionales

`public.users.rol` es `VARCHAR(20)` con CHECK `IN ('admin_rrhh', 'gerencia_lectura', 'mandos_medios')` (migración 057).

| Rol | Capacidad |
|---|---|
| `admin_rrhh` | Acceso total: lectura + escritura en todas las secciones. |
| `gerencia_lectura` | Lectura en todas las secciones. Sin escritura (write → 403). |
| `mandos_medios` | Lectura + escritura SOLO en `vacaciones` y `ausencias`. El resto de secciones: sin acceso. |

Rol desconocido / ausente → sin acceso (fail-closed).

### Cómo se enforcea

- **Núcleo**: `utils/permisos.py` — enum `Seccion` (24 valores), enum `Accion` (READ/WRITE), `puede(rol, seccion, accion) -> bool` (función pura, fail-closed, 3 ramas por rol), y `require_permission(seccion, accion)` (dependency factory de FastAPI). Cambiar el modelo de permisos = cambiar este archivo.
- **Aplicación**: cada endpoint gateable lleva `dependencies=[Depends(require_permission(SECCION, Accion.X))]`. La acción se deriva del verbo HTTP (GET=READ; POST/PUT/PATCH/DELETE=WRITE). Cada router declara `SECCION = Seccion.X`; los sub-routers declaran la sección de su dominio padre.
- **Orden de control**: el `AuthMiddleware` corta primero (sin token → 401 antes de la dependency). `require_permission` solo actúa con token válido + rol seteado, devolviendo 403 `FORBIDDEN` si el rol no alcanza.
- **Endpoints exentos**: los públicos (`PUBLIC_ROUTES` y assessment por token) NO se gatean. `auth.py` (login/refresh/logout) no tiene sección.
- **RLS**: las policies por rol en Supabase existen pero están dormidas para el tráfico de la API (el backend usa `service_key`, que bypasea RLS). El enforcement efectivo lo hace `require_permission`, no RLS. La migración 057 mantiene las policies consistentes con los roles nuevos por higiene de schema.

### Frontend

- `services/permisos.ts` es el espejo de `utils/permisos.py`. Filtra la navegación del Sidebar y las rutas (vía `AuthGuard`) según el rol — es mejora de UX, NO el control de seguridad (que vive en el backend).
- El rol viaja en la sesión (`LoginResponse.user.rol`, persistida en `localStorage`).
- `AuthGuard` redirige a `/login` si no hay sesión, y a la primera sección que el rol puede leer si intenta entrar a una ruta sin permiso.

### Eje ortogonal pendiente

El rol gobierna *capacidad por sección* (R/W). El *alcance por empresa* (qué empresas ve el usuario, vía `X-Empresa-Id` validado contra acceso real) es un eje ortogonal que se implementa en T17 y converge en el mismo punto de decisión de `permisos.py`. El filtrado *por empleado a cargo* (mandos_medios viendo solo su equipo) es row-level y depende de la importación de nómina — tarea posterior.

El empleado nunca es usuario del sistema. Donde necesita aportar datos, lo hace por link público con token, sin login.