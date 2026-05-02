# CLAUDE.md — Sofia (HR Karstec)

## Qué es este proyecto
Sofia es el repositorio interno del producto **HR Karstec**: una plataforma de gestión del ciclo de vida del empleado para una empresa de tecnología de 200+ colaboradores.
Cubre: gestión de empleados, organigrama, onboarding/offboarding, vacantes, costos, sucesión, planes de carrera, assessment conductual/cognitivo/técnico (Self AI replicado) y un motor de IA central con acceso total a la base de datos.

## Stack
- **Frontend**: Next.js 15 (App Router) · TypeScript estricto · Tailwind CSS · Shadcn/ui — deploy en Vercel
- **Backend**: Python 3.11 · FastAPI · arquitectura por capas — deploy en Vercel (serverless) o Railway
- **Base de datos**: Supabase (PostgreSQL) con Row Level Security (RLS) activo en todas las tablas
- **Auth**: Supabase Auth · JWT · refresh token con rotación obligatoria
- **Storage**: Supabase Storage — buckets: `documentos`, `cvs`, `avatars`, `reportes`
- **IA**: Anthropic Claude Sonnet · tool use tipado · 4 agentes especializados
- **Email**: Resend — links de assessment, notificaciones
- **Exportaciones**: xlsx · jspdf + jspdf-autotable · docx

## Estructura de carpetas

```
Sofia/
├── CLAUDE.md                  ← este archivo (leer siempre al inicio)
├── README.md
├── .env.example
├── .gitignore
├── frontend/                  ← Next.js App Router
│   ├── app/
│   │   ├── (auth)/            ← rutas públicas: login, cambio de contraseña
│   │   ├── (dashboard)/       ← rutas protegidas: todos los módulos
│   │   └── assessment/[token] ← evaluación pública para candidatos externos
│   ├── components/
│   │   ├── ui/                ← componentes genéricos: Button, Input, Table, Modal
│   │   ├── layout/            ← Sidebar, PageHeader, ThemeProvider
│   │   └── features/          ← componentes específicos por módulo
│   ├── hooks/                 ← custom hooks
│   ├── services/              ← llamadas a la API del backend
│   ├── store/                 ← estado global (Zustand)
│   ├── types/                 ← tipos TypeScript compartidos
│   ├── styles/
│   │   └── design-system.ts   ← tokens de diseño (fuente única de verdad)
│   └── utils/
└── backend/
    ├── main.py                ← punto de entrada FastAPI
    ├── config/
    │   └── settings.py        ← única fuente de variables de entorno
    ├── routers/               ← endpoints, sin lógica de negocio (max 80 líneas)
    ├── controllers/           ← orquestación (max 100 líneas)
    ├── services/              ← lógica de negocio (max 150 líneas)
    ├── repositories/          ← acceso a DB (max 100 líneas)
    ├── integrations/          ← Supabase, Anthropic, Resend
    ├── schemas/               ← validación Pydantic
    ├── middleware/            ← auth, errores, headers de seguridad
    ├── utils/
    │   ├── errors.py          ← clase AppError centralizada
    │   └── logger.py          ← logger JSON estructurado
    ├── migrations/            ← SQL numerado y versionado (001_, 002_, ...)
    └── tests/                 ← tests críticos de flujos de negocio
```

## Convenciones de código

### Backend (Python)
- Seguir `docs/RRHH/ORDEN-Y-LEGIBILIDAD.md` y `docs/RRHH/BASES-DE-DESARROLLO.md`
- **Flujo obligatorio**: `router → controller → service → repository → DB`
- **Errores**: siempre `AppError(message, code, status_code)` desde `utils/errors.py`
- **Logs**: solo eventos de negocio importantes. Nunca `print()`. Usar `logger` de `utils/logger.py`
- **Config**: nunca `os.environ` directamente. Solo `from config.settings import settings`
- **Docstrings**: obligatorios en todos los métodos de `services/` e `integrations/`
- **Naming**: `snake_case` para funciones/variables, `PascalCase` para clases, `UPPER_SNAKE` para constantes
- **Límites de archivo**: router 80 líneas · controller 100 · service 150 · repository 100

### Frontend (TypeScript)
- Nunca usar `any`. TypeScript estricto en todo el proyecto.
- **Naming**: componentes en `PascalCase`, hooks con prefijo `use`, constantes en `UPPER_SNAKE_CASE`
- **Estados obligatorios**: todo componente que carga datos implementa: cargando (skeleton), vacío (EmptyState), error (ErrorState), con datos
- **Formularios**: label siempre visible (nunca solo placeholder), validación en tiempo real, errores específicos
- **Touch targets**: mínimo 44x44px en mobile
- **Mobile-first**: estilos base para mobile, `md:` y `lg:` para pantallas más grandes

### General
- Nunca commitear `.env`. Está en `.gitignore` desde el día 1.
- Formato de commits: `tipo: descripción` (feat, fix, refactor, chore, docs, test)
- Un commit = un cambio coherente. No mezclar features en el mismo commit.
- Pre-commit hooks activos: `ruff` (backend) + `eslint/prettier` (frontend)

## Reglas para Claude Code (OBLIGATORIAS)
1. **No modificar archivos fuera del scope de la tarea**. Si la tarea es "crear el router de empleados", no tocar settings.py ni el frontend.
2. **Si un archivo va a superar su límite de líneas, proponer cómo dividirlo ANTES de escribir.**
3. **Siempre incluir docstring en funciones de services e integrations.**
4. **Nunca usar `print()` ni `console.log()`. Usar el logger centralizado.**
5. **Ante dos enfoques válidos, preguntar antes de implementar.**
6. **Revisar que el código nuevo no duplica lógica que ya existe en otro módulo.**
7. **Los schemas Pydantic van en `schemas/`, nunca inline en los routers.**
8. **Los IDs siempre como `UUID` tipado en los endpoints, nunca como `str`.**

## Roles del sistema
| Rol | Descripción |
|-----|-------------|
| `admin_rrhh` | Control total. Único que puede crear usuarios, asignar permisos, configurar el sistema. |
| `management` | Acceso configurable por RRHH. Permisos granulares por módulo (lectura / lectura+escritura / sin acceso). |
| `empleado` | Acceso mínimo. Solo puede ver su propio perfil y sus propias evaluaciones. |

## Estado actual del proyecto
- [ ] S1: Setup y arquitectura base (EN CURSO)
- [ ] S2: Diseño de base de datos — migraciones SQL
- [ ] S3: Autenticación y sistema de roles
- [ ] S4: Design system y componentes base
- [ ] S5: Módulo de Empleados
- [ ] S6: Organigrama
- [ ] S7: Dashboard Ejecutivo
- [ ] S8: Onboarding y Offboarding
- [ ] S9: Vacantes y Pipeline
- [ ] S10: Costos de Personal
- [ ] S11: Sucesión y Planes de Carrera
- [ ] S12: Assessment Engine (Self AI replicado)
- [ ] S13: Motor de IA — AI HR Karstec
- [ ] S14: Reportes y Exportaciones
- [ ] S15: Seguridad, Testing y Deploy

## Deuda técnica conocida
_(vacío al inicio del proyecto — se completa a medida que avanza)_
