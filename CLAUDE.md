# CLAUDE.md — Sofia (HR Karstec)

> **Ubicación:** este archivo va en la **raíz del repo Sofia** (`RRHH/Sofia/`), desde donde se ejecuta `claude`. Claude Code lo lee al inicio. Sofia tiene su propio `.git` dentro del mono-repo RRHH — **todas las operaciones git corren desde `RRHH/Sofia/`, nunca desde `RRHH/`**.

## Documentos de planificación (leer al inicio)
La dirección del producto y el schema están en estos documentos. **Tienen prioridad sobre la memoria.**

- @docs/MODELO_DATOS.md — **fuente de verdad del schema** (si algo contradice una tabla, manda este doc)
- @docs/PLAN_DESARROLLO_AHORA.md — qué construimos ahora
- @docs/PLAN_DESARROLLO_DESPUES.md — qué construimos después

---

## Qué es este proyecto
Sofia es el repositorio interno del producto **HR Karstec**: plataforma de gestión del ciclo de vida del empleado, **multiempresa** (2–5 empresas simultáneas), operada por un equipo de RRHH de 3 personas. Reporting con IA vía Claude Sonnet. Live en hrkarstec.site.

## Stack
- **Backend**: Python 3.11 + FastAPI. Arquitectura por capas **router → service → repository** (NO hay capa de controllers).
- **Frontend**: Next.js 16.2.4 (App Router) + TypeScript + Tailwind v4 + Shadcn/ui.
- **DB**: Supabase (PostgreSQL + Auth + Storage), con RLS.
- **IA**: Anthropic Claude Sonnet.
- **Deploy**: Vercel (frontend + backend).

## Estructura (backend)
```
backend/
├── main.py              ← entrada, registro de routers, middleware
├── config/settings.py   ← única fuente de config y env
├── routers/             ← endpoints, sin lógica de negocio (límite 80 líneas)
├── services/            ← lógica de negocio (límite 150)
├── repositories/        ← único acceso a DB (límite 100)
├── integrations/        ← wrappers externos (supabase_client, anthropic)
├── schemas/             ← Pydantic in/out
├── utils/               ← helpers (permisos.py, errors.py, logger.py)
├── migrations/          ← SQL versionado (van por 058)
└── tests/
```

## Convenciones de código
- Seguir ORDEN-Y-LEGIBILIDAD.md, SEGURIDAD-PENTEST.md, BASES-DE-DESARROLLO.md y UX-UI.md de la agencia.
- Errores: siempre `AppError(message, code, status_code)`.
- Logs: solo eventos de negocio importantes. Sin `print()` / `console.log()` — logger centralizado.
- Config: solo vía `settings`, nunca `os.environ` directo.
- **Límites de líneas (estrictos)**: router 80 · controller 100 (no aplica, no hay) · service 150 · repository 100 · componente React 150 · hook 80 · otros 200.
- Next.js 16: `params` en rutas dinámicas se await (es Promise).
- PowerShell: sin `&&` (usar `;`). Paths con paréntesis entre comillas.
- NO usar `from __future__ import annotations` en routers FastAPI (rompe resolución de anotaciones Pydantic).
- Helpers Supabase en políticas RLS necesitan `SECURITY DEFINER` (evita dependencia circular en login).

## Reglas para Claude Code
1. No modificar archivos fuera del scope de la tarea.
2. Si un archivo supera su límite de líneas, **proponer cómo dividirlo antes de escribir**.
3. Cada commit = un cambio coherente (lo hace Franco manualmente, nunca Claude Code).
4. Docstrings en funciones de services e integrations.
5. **Performance, escalabilidad, seguridad y legibilidad gobiernan toda decisión técnica automáticamente** — elegir siempre la opción más segura/escalable/performante sin preguntar, salvo que haya un tradeoff funcional real.
6. Diagnóstico read-only primero → revisión → implementación. Nunca asumir nada del código sin leerlo.
7. Una tarea atómica por sesión.
8. Verificar contra los archivos fuente, no contra el auto-reporte de Claude Code.
9. Producción puede driftear de las migraciones versionadas — verificar contra el schema vivo, no contra el historial de migraciones.
10. Commits y push están desacoplados: **no hay push a GitHub hasta que Franco lo decida**.
11. Preferir commits por sub-sesión (mejor granularidad de rollback) sobre commits por tarea entera.
12. Cortar las sub-tareas por módulo cuando hay división de archivos de por medio (resolver el límite de líneas donde se instrumenta, no en masa).
13. Cuando se pide un diagnóstico, devolver SOLO el diagnóstico (read-only). Cuando se pide implementación, escribir código — no devolver otro diagnóstico.

---

## Modelo de roles funcionales (T16 — COMPLETO)
Tres roles, definidos en `utils/permisos.py`:
- **admin_rrhh** — lectura + escritura en todo.
- **gerencia_lectura** — lectura en todo, escritura en nada.
- **mandos_medios** — lectura + escritura solo en VACACIONES y AUSENCIAS; sin acceso al resto.
- Rol desconocido / None → **fail-closed** (sin acceso).

Núcleo: `puede(rol, seccion, accion) -> bool` (función pura, sin ramas especiales por sección — la regla general resuelve todo), `require_permission(seccion, accion)` dependency factory que lanza `AppError(..., "FORBIDDEN", 403)`. Enum `Seccion` con 25 valores. `MANDOS_MEDIOS_SECCIONES = frozenset({VACACIONES, AUSENCIAS})`. 142 endpoints gateados inline (no router-level). Espejo frontend en `frontend/services/permisos.ts` (`puede`, `RUTA_SECCION`, `RUTAS_ORDENADAS`, `seccionDeRuta`). Sidebar filtra NAV_ITEMS por permiso, AuthGuard gatea por ruta, `useCanWrite`/`<Can>` ocultan botones de escritura.

**Decisión de producto (T17 NO APLICA):** todo usuario, sin importar rol, accede a TODAS las empresas. No existe "usuario limitado a ciertas empresas". El comportamiento de empresa activa (`empresa_id=None` consolidado, o empresa puntual vía header `X-Empresa-Id`) es correcto y definitivo. No reabrir.

---

## Audit log app-level (T18 — COMPLETO)
Sistema de auditoría con captura **app-level** (no triggers DB). Backend (commit `92d5edf`) + UI (commit `8646a9b`).

**Modelo:**
- Tabla `auditoria` (migración 024, extendida por 058): `id, tabla, registro_id, accion (CHECK INSERT|UPDATE|DELETE), datos_anteriores JSONB, datos_nuevos JSONB, usuario_id, ip, user_agent, created_at, empresa_id, entidad, evento`. Inmutable (sin policies UPDATE/DELETE). RLS de SELECT: `auditoria_select_admin_gerencia` (admin_rrhh + gerencia_lectura leen; mandos no).
- Los triggers DB viejos (`fn_auditoria` + ~21 triggers) fueron **dropeados** en 058: registraban `usuario_id` NULL bajo service_key. La captura es ahora app-level.
- `AuditService.registrar(*, usuario_id, entidad, registro_id, accion, evento, empresa_id, datos_anteriores, datos_nuevos)` — keyword-only, síncrono, **TRAGA todo error** (auditar nunca rompe la operación de negocio). `_jsonable()` convierte UUID/date. `_diff()` arma diff por campos cambiados.
- `audit_repo` (insert + listar con filtros/paginación + joins manuales users/empresas). `audit_service` inyectado por constructor en cada service instrumentado (`audit: Optional[AuditService] = None`).
- Payloads canónicos en `services/_audit_payloads.py` (vacaciones/ausencias/offboarding) y `services/_audit_payloads_rrhh.py` (empleados/costos/empresa). Funciones puras, 1 línea por evento en cada service.

**Eventos instrumentados (12):** alta/update/baja_empleado · cancelacion_vacacion · alta/update/baja_ausencia · inicio_offboarding · devolucion_activo · carga_nomina · set_presupuesto · alta_empresa · toggle_empresa_activa.
- Diff por campos relevantes (no row completo). Read-before solo donde aporta: `empleado.update`, `empleado.deactivate` (subset), `ausencias.delete`. `vacaciones.cancel`/`ausencias.update` ya leían prior (diff gratis). Nómina/presupuesto: solo `datos_nuevos`. `empresa.toggle` audita solo el toggle dedicado (el PUT genérico NO audita).

**UI:** ruta `/auditoria` (admin/gerencia), `app/(dashboard)/auditoria/page.tsx` + `components/features/auditoria/` (AuditTable, AuditFilters, AuditDetailModal, auditLabels) + `components/ui/Pagination.tsx` (reutilizable). Filtros: entidad/usuario/evento/fechas. Diff legible en modal ("Cargo: Dev → Lead", no JSON). `services/auditoria.ts`, `services/usuarios.ts`, `types/auditoria.ts`.

---

## Estado actual del proyecto

### Entrega 1 — COMPLETA (63h, 15 tareas). Pusheada.

### Entrega 2 — EN CURSO
- **T16** (roles funcionales) ✅ completa y pusheada.
- **T17** (validación X-Empresa-Id) ❌ NO APLICA (decisión de producto).
- **T18** (audit log app-level) ✅ completa. Backend `92d5edf` + UI `8646a9b`. Sin pushear.
- **T19–T25** pendientes: bloqueos por módulo · legajo ampliado · tracking de cambios · import/export · vacaciones historial · proyectos por equipo · objetivos import masivo.

**Tareas surgidas en el camino (no en el mapa original):**
- **Reparación flujo CSV de empleados** — `update_empleado_por_dni` (en `empleado_service`) es dead code hoy (ningún caller) pero su docstring dice que es del flujo de importación CSV. Franco confirmó que el import CSV de empleados **debe estar funcional en Entrega 2** y que nunca se verificó que funcione. Tarea propia, pendiente de diagnóstico end-to-end del flujo completo. Puede solaparse con T22 (import/export). `update_empleado_por_dni` quedó **intacto** a propósito.

**Pendiente de revisión al llegar:**
- **T21 (tracking de cambios)** puede solaparse conceptualmente con T18 (audit log). Revisar alcance antes de construir para no duplicar.

---

## Deuda técnica conocida

### Líneas (archivos over-limit)
**Backend:** `reporte_export_service` 332, `reporte_generators` 249, `integracion_service` 201, `csv_service` 171, `reporte_anual` 154, `empleado_repo` ~155, `ev_instancias_repo` 146, `costo_repo` 135, `assessment_repo` 130, `ev_plantillas_repo` 129, `nomina_repo` 107, `proyectos_repo` 104, `ausencias_repo` 101.
**Frontend (límite 150):** `sucesion/page.tsx` 861, `costos/page.tsx` 608, `vacantes/[id]/page.tsx` 573, `reportes/page.tsx` 531, `onboarding/page.tsx` 405, `onboarding/templates/[id]/page.tsx` 393, `configuracion/page.tsx` 374, `empleados/page.tsx` 299, `empleados/[id]/page.tsx` 289, `vacaciones/page.tsx` 286, `ausencias/page.tsx` 285, `Sidebar.tsx` 277, `offboarding/page.tsx` 268, `areas/page.tsx` 253, `empresas/[id]/page.tsx` 224, `vacantes/page.tsx` 213, `empresas/page.tsx` 194, `objetivos/page.tsx` 167.
- División = tarea de refactor propia (diagnóstico → implementación archivo por archivo, peores primero). NO mezclar con features. El `Pagination.tsx` de T18 sirve para refactorizar los listados over-limit.

### Routers en el límite exacto (margen cero — el próximo cambio los rompe)
- `routers/ausencias.py` (80), `routers/empresa.py` (80). `routers/empleados.py` en 78. Compactar/dividir cuando una tarea futura los toque.

### Audit log (T18)
- `auditoria.tabla` es columna legacy (= `entidad` internamente). Drop column o drop NOT NULL = deuda futura.
- `ip`/`user_agent` quedan NULL. Poblar desde el middleware si se necesita (exigiría pasar datos del request al service).
- Retención/particionado del audit: diferido. Revisar cuando el volumen lo justifique.
- `000_run_all.sql` reintroduce los triggers viejos de auditoría si se re-bootstrapea desde cero (líneas ~1137-1216, 2469, 2550). Misma clase de deuda que 057. Corregir el agregado si se regenera.
- Evento de audit **usuarios** (alta/cambio de rol): pendiente, atado al futuro módulo de gestión de usuarios (no existe endpoint hoy).
- Importación CSV: si se audita, evento único por lote — NO fila por fila.

### Tests
- Bloque `_TEST_ENV` (setup de env vars) duplicado en varios archivos de test. Candidato a `conftest.py` central. Cosmético.

### Otras (heredadas)
- Rate-limiter de BCRA no implementado (otro proyecto — no aplica a Sofia).
- `permisos.ts` es espejo manual de `permisos.py` — riesgo de divergencia.
- `Sidebar.tsx` 277 líneas (over-limit).
- `middleware/auth.py:86-94` acepta UUID de empresa inexistente sin verificar contra tabla `empresas` (higiene de input, baja prioridad).

---

## Git
- Operar siempre desde `RRHH/Sofia/`.
- Estado actual: 3 commits ahead de origin sin pushear (16.6/CLAUDE.md, backend T18 `92d5edf`, UI T18 `8646a9b`). Push cuando Franco decida.
- Formato de commits: convencional (`feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`).