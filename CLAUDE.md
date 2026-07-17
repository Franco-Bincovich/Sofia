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
- **Auth**: `AuthMiddleware` verifica la **firma del JWT de Supabase contra el JWKS público del proyecto (ES256)**, fail-closed (cualquier fallo → 401 genérico); expone `user_id`, `rol` y `empresa_id` (del header `X-Empresa-Id`) en `request.state`. El JWKS se cachea por proceso. Refresh automático + logout real. Endpoint `GET /health` (sin auth) devuelve `{status, env}`.

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
├── migrations/          ← SQL versionado (van por 074; la base se reconstruye desde db/schema.sql, no desde el consolidado)
└── tests/
```

**Migraciones recientes (059–074):**
- **059** `empleados_roles` — columna `roles TEXT[]` (unifica `cargo`+`rol` en un multi-valor).
- **060** `empleados_legajo_ampliado` — 17 columnas del legajo real, todas nullable/texto libre salvo dos: `tipo_documento, sexo, telefono_alternativo, domicilio, estudios, ubicacion, turno, horas_contrato (INTEGER), organismo, gerencia, sector, seniority, perfil, categoria, modalidad_contratacion, referido, es_lider (BOOLEAN DEFAULT FALSE)`.
- **061** `adjuntos` — tabla genérica de adjuntos (archivos ligados a múltiples entidades, sobre Supabase Storage).
- **062** `periodos_cerrados` — tabla de bloqueo por período (congela fechas ya liquidadas/reportadas).
- **063** `add_must_change_password` — columna `users.must_change_password BOOLEAN NOT NULL DEFAULT FALSE` (fuerza cambio de contraseña temporal en el primer login).
- **064** `empleados_campos_nomina` · **065** `tipo_contrato_texto_libre` · **066** `create_cesiones` (módulo de cesiones de empleados) · **067** `vacantes_campos_publicacion` · **068** `adjuntos_es_principal` · **069** `vacantes_info_puesto` · **070** `vacantes_requisitos_texto` · **071** `candidatos_sobreviven_vacante` · **072** `drop_fk_compuesta_candidatos_vacante` · **073** `drop_unique_huerfano_vacantes` (72/73 corrigen drift de producción) · **074** `retrofit_empresa_id_dni_empleados` (versiona el retrofit multiempresa + DNI que ya vivía en prod).

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

Núcleo: `puede(rol, seccion, accion) -> bool` (función pura, sin ramas especiales por sección — la regla general resuelve todo), `require_permission(seccion, accion)` dependency factory que lanza `AppError(..., "FORBIDDEN", 403)`. Enum `Seccion` con 26 valores. `MANDOS_MEDIOS_SECCIONES = frozenset({VACACIONES, AUSENCIAS})`. ~168 gates `Depends(require_permission(...))` inline (no router-level). Espejo frontend en `frontend/services/permisos.ts` (`puede`, `seccionDeRuta`, `primeraRutaPermitida`, `getRol`). Sidebar filtra `NAV_GROUPS` por permiso, AuthGuard gatea por ruta, el hook `useCanWrite` oculta botones de escritura.

**Decisión de producto (T17 NO APLICA):** todo usuario, sin importar rol, accede a TODAS las empresas. No existe "usuario limitado a ciertas empresas". El comportamiento de empresa activa (`empresa_id=None` consolidado, o empresa puntual vía header `X-Empresa-Id`) es correcto y definitivo. No reabrir.

---

## Audit log app-level (T18 — COMPLETO)
Sistema de auditoría con captura **app-level** (no triggers DB). Backend (commit `92d5edf`) + UI (commit `8646a9b`).

**Modelo:**
- Tabla `auditoria` (migración 024, extendida por 058): `id, tabla, registro_id, accion (CHECK INSERT|UPDATE|DELETE), datos_anteriores JSONB, datos_nuevos JSONB, usuario_id, ip, user_agent, created_at, empresa_id, entidad, evento`. Inmutable (sin policies UPDATE/DELETE). RLS de SELECT: `auditoria_select_admin_gerencia` (admin_rrhh + gerencia_lectura leen; mandos no).
- Los triggers DB viejos (`fn_auditoria` + ~21 triggers) fueron **dropeados** en 058: registraban `usuario_id` NULL bajo service_key. La captura es ahora app-level.
- `AuditService.registrar(*, usuario_id, entidad, registro_id, accion, evento, empresa_id, datos_anteriores, datos_nuevos)` — keyword-only, síncrono, **TRAGA todo error** (auditar nunca rompe la operación de negocio). `_jsonable()` convierte UUID/date. `_diff()` arma diff por campos cambiados.
- `audit_repo` (insert + listar con filtros/paginación + joins manuales users/empresas). `audit_service` inyectado por constructor en cada service instrumentado (`audit: Optional[AuditService] = None`).
- Payloads canónicos en `services/_audit_payloads.py` (vacaciones/ausencias/offboarding), `services/_audit_payloads_rrhh.py` (empleados/costos/empresa), `services/_audit_payloads_cesion.py` (cesiones) y `services/_audit_payloads_ev.py` (evaluaciones). Funciones puras, 1 línea por evento en cada service.

**Eventos instrumentados (21):** alta/update/baja_empleado · cancelacion_vacacion · alta/update/baja_ausencia · inicio_offboarding · devolucion_activo · carga_nomina · set_presupuesto · alta_empresa · toggle_empresa_activa · alta_adjunto/baja_adjunto (B4) · cierre_periodo/reapertura_periodo (B3) · importacion_empleados (T18.6) · alta_usuario/baja_usuario/cambio_password (ABM usuarios). Todos vía `registrar(**payload_...)` con payloads canónicos en `_audit_payloads.py` (vacaciones/ausencias/offboarding) y `_audit_payloads_rrhh.py` (el resto).
- Diff por campos relevantes (no row completo). Read-before solo donde aporta: `empleado.update`, `empleado.deactivate` (subset), `ausencias.delete`. `vacaciones.cancel`/`ausencias.update` ya leían prior (diff gratis). Nómina/presupuesto: solo `datos_nuevos`. `empresa.toggle` audita solo el toggle dedicado (el PUT genérico NO audita).

**UI:** ruta `/auditoria` (admin/gerencia), `app/(dashboard)/auditoria/page.tsx` + `components/features/auditoria/` (AuditTable, AuditFilters, AuditDetailModal, auditLabels) + `components/ui/Pagination.tsx` (reutilizable). Filtros: entidad/usuario/evento/fechas. Diff legible en modal ("Cargo: Dev → Lead", no JSON). `services/auditoria.ts`, `services/usuarios.ts`, `types/auditoria.ts`.

---

## Importación CSV (T18.6 — COMPLETO)
Importación masiva por CSV, con **dedup por DNI** (crea si es nuevo, actualiza si ya existe). Hoy vive en **dos flujos separados**, ambos gateados con `Seccion.IMPORTACION + Accion.WRITE` (solo admin_rrhh). Nombres antiguos (`csv_service.py`, `empleado_import_repo.py`, `empleado_import_service.py`, `_csv_empleados_utils.py`, `ImportarCSVModal.tsx`) **ya no existen** — se reharmaron al naming `nomina_*` que sigue.

**Flujo 1 — Nómina de empleados (alta/update de empleados por CSV).**
- Backend: `routers/importacion_nomina_empleados.py` (un POST `importar`, single-shot — sin preview/confirmar) → `services/nomina_empleados_service.py::NominaEmpleadosImportService.importar` + `services/_nomina_empleados_transforms.py` (parseo puro) + `schemas/importacion_nomina_empleados.py` (`build_create`/`build_update`, `FilaConFaltantes`, `FilaNoCargada`, `ImportacionNominaEmpleadosResult`).
- CSV real: 27 columnas, separador `;`, encoding `latin1`. Idempotente y tolerante: **dedup por DNI**, no aborta ante error de fila y clasifica cada fila en **3 grupos** — cargadas OK · cargadas con faltantes (email) · no cargadas (falta obligatorio o falló la creación). Reusa Empresa/Area/EmpleadoService (validaciones + audit). **Un evento de auditoría por lote** (`importacion_empleados`).
- UI: `components/features/empleados/ImportarNominaModal.tsx` + `components/features/empleados/NominaResultView.tsx` (resultado con los 3 grupos), montado en `empleados/page.tsx`.

**Flujo 2 — Nómina de costos (importa salarios/nómina mensual).**
- Backend: `routers/importacion_nomina.py` (`/nomina/preview` valida + `/nomina/confirmar` inserta) → `services/nomina_csv_service.py::parse_nomina_csv` + `repositories/nomina_import_repo.py::NominaImportRepo` + `schemas/importacion.py` (`FilaNominaPreview`, `ConfirmarError`, `ImportacionNominaPreview/ConfirmarResponse`). Resuelve DNI→empleado y detecta duplicados por `(anio, mes)`.
- UI: `components/features/costos/ImportarNominaCSVModal.tsx`, montado en `costos/page.tsx`.

---

## Campo Roles multi-valor en empleados (S1–S5 COMPLETO, S6 limpieza PENDIENTE)
Unificación de los campos `cargo` + `rol` (029) en un único campo **`roles TEXT[]`** multi-valor. Reemplazó la parte "cargo→rol" del legajo ampliado y creció a 6 sub-sesiones.

- **Modelo:** columna `roles TEXT[]` (migración 059). Principal = `roles[0]`. CHECK `array_length(roles,1) >= 1` (garantía a nivel datos, el backend usa service_key). Texto libre con autocompletado **compartido entre empresas** (`SELECT DISTINCT` aplanado en Python, vía `empleado_roles_repo.get_roles_conocidos`); al menos 1 obligatorio, resto opcional.
- **Decisiones de producto pendientes de las pruebas:** "peso del principal" y "suma vs reemplaza" (un `TEXT[]` soporta ambas; se define al probar). Multi-valor en el CSV (delimitador `|`) diferido hasta tener un Excel de ejemplo.
- **Estado por sub-sesión:** S1 (migración+modelo) ✅ · S2 (lecturas → `roles[0]` con fallback `?? cargo`) ✅ · S3 (form: componente `RolesInput` chips + endpoint `roles-conocidos`) ✅ · S4 (audit: `_CAMPOS_EMPLEADO` cargo→roles, diff de listas legible en el modal) ✅ · S5 (import: columna CSV `rol`, construye `roles:[valor]`, compat un valor) ✅ · **S6 (limpieza) PENDIENTE** — va DESPUÉS de la prueba funcional.
- **S6 pendiente:** DROP COLUMN `cargo`/`rol` · reflejar el drop en `db/schema.sql` (fuente de reconstrucción; `000_run_all.sql` está deprecado) · quitar los fallbacks `?? cargo` de S2 · (futuro) parseo multi-valor del CSV.
- **⚠️ Despliegue:** la migración 059 deja `roles NOT NULL`. En producción, **059 + S3 + S5 van JUNTAS** — correr 059 sola rompe alta/import de empleados (las lecturas siguen OK). Los datos viejos (`cargo` + `rol`) se preservaron como lista inicial en el backfill.

---

## ABM de usuarios del sistema (Pieza 1 — COMPLETO)
Gestión de usuarios del sistema, **solo admin_rrhh** (`Seccion.USUARIOS + WRITE`). El **rol se elige en el alta** (selector), validado en el schema contra `ROLES_VALIDOS` (`admin_rrhh`|`gerencia_lectura`|`mandos_medios`) → 422 si es inválido; ya **no** se fuerza `mandos_medios`.

**Endpoints (`routers/usuarios.py`):**
- `POST /api/usuarios` — alta de un usuario con el rol elegido. Genera una **contraseña temporal** (aleatoria, `secrets`) que se devuelve **una sola vez** en la respuesta (`must_change_password=true`). Acepta `empleado_id` opcional → vincula `empleados.user_id`. Identidad en Supabase Auth (`auth.users`) + perfil espejo en `public.users`.
- `DELETE /api/usuarios/{user_id}` — baja. Borra `auth.users` (admin API); el `ON DELETE CASCADE` limpia `public.users` y el `ON DELETE SET NULL` desvincula `empleados.user_id`. **Auto-eliminación bloqueada** (un admin no puede borrarse a sí mismo → 400). El id sale del **path**, el ejecutor del **token**.
- `POST /api/usuarios/cambiar-password` — self-service (SIN gate de rol: cualquier usuario cambia SU propia clave). Reautentica con la actual antes de cambiar; baja `must_change_password`. El id sale del token, nunca del body.
- `GET /api/usuarios` — listado (para selectores). Devuelve `{items, total}` con `id, nombre, apellido, email, username, rol`.

**Backend:** `schemas/usuario.py`, `services/usuario_service.py` (**alta atómica por rollback**: si falla el perfil o el vínculo al empleado, borra el `auth.users` recién creado antes de propagar), `repositories/usuario_repo.py`, `tests/test_usuarios.py`. Migración **063** (`must_change_password`). Contraseñas **nunca** en logs.

**Frontend:** ruta `/usuarios` (gateada admin_rrhh: nav item por `accion:"write"` + guard de página por `puede(rol,"usuarios","write")`). `components/features/usuarios/` (`UsuariosTable`, `CrearUsuarioModal`, `EmpleadoLiderSelect`, `PasswordRevealModal`, `_fields`) + `components/ui/ConfirmDialog.tsx` (destructivo, reutilizable). El **selector de empleado a vincular filtra por `es_lider=true`** (vía `GET /api/empleados?es_lider=true`). La password temporal se muestra en un modal con "Copiar" + aviso "no se vuelve a mostrar"; la lista recarga al cerrar ese modal.

**UI de cambio de contraseña ✅ COMPLETO:** (1) redirect forzado a la pantalla de cambio si `must_change_password=true`, (2) pantalla de cambio voluntario. Backend + UI hechos. Pieza 1 cerrada.

---

## Ownership de mandos_medios (Pieza 2 — COMPLETO, app-level)
Un `mandos_medios` ve y gestiona **solo su gente**: los empleados que lo tienen como superior inmediato (`empleados.manager_id` = el `empleados.id` del mando) **más su propio registro**. Decisión de producto: "a cargo" = **`manager_id`** (superior inmediato), NO área ni `es_lider`.

**Criterio centralizado en `services/ownership.py`** (reusar, no reimplementar):
- `ids_empleados_visibles(user_id, rol, repo) -> None | [] | [ids]` — **contrato**: `None` = sin restricción (admin_rrhh/gerencia_lectura ven todo); `[]` = no ve nada (fail-closed); `[ids]` = ve exactamente esos (mando: su id + subordinados directos vía `manager_id`).
- `puede_gestionar_empleado(user_id, rol, empleado_id, repo) -> bool` — guard de escritura por fila (reusa el anterior: `None`→True, en la lista→True, `[]`/rol desconocido→False).
- Repo dedicado `repositories/empleado_ownership_repo.py` (`find_by_user_id`, `ids_subordinados`, `ids_empleados_por_area`), separado de `empleado_repo` (over-limit).

**Aplicado en 3 frentes, solo en Vacaciones y Ausencias:**
- **Listados**: `get_all` recibe `user_id`/`rol` y resuelve el filtro vía `services/_ownership_filter.resolver_filtro_empleados` (intersección ownership ∩ área) → `find_all(empresa_id, empleado_ids)`. `[]` → devuelve vacío **sin consultar** la tabla.
- **Export**: mismo filtro; el export de vacaciones acota además por `empleado_id` (intersección con el alcance del mando).
- **5 escrituras**: `create`/`cancel` (vacaciones) + `create`/`update`/`delete` (ausencias) validan con `puede_gestionar_empleado` **antes de mutar**. CREAR → `OWNERSHIP_DENIED` **403** (empleado_id del body, check primero). CANCELAR/EDITAR/BORRAR → **404 para ajeno** (mismo código que inexistente, para no confirmar la existencia de registros de otros empleados). El `rol` se cablea del router al service (el `user_id` ya llegaba como `created_by`/`usuario_id`).

**Nota operativa:** empleado con `manager_id` NULL → ningún mando lo ve; solo RRHH (fail-closed natural).
**Falta (Pieza 2 posterior):** **RLS a nivel DB** como defensa en profundidad — hoy el enforcement es app-level y el backend usa service_key (bypassa RLS). Tests: `test_ownership.py`, `test_listados_ownership.py`, `test_escrituras_ownership.py`, `test_vacaciones_export.py`.

---

## Export estandarizado (COMPLETO)
Los **4 sub-módulos** proyectan **columnas legibles sin UUIDs crudos** (nombres resueltos en lugar de `*_id`, fechas dd/mm/aaaa, booleanos Sí/No), vía un helper externo `services/_<modulo>_export.py::construir_filas_export(items)` — mismo molde que vacaciones. El motor genérico (`services/export/`, `build_export`) **NO se toca**.
- **Vacaciones** (`_vacaciones_export.py`) — además filtra por área/empleado con ownership.
- **Inventario asignaciones** (`_inventario_export.py`) e **ítems** (`_inventario_items_export.py`). `inventario_items` **antes NO exportaba**; ahora sí (`GET /api/inventario/items/exportar` + botón en el tab de Ítems).
- **Evaluaciones** (`_evaluaciones_export.py`) y **Objetivos** (`_objetivos_export.py`).
- Estos 3 (inventario/evaluaciones/objetivos) **no llevan ownership** (sus secciones no las tocan mandos): molde simple, `find_all` directo, sin `user_id`/`rol`.

---

## Otros módulos en el código (referencia rápida)
Módulos que existen y funcionan pero no tenían sección propia acá:
- **Selección — Vacantes + Candidatos:** `routers/vacantes.py` + `routers/candidatos.py` (+ `_candidato_form.py`, formulario público sin auth), `services/vacante_service.py` (vacantes con pipeline de candidatos por etapa), `candidato_service.py`, `cv_service.py`. Integraciones de publicación/ingreso de candidatos: `zernio_service.py`, `gmail_service.py` (crear candidato desde email) y datos de LinkedIn. Frontend en `app/(dashboard)/vacantes/` y `candidatos/`.
- **Cesiones** (migración **066**): entidad hija de empleado — 0..N "cesiones" (momentos en que estuvo cedido/trabajando en otra empresa + fecha de reingreso reconocida + nombre de empresa externa, texto libre). `routers/cesiones.py` → `cesion_service.py` → `cesion_repo.py`, gateado por `Seccion.EMPLEADOS`, audita alta/update/baja. Vive en la ficha del empleado (`components/features/empleados/ficha/CesionesSection.tsx` + `CesionModal.tsx`).

## Staging de migración a AWS (`migracionAWS/`)
Carpeta **aislada** de staging para la migración de Supabase a **AWS (asyncpg/RDS + S3)**. El código nuevo se arma acá **sin tocar `backend/` en producción** hasta que se ejecute la migración. Contiene archivos `*_NEW.py` (auth, repos-molde, `postgres_client`, `token_service`) + migraciones 075/076 + docs (`MIGRACION_A_RDS.md`, `README_AUTH.md`). **No** forma parte del árbol activo del backend. Mapa completo en `migracionAWS/MIGRACION_A_RDS.md`.

---

## Estado actual del proyecto

### Entrega 1 — COMPLETA (63h, 15 tareas).

### Entrega 2 — EN CURSO
- **T16** (roles funcionales) ✅ completa.
- **T17** (validación X-Empresa-Id) ❌ NO APLICA (decisión de producto).
- **T18** (audit log app-level) ✅ completa.
- **T18.6** (importación CSV — dos flujos: nómina de empleados + nómina de costos) ✅ completa.
- **Campo Roles multi-valor** (S1–S5 ✅, S6 limpieza pendiente tras pruebas). Reemplazó la parte cargo→rol del legajo ampliado.
- **ABM usuarios (Pieza 1)** ✅ COMPLETO — crear/listar/eliminar + **selector de rol** + cambio de contraseña (backend + UI, forzado y voluntario) + audit. Ver sección dedicada arriba.
- **Ownership de mandos_medios (Pieza 2)** ✅ COMPLETO app-level (listados + export + 5 escrituras). Falta RLS. Ver sección dedicada.
- **Export estandarizado** ✅ COMPLETO — 4 sub-módulos con columnas legibles sin UUIDs; `inventario_items` ahora exporta. Ver sección dedicada.
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
- ✅ **Export en Inventario/Objetivos/Evaluaciones + ítems (ítems 10–11) — HECHO** vía el motor **`build_export`** (NO `reporte_export_service`, que quedó legacy): columnas legibles sin UUIDs, helpers `_<modulo>_export.py`. Ver "Export estandarizado" arriba.
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

**Pieza 2 — Ownership de mandos_medios ✅ COMPLETO (app-level):** ve/gestiona solo su gente (`manager_id`) en Vacaciones/Ausencias — listados, export y las 5 escrituras. Ver sección dedicada "Ownership de mandos_medios (Pieza 2 — COMPLETO)" arriba. `es_lider` filtra el dropdown del ABM; `manager_id` define el alcance. **Falta**: RLS a nivel DB (defensa en profundidad).

**Resumen de cierre de Entrega 2:**
- **Cerrados:** roles funcionales (T16) · ABM usuarios (Pieza 1, con selector de rol + cambio de contraseña) · audit app-level (T18) · legajo ampliado (A1) · adjuntos (B4) · tracking de cambios (A2) · **ownership Pieza 2** (app-level) · **export estandarizado** (4 módulos).
- **Pendientes desbloqueados (se pueden atacar ya):** **selector de empleado en la UI** de listados de vacaciones/ausencias (el backend ya soporta el filtro por empleado) · **proyectos: asignar por área** (bulk insert).
- **Bloqueados por insumo externo:** import vacaciones (falta el **Excel real** de ejemplo) · import objetivos (**rediseño del modelo**: cuelgan de `user`, no de empleado) · import + **módulo de evaluaciones de desempeño** (módulo nuevo).
- **Pendiente de verificación:** **prueba funcional exhaustiva end-to-end** (la **ficha del empleado + adjuntos nunca se probaron** en vivo; bloqueos por período tampoco) · **S6** (limpieza del campo Roles: DROP `cargo`/`rol` + quitar fallbacks) · **decisión trigger DB vs captura app-level** de auditoría (hoy app-level).

---

## Deuda técnica conocida

### Líneas (archivos over-limit)
**Backend** (medido con `.Count`): `reporte_generators` 249, `integracion_service` 201, `empleado_repo` **174**, `reporte_anual` 154 · repos: `ev_instancias_repo` 146, `ev_plantillas_repo` 129, `nomina_repo` 107, `proyectos_repo` 104. (`costo_repo` 135 y `assessment_repo` 130 figuran over-limit pero son **archivos legacy sin callers** — candidatos a borrar, no a refactorizar.) `_audit_payloads_rrhh` en **186/200** — helper "otros", bajo límite pero creciendo con cada evento nuevo. Nota: `reporte_export_service` ya **no** está over-limit (40 líneas reales; sigue wired en `routers/reportes.py`).
**Frontend (límite 150, ~46 archivos over-limit; medido con `.Count`):** peores — `sucesion/page.tsx` 869, `costos/page.tsx` 618, `vacantes/[id]/page.tsx` 577, `reportes/page.tsx` 539, `onboarding/templates/[id]/page.tsx` 412, `onboarding/page.tsx` 410, `configuracion/page.tsx` 390, `costos/ImportarNominaCSVModal.tsx` 377, `evaluaciones/PlantillasTab.tsx` 336, `vacaciones/page.tsx` 304, `ausencias/page.tsx` 301, `empleados/page.tsx` 299, `evaluaciones/CiclosTab.tsx` 297, `offboarding/page.tsx` 292, `costos/NominaModal.tsx` 287, `evaluaciones/EvaluacionesTab.tsx` 286, `areas/page.tsx` 261, `empresas/[id]/page.tsx` 230, `vacantes/page.tsx` 217, `empresas/page.tsx` 204 · + ~26 más entre 152 y 268 (incl. `ui/dropdown-menu.tsx` 268, `evaluacion/[token]/page.tsx` 258, `vacantes/VacanteModal.tsx` 251, `layout/AIPanel.tsx` 249, `inventario/ItemsTab.tsx` 152). **Resueltos:** `empleados/[id]/page.tsx` (289 → 131 tras el refactor de la ficha), `objetivos/page.tsx` (167 → 149, bajo límite).
- **Services cerca del límite 150 (margen ≤4, verificado `.Count`):** `ausencias_service.py` **148** (+ownership escrituras), `ev_instancias_service.py` **146**. `vacaciones_service.py` bajó a **139** al extraer `get_saldo` a `services/_vacaciones_saldo.py` (división forzada por sumar ownership). El próximo cambio a ausencias/ev_instancias exige dividir primero.
- División = tarea de refactor propia (diagnóstico → implementación archivo por archivo, peores primero). NO mezclar con features. El `Pagination.tsx` de T18 sirve para refactorizar los listados over-limit.
- ✅ **`Sidebar.tsx` resuelto**: se dividió en acordeón (secciones colapsables) → `Sidebar.tsx` (144), `NavGroup.tsx` (56), `NavItem.tsx` (35), `ThemeToggle.tsx` (24), `EmpresaSelector.tsx` (68) + `nav-config.ts` (66, define `NAV_GROUPS`). Todos bajo 150 (medido con `.Count`).

### Routers cerca del límite (RE-MEDIDO con `.Count`)
- `routers/ausencias.py` (79) y `routers/inventario_items.py` (79) — margen 1. `routers/empleados.py` (74), `routers/vacaciones.py` (73), `routers/empresa.py` (64) — con margen. **La antigua nota de "vacaciones/ausencias/empresa en 80/80 margen cero" quedó DESACTUALIZADA** (re-medido: ninguno está en 80).

### Audit log (T18)
- `auditoria.tabla` es columna legacy (= `entidad` internamente). Drop column o drop NOT NULL = deuda futura.
- `ip`/`user_agent` quedan NULL. Poblar desde el middleware si se necesita (exigiría pasar datos del request al service).
- Retención/particionado del audit: diferido. Revisar cuando el volumen lo justifique.
- ✅ **`000_run_all.sql` ya no es riesgo**: el consolidado está **DEPRECADO con guard que aborta** ("NO EJECUTAR"); la reconstrucción de la base se hace desde `db/schema.sql`. La vieja deuda de "reintroduce los triggers viejos de auditoría al re-bootstrapear" quedó neutralizada.
- Evento de audit **usuarios**: `alta_usuario`, `baja_usuario`, `cambio_password` YA implementados (ABM usuarios, Pieza 1). Sin datos sensibles en el payload (nunca la contraseña).
- Importación CSV: si se audita, evento único por lote — NO fila por fila.

### Importación CSV (T18.6)
- Los archivos viejos (`empleado_import_repo.py`, `_empleado_import_utils.py`, `ImportarCSVModal.tsx` con `import/` UploadStep/PreviewStep/ConfirmStep/ResultStep) **fueron reemplazados** por el naming `nomina_*` (ver sección "Importación CSV" arriba). Ya no existen.
- `empleado_repo.find_by_dni` y `find_by_legajo` están **VIVOS** (la vieja duda de "sin callers" quedó descartada): `find_by_dni` lo usan `nomina_csv_service.py` y `nomina_empleados_service.py`; `find_by_legajo` lo usa `_empleados_utils.py`.

### Campo Roles (S1–S5)
- ✅ **`EmpleadoModal.tsx` resuelto**: se dividió en `components/features/empleados/modal/` (`DatosPersonalesFields`, `DatosLaboralesFields`, `OrganizacionSelects`, `TextFields`, `AutocompleteFields`/`AutocompleteInput`, `_constants.ts`, `form-utils.ts`, `useEmpleadoFormData.ts`); el orquestador `EmpleadoModal.tsx` quedó en **150** (en el límite, ya no 402).
- ⚠️ **Compactación de routers — RE-MEDIDO, ya NO urgente**: los conteos viejos (vacaciones/ausencias/empresa en 80/80) estaban desactualizados. Medido con `.Count`: `ausencias.py` 79, `inventario_items.py` 79, `empleados.py` 74, `vacaciones.py` 73, `empresa.py` 64. Ninguno en el límite. Ver "Routers cerca del límite" abajo.
- ⚠️ **Conteos de líneas históricos posiblemente subestimados**: hasta A4, Claude Code midió con `Measure-Object -Line` (descarta líneas en blanco); el límite cuenta líneas reales (`.Count`). Caso detectado: `page.tsx` reportada en 142/146 estaba realmente en 164 (over-limit) — corregida a 127 real en A4. **Al hacer la compactación de routers, re-medir TODO con `.Count`** y no fiarse de los números viejos. Los componentes nuevos (reportados 34–96) probablemente sigan OK; los que estaban al filo (routers, `EmpleadoModal` 402) podrían estar peor.
- `roles-conocidos` aplana en Python (PostgREST no expone `unnest` sin RPC). OK por volumen; migrar a RPC/vista materializada si crece.
- Fallbacks `roles[0] ?? cargo` activos en lecturas (S2) — se quitan en S6.

### Tests
- Bloque `_TEST_ENV` (setup de env vars) duplicado en varios archivos de test. Candidato a `conftest.py` central. Cosmético.
- `tests/test_escrituras_ownership.py` en **257** (sobre el "otros" 200). **Aceptable por precedente** (`test_usuarios.py` 314); los archivos de test no se sujetan estrictamente al límite en este repo. Recortar si molesta.

### Bloqueo por período (overlap)
- `monthrange` en `costo_service.cargar_nomina` es **código muerto** mientras costos pase `rol=None` al enganche: la guarda `rol != "mandos_medios"` retorna antes de evaluar el rango. La expansión mes→[día 1, último día] **no la cubre ningún test** (`test_nomina_no_bloquea_con_periodo_cerrado` pasa por la guarda de rol, no por el overlap). Si costos llega a pasar un rol real, esa expansión entra en juego sin red.
- La guarda "sin fecha → no evalúa" de `verificar_periodo_abierto` no tiene test propio. Riesgo: un call site que olvide pasar fechas queda sin bloqueo y en silencio (fue exactamente el modo de falla de la semántica vieja).

### Otras (heredadas)
- Rate-limiter de BCRA no implementado (otro proyecto — no aplica a Sofia).
- `permisos.ts` es espejo manual de `permisos.py` — riesgo de divergencia.
- `middleware/auth.py` (manejo del header `X-Empresa-Id`, ~líneas 133-141) acepta cualquier UUID **con formato válido** sin verificar que la empresa exista en la tabla `empresas` (higiene de input, baja prioridad).

---

## Git
- Operar siempre desde `RRHH/Sofia/`.
- **Commits los hace Franco manualmente** (nunca Claude Code). Commits y push están desacoplados: no hay push a GitHub hasta que Franco lo decida. Preferir commits por sub-sesión sobre commits por tarea entera.
- Formato de commits: convencional (`feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`).
- **Nota de despliegue (estable):** la migración 059 (campo Roles) + S3 + S5 van **juntas** a producción — correr 059 sola rompe alta/import de empleados. Producción puede driftear de las migraciones versionadas (varias migraciones recientes, ej. 072–074, versionan retroactivamente cambios que ya vivían en prod) — verificar siempre contra el schema vivo.