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
├── migrations/          ← SQL versionado (van por 063)
└── tests/
```

**Migraciones recientes (059–063):**
- **059** `empleados_roles` — columna `roles TEXT[]` (unifica `cargo`+`rol` en un multi-valor).
- **060** `empleados_legajo_ampliado` — 17 columnas del legajo real, todas nullable/texto libre salvo dos: `tipo_documento, sexo, telefono_alternativo, domicilio, estudios, ubicacion, turno, horas_contrato (INTEGER), organismo, gerencia, sector, seniority, perfil, categoria, modalidad_contratacion, referido, es_lider (BOOLEAN DEFAULT FALSE)`.
- **061** `adjuntos` — tabla genérica de adjuntos (archivos ligados a múltiples entidades, sobre Supabase Storage).
- **062** `periodos_cerrados` — tabla de bloqueo por período (congela fechas ya liquidadas/reportadas).
- **063** `add_must_change_password` — columna `users.must_change_password BOOLEAN NOT NULL DEFAULT FALSE` (fuerza cambio de contraseña temporal en el primer login).

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

**Eventos instrumentados (21):** alta/update/baja_empleado · cancelacion_vacacion · alta/update/baja_ausencia · inicio_offboarding · devolucion_activo · carga_nomina · set_presupuesto · alta_empresa · toggle_empresa_activa · alta_adjunto/baja_adjunto (B4) · cierre_periodo/reapertura_periodo (B3) · importacion_empleados (T18.6) · alta_usuario/baja_usuario/cambio_password (ABM usuarios). Todos vía `registrar(**payload_...)` con payloads canónicos en `_audit_payloads.py` (vacaciones/ausencias/offboarding) y `_audit_payloads_rrhh.py` (el resto).
- Diff por campos relevantes (no row completo). Read-before solo donde aporta: `empleado.update`, `empleado.deactivate` (subset), `ausencias.delete`. `vacaciones.cancel`/`ausencias.update` ya leían prior (diff gratis). Nómina/presupuesto: solo `datos_nuevos`. `empresa.toggle` audita solo el toggle dedicado (el PUT genérico NO audita).

**UI:** ruta `/auditoria` (admin/gerencia), `app/(dashboard)/auditoria/page.tsx` + `components/features/auditoria/` (AuditTable, AuditFilters, AuditDetailModal, auditLabels) + `components/ui/Pagination.tsx` (reutilizable). Filtros: entidad/usuario/evento/fechas. Diff legible en modal ("Cargo: Dev → Lead", no JSON). `services/auditoria.ts`, `services/usuarios.ts`, `types/auditoria.ts`.

---

## Importación CSV de empleados (T18.6 — COMPLETO)
Flujo full-stack de importación CSV que hace **alta masiva + update masivo** por DNI (upsert). Estructura: modal de pasos → `/preview` (valida) → `/confirmar` (inserta) → reporte de resultado.

- **Match por DNI** por empresa (`UNIQUE (empresa_id, dni)`): DNI existe en la empresa → update; no existe → alta. La empresa destino sale del **selector del modal**, no del header.
- **Validación exhaustiva en el preview (enfoque B1):** requeridos, tipo_contrato (`{efectivo, plazo_fijo, contratado, pasantia}` — coincide con el CHECK vivo), modalidad, fecha, email formato, área, + **duplicados contra DB** (email_corporativo UNIQUE **global** → chequeo sin filtro de empresa; legajo UNIQUE por empresa) + **duplicados intra-CSV** (email/dni/legajo repetidos en el mismo archivo). Chequeo **dirigido con `.in_(valores_del_csv)`**, nunca full-table.
- **email duplicado = error, no update** (el match de negocio es el DNI; el email es identidad global).
- **Confirmar robusto:** `EmpleadoImportService.confirmar` (router→service→repo) re-chequea la carrera antes del INSERT, inserta los válidos, reporta los que fallan (`ConfirmarError {fila, error}`), envuelve el batch en try/except → `AppError` tipado (nunca 500 opaco). Batch eficiente: 1 INSERT altas + 1 UPSERT updates (no por-fila). Audita el lote con **un evento único** (`importacion_empleados`).
- **UI:** `components/features/empleados/import/` (UploadStep, PreviewStep, ConfirmStep, ResultStep) + orquestador `ImportarCSVModal.tsx`. El **ResultStep** muestra "Se procesaron N (X altas, Y actualizaciones)" + lista de errores con motivo + botón "Descargar errores" (CSV). La recarga de la lista ocurre al **cerrar el resultado**, no al confirmar.
- Backend: `csv_service.py` (orquestador delgado) + `_csv_empleados_utils.py` (validación pura) + `empleado_import_repo.py` (batch + loaders en `_empleado_import_utils.py`) + `empleado_import_service.py`. `routers/importacion.py` gateado con `Seccion.IMPORTACION + Accion.WRITE` (solo admin_rrhh).

---

## Campo Roles multi-valor en empleados (S1–S5 COMPLETO, S6 limpieza PENDIENTE)
Unificación de los campos `cargo` + `rol` (029) en un único campo **`roles TEXT[]`** multi-valor. Reemplazó la parte "cargo→rol" del legajo ampliado y creció a 6 sub-sesiones.

- **Modelo:** columna `roles TEXT[]` (migración 059). Principal = `roles[0]`. CHECK `array_length(roles,1) >= 1` (garantía a nivel datos, el backend usa service_key). Texto libre con autocompletado **compartido entre empresas** (`SELECT DISTINCT` aplanado en Python, vía `empleado_roles_repo.get_roles_conocidos`); al menos 1 obligatorio, resto opcional.
- **Decisiones de producto pendientes de las pruebas:** "peso del principal" y "suma vs reemplaza" (un `TEXT[]` soporta ambas; se define al probar). Multi-valor en el CSV (delimitador `|`) diferido hasta tener un Excel de ejemplo.
- **Estado por sub-sesión:** S1 (migración+modelo) ✅ · S2 (lecturas → `roles[0]` con fallback `?? cargo`) ✅ · S3 (form: componente `RolesInput` chips + endpoint `roles-conocidos`) ✅ · S4 (audit: `_CAMPOS_EMPLEADO` cargo→roles, diff de listas legible en el modal) ✅ · S5 (import: columna CSV `rol`, construye `roles:[valor]`, compat un valor) ✅ · **S6 (limpieza) PENDIENTE** — va DESPUÉS de la prueba funcional.
- **S6 pendiente:** DROP COLUMN `cargo`/`rol` · corregir `000_run_all.sql` + demo `035` · quitar los fallbacks `?? cargo` de S2 · (futuro) parseo multi-valor del CSV.
- **⚠️ Despliegue:** la migración 059 deja `roles NOT NULL`. En producción, **059 + S3 + S5 van JUNTAS** — correr 059 sola rompe alta/import de empleados (las lecturas siguen OK). Los datos viejos (`cargo` + `rol`) se preservaron como lista inicial en el backfill.

---

## ABM de usuarios del sistema (Pieza 1 — backend COMPLETO, falta UI de cambio de contraseña)
Gestión de usuarios del sistema, **solo admin_rrhh** (`Seccion.USUARIOS + WRITE`). Los usuarios se crean con rol forzado `mandos_medios` (el rol NO se recibe del cliente).

**Endpoints (`routers/usuarios.py`):**
- `POST /api/usuarios` — alta de un mando_medio. Genera una **contraseña temporal** (aleatoria, `secrets`) que se devuelve **una sola vez** en la respuesta (`must_change_password=true`). Acepta `empleado_id` opcional → vincula `empleados.user_id`. Identidad en Supabase Auth (`auth.users`) + perfil espejo en `public.users`.
- `DELETE /api/usuarios/{user_id}` — baja. Borra `auth.users` (admin API); el `ON DELETE CASCADE` limpia `public.users` y el `ON DELETE SET NULL` desvincula `empleados.user_id`. **Auto-eliminación bloqueada** (un admin no puede borrarse a sí mismo → 400). El id sale del **path**, el ejecutor del **token**.
- `POST /api/usuarios/cambiar-password` — self-service (SIN gate de rol: cualquier usuario cambia SU propia clave). Reautentica con la actual antes de cambiar; baja `must_change_password`. El id sale del token, nunca del body.
- `GET /api/usuarios` — listado (para selectores). Devuelve `{items, total}` con `id, nombre, apellido, email, username, rol`.

**Backend:** `schemas/usuario.py`, `services/usuario_service.py` (**alta atómica por rollback**: si falla el perfil o el vínculo al empleado, borra el `auth.users` recién creado antes de propagar), `repositories/usuario_repo.py`, `tests/test_usuarios.py`. Migración **063** (`must_change_password`). Contraseñas **nunca** en logs.

**Frontend:** ruta `/usuarios` (gateada admin_rrhh: nav item por `accion:"write"` + guard de página por `puede(rol,"usuarios","write")`). `components/features/usuarios/` (`UsuariosTable`, `CrearUsuarioModal`, `EmpleadoLiderSelect`, `PasswordRevealModal`, `_fields`) + `components/ui/ConfirmDialog.tsx` (destructivo, reutilizable). El **selector de empleado a vincular filtra por `es_lider=true`** (vía `GET /api/empleados?es_lider=true`). La password temporal se muestra en un modal con "Copiar" + aviso "no se vuelve a mostrar"; la lista recarga al cerrar ese modal.

**PENDIENTE (dentro de Pieza 1):** UI de cambio de contraseña — (1) redirect forzado a la pantalla de cambio si `must_change_password=true`, (2) pantalla de cambio voluntario. Backend listo, **falta la UI**.

---

## Estado actual del proyecto

### Entrega 1 — COMPLETA (63h, 15 tareas). Pusheada.

### Entrega 2 — EN CURSO
- **T16** (roles funcionales) ✅ completa y pusheada.
- **T17** (validación X-Empresa-Id) ❌ NO APLICA (decisión de producto).
- **T18** (audit log app-level) ✅ completa. Backend `92d5edf` + UI `8646a9b`. Sin pushear.
- **T18.6** (importación CSV de empleados) ✅ completa. Sin pushear.
- **Campo Roles multi-valor** (S1–S5 ✅, S6 limpieza pendiente tras pruebas). Reemplazó la parte cargo→rol del legajo ampliado. Sin pushear.
- **ABM usuarios (Pieza 1)** ✅ backend completo (crear/listar/eliminar + cambio de contraseña + audit); falta la UI de cambio de contraseña. Sin pushear. Ver sección dedicada arriba.
- **T19–T25 / tandas pendientes** (ver mapa real abajo).

### Mapa real de pendientes (relevado contra código, ordenado por dependencia)
El mapa "T19–T25" era una simplificación; el plan real tiene 16 ítems. Pendientes, en orden de ataque recomendado:

**Resto del legajo ampliado** → era **A1** dentro de la Tanda A. Verificado contra migración 060: **todas las columnas del legajo ya existen** (`sexo` TEXT, `domicilio` TEXT, `horas_contrato` INTEGER, `es_lider` BOOLEAN, + otras 13). Los campos "ya existentes" del plan también siguen (`presencialidad`=`modalidad_trabajo`, `superior inmediato`=`manager_id`, seniority=`nivel`). A1 a nivel schema/columnas: **cerrado** (ver A1 abajo).

**Tanda A — la ficha del empleado (A1/A2/A3/A4 ✅ — A1 resuelto a nivel schema/columnas):**
- **Refactor previo de la ficha** ✅ — `empleados/[id]/page.tsx` dividida en `components/features/empleados/ficha/`: `_primitives.tsx` (Field/Section/LoadingSkeleton), `OffboardingModal.tsx`, `DatosEmpleadoSection.tsx`. La page quedó como orquestador delgado (127 líneas reales). Cada sección de la Tanda A es autoabastecida (recibe `empleadoId`, fetch propio, loading/error/vacío).
- **A2 — Tracking de cambios** ✅ — filtro `registro_id` aditivo end-to-end (`audit_repo.listar` + service + router `Query(None)` + `auditoria.ts`); `HistorialCambiosSection.tsx` filtra por `entidad="empleado"` + `registro_id`, reusa `AuditTable`/`AuditDetailModal`/`Pagination`. La pantalla `/auditoria` quedó intacta (el filtro se pasa por keyword, llamadas sin él idénticas).
- **A3 — Inventario en la ficha** ✅ — `InventarioSection.tsx`, pura UI (backend/service/type ya existían). Tabla con equipo, n° serie, fecha, estado de devolución legible.
- **A4 — Vacaciones en la ficha** ✅ — endpoint dedicado `GET /api/vacaciones/empleado/{empleado_id}` (gateado VACACIONES+READ, colocado antes de `/{id}` para evitar colisión de rutas) + `get_by_empleado` service + `fetchVacacionesEmpleado` front + `VacacionesSection.tsx`. Reusa `find_vacaciones_empleado`. Listado por área intacto.
- **A1 — Columnas del legajo ✅ (resuelto a nivel schema)**: `sexo`, `domicilio`, `horas_contrato` ya existen (migración **060**, verificado). Las 2 decisiones de producto quedaron **cerradas**: (1) liderazgo es un **flag `es_lider`**, columna REAL `BOOLEAN DEFAULT FALSE` en 060 (NO un valor dentro de `roles[]`); (2) `horas_contrato` es **INTEGER** (horas diarias, ej. 8 — según el comentario de 060). `es_lider` está cableado end-to-end (checkbox del form → payload → columna). Resta solo el spot-check funcional del hito de cierre.

**Tanda B — reuso de moldes:**
- Export en Inventario/Objetivos/Evaluaciones (ítem 10) + estandarizar (ítem 11): replica `reporte_export_service`.
- Import vacaciones por área (ítem 7): reusa molde T18.6 + parser XLSX nuevo (extraer el modal de import a genérico). "Por equipo" bloqueado (no existe tabla `equipos`).
- Adjuntos genéricos (ítem 4): sobre infra Supabase Storage existente.
- Bloqueos por módulo con fecha (ítem 1): tabla nueva + check en services de escritura + panel. Reusa enum `Seccion`.

**Tanda C — requieren modelo/diseño nuevo (las más pesadas):**
- Proyectos: asignar por área (ítem 12): bulk insert. "Por equipo" bloqueado por `equipos`.
- Import objetivos (ítem 8): bloqueado por rediseño del modelo (objetivos cuelgan de `user`, no de empleado).
- Evaluaciones de desempeño + import (ítem 9): módulo nuevo + cálculo de promedios/nota única. La más grande.

**Fuera de Entrega 2:** tabla `equipos` (fase "Después") → bloquea variantes "por equipo" de ítems 7 y 12.

**Pendiente de revisión al llegar:**
- **T21 (tracking de cambios)** puede solaparse conceptualmente con T18 (audit log). Revisar alcance antes de construir para no duplicar.
- **T22 (import/export)** puede solaparse con T18.6 (CSV de empleados ya hecho). Revisar qué cubre T22 que no esté ya resuelto.

**Pieza 2 — Ownership de mandos_medios (NO empezado):**
- **mandos_medios ve solo SU gente**, resuelto por **`manager_id`** (superior inmediato) — NO por área ni por `es_lider`. `es_lider` filtra el **dropdown del ABM** (a quién se le crea usuario); `manager_id` define el **alcance** (a quiénes ve/gestiona ese usuario).
- Requiere: vincular `empleados.user_id` (**ya se puebla desde el ABM**, Pieza 1) + **filtrado por fila** en Vacaciones/Ausencias + **RLS**.
- **Va DESPUÉS de la prueba funcional.**

**Hito de cierre de Entrega 2 (pendiente):**
- **Prueba funcional exhaustiva end-to-end** de todo el sistema antes de dar Entrega 2 por terminada. Incluye S6 (limpieza del campo Roles) y el spot-check de los flujos tocados. Se difirieron los spot-checks puntuales a esta verificación completa final.

---

## Deuda técnica conocida

### Líneas (archivos over-limit)
**Backend:** `reporte_export_service` 332, `reporte_generators` 249, `integracion_service` 201, `empleado_repo` **174** (era "~155"; medido con `.Count` — el filtro `es_lider` del ABM sumó, pero ya venía over-limit), `csv_service` 171, `reporte_anual` 154, `ev_instancias_repo` 146, `costo_repo` 135, `assessment_repo` 130, `ev_plantillas_repo` 129, `nomina_repo` 107, `proyectos_repo` 104, `ausencias_repo` 101. (`_audit_payloads_rrhh` en **175/200** — helper "otros", aún bajo límite pero creciendo con cada evento nuevo.)
**Frontend (límite 150):** `sucesion/page.tsx` 861, `costos/page.tsx` 608, `vacantes/[id]/page.tsx` 573, `reportes/page.tsx` 531, `onboarding/page.tsx` 405, `onboarding/templates/[id]/page.tsx` 393, `configuracion/page.tsx` 374, `empleados/page.tsx` 299, `empleados/[id]/page.tsx` 289, `vacaciones/page.tsx` 286, `ausencias/page.tsx` 285, `offboarding/page.tsx` 268, `areas/page.tsx` 253, `empresas/[id]/page.tsx` 224, `vacantes/page.tsx` 213, `empresas/page.tsx` 194, `objetivos/page.tsx` 167.
- División = tarea de refactor propia (diagnóstico → implementación archivo por archivo, peores primero). NO mezclar con features. El `Pagination.tsx` de T18 sirve para refactorizar los listados over-limit.
- ✅ **`Sidebar.tsx` resuelto**: se dividió en acordeón (secciones colapsables) → `Sidebar.tsx` (135), `NavGroup.tsx` (56), `NavItem.tsx` (35), `ThemeToggle.tsx` (24), `EmpresaSelector.tsx` (68) + `nav-config.ts` (66, define `NAV_GROUPS`). Todos bajo 150 (medido con `.Count`).

### Routers en el límite exacto (margen cero — el próximo cambio los rompe)
- `routers/ausencias.py` (80), `routers/empresa.py` (80). `routers/empleados.py` en 78. Compactar/dividir cuando una tarea futura los toque.

### Audit log (T18)
- `auditoria.tabla` es columna legacy (= `entidad` internamente). Drop column o drop NOT NULL = deuda futura.
- `ip`/`user_agent` quedan NULL. Poblar desde el middleware si se necesita (exigiría pasar datos del request al service).
- Retención/particionado del audit: diferido. Revisar cuando el volumen lo justifique.
- `000_run_all.sql` reintroduce los triggers viejos de auditoría si se re-bootstrapea desde cero (líneas ~1137-1216, 2469, 2550). Misma clase de deuda que 057. Corregir el agregado si se regenera.
- Evento de audit **usuarios**: `alta_usuario`, `baja_usuario`, `cambio_password` YA implementados (ABM usuarios, Pieza 1). Sin datos sensibles en el payload (nunca la contraseña).
- Importación CSV: si se audita, evento único por lote — NO fila por fila.

### Importación CSV (T18.6)
- `empleado_import_repo.py` quedó en **99/100** (al filo). Si una tarea futura le suma algo, dividir primero (mover loaders dirigidos a `_empleado_import_utils.py`).
- `empleado_repo.find_by_dni` (y posiblemente `find_by_legajo`) podrían haber quedado **sin callers** tras borrar `update_empleado_por_dni` en 18.6d. Verificar y limpiar en una pasada futura.
- `ImportarCSVModal.tsx` se dividió en `import/` (UploadStep, PreviewStep, ConfirmStep, ResultStep) — orquestador en 139.

### Campo Roles (S1–S5)
- `EmpleadoModal.tsx` en **402 líneas** (ya estaba en 385 antes, +17 por S3). Muy over-limit (2.7x). Candidato a dividir: extraer los `<select>`, EMPTY/TEXT_FIELDS y `validate` a subcomponentes. Refactor propio, no mezclar con feature.
- ⚠️ **PRIORIDAD ALTA — compactación de routers**: `vacaciones.py` (80/80, margen CERO), `ausencias.py` (80), `empresa.py` (80), `empleados.py` (79). **El próximo cambio que toque cualquiera rompe el límite.** Dejó de ser "conviene pronto" — es lo siguiente a hacer ANTES de tocar un router de nuevo. Tarea propia (refactor de varios archivos).
- ⚠️ **Conteos de líneas históricos posiblemente subestimados**: hasta A4, Claude Code midió con `Measure-Object -Line` (descarta líneas en blanco); el límite cuenta líneas reales (`.Count`). Caso detectado: `page.tsx` reportada en 142/146 estaba realmente en 164 (over-limit) — corregida a 127 real en A4. **Al hacer la compactación de routers, re-medir TODO con `.Count`** y no fiarse de los números viejos. Los componentes nuevos (reportados 34–96) probablemente sigan OK; los que estaban al filo (routers, `EmpleadoModal` 402) podrían estar peor.
- `roles-conocidos` aplana en Python (PostgREST no expone `unnest` sin RPC). OK por volumen; migrar a RPC/vista materializada si crece.
- Fallbacks `roles[0] ?? cargo` activos en lecturas (S2) — se quitan en S6.

### Tests
- Bloque `_TEST_ENV` (setup de env vars) duplicado en varios archivos de test. Candidato a `conftest.py` central. Cosmético.

### Otras (heredadas)
- Rate-limiter de BCRA no implementado (otro proyecto — no aplica a Sofia).
- `permisos.ts` es espejo manual de `permisos.py` — riesgo de divergencia.
- `middleware/auth.py:86-94` acepta UUID de empresa inexistente sin verificar contra tabla `empresas` (higiene de input, baja prioridad).

---

## Git
- Operar siempre desde `RRHH/Sofia/`.
- Estado actual: **16 commits ahead** de origin sin pushear. Los 3 más recientes (hoy): `f26ef11` fix auditoría legacy (coalesce entidad/evento NULL → tabla/accion), `b60d1ef` sidebar a acordeón + división de archivos, `22d05ed` ABM usuarios mandos_medios (crear/listar/eliminar + cambio password + audit). Push cuando Franco decida. **Nota despliegue:** la migración 059 (campo Roles) + S3 + S5 van juntas a producción; la 063 (`must_change_password`) ya está aplicada en prod (versionada retroactivamente).
- Formato de commits: convencional (`feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`).