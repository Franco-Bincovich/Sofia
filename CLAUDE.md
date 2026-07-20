# CLAUDE.md — Sofia (HR Karstec)

> **Ubicación:** este archivo va en la **raíz del repo Sofia** (`RRHH/Sofia/`), desde donde se ejecuta `claude`. Claude Code lo lee al inicio. Sofia tiene su propio `.git` dentro del mono-repo RRHH — **todas las operaciones git corren desde `RRHH/Sofia/`, nunca desde `RRHH/`**.

## Documentos de planificación (leer al inicio)
La dirección del producto y el schema están en estos documentos. **Tienen prioridad sobre la memoria.**

- @docs/MODELO_DATOS.md — **fuente de verdad del schema** (si algo contradice una tabla, manda este doc)
- @docs/PLAN_DESARROLLO_AHORA.md — qué construimos ahora
- @docs/PLAN_DESARROLLO_DESPUES.md — qué construimos después

---

# 🎯 FOCO ACTUAL — Cierre de Entrega 2

## ✅ FASE 0 — CERRADA (bugs silenciosos de filtros + gate de build)

Cinco ítems. Tres bugs reales corregidos, uno descartado con evidencia, y el gate de
build de producción destrabado.

- **BUG 1 ✅ Export de Ausencias ignoraba los filtros.** El service forzaba
  `area_id=None, tipo_id=None` — RRHH filtraba en pantalla y el archivo salía con
  TODO. Además tiraba UUIDs crudos (único módulo sin helper). Se creó
  `services/_ausencias_export.py` y se extendió `api.ts::descargarArchivo` con
  `params?` opcional (base del estándar de export de Fase 1). Ownership verificado en
  4 casos, incluido fail-closed con área ajena.
- **BUG 2 ✅ Paginación rota en Horas de proyectos.** `fetchHoras` nunca mandaba
  `page`/`page_size` → tope de 20 registros. Cableado con `Pagination.tsx`. El
  resumen de cabecera se desambiguó: el conteo usa el total del proyecto, las sumas
  se etiquetan como "esta página".
- **BUG 3 ✅ Filtro fantasma "posición" en Sucesión.** El param viajaba
  front→router→service y se descartaba antes del repo. **Salida (b): se quitó de
  toda la cadena**, porque no era un filtro a medio conectar sino una feature nunca
  especificada (el control era texto libre sin vocabulario, y "compatibilidad con una
  posición" no está implementada en ningún lado). Copy del modal corregido a
  "Análisis por área".
- **BUG 4 ✅ TEÓRICO — cerrado sin tocar código.** Filas legacy invisibles al filtrar
  en Auditoría: **0 filas** con `entidad`/`evento` NULL o vacío sobre 126 totales, y
  ninguna ruta viva puede generarlas (triggers dropeados en 058 + captura app-level
  siempre setea ambos). Se descartó agregar el filtro simétrico: código defensivo
  contra un escenario imposible. Dato colateral útil: `tabla` = `entidad` en las 126
  filas (espejo 1:1).
- **BUG 5 ✅ `tsc` de 20 → 0 y `next build` de rojo a verde.** Ver sección dedicada
  abajo — el hallazgo más importante de la fase.

## ✅ FASE 1 — CERRADA (patrones compartidos)

- **1.1 — Resolver de empleado unificado.** `resolver_empleado_ids` (ownership ∩ área ∩
  empleado) se movió de `_vacaciones_export.py` a `services/_ownership_filter.py`.
  Reubicación pura, cuerpo byte-idéntico. Los tres resolvers no divergían: se componen
  en cadena. **Es el único resolver que hay que usar** — no escribas variantes.
- **1.2 — Paridad de export.** Invariante establecido **sin excepciones**: *el endpoint
  de export acepta los mismos Query que el list*. Aplicado a los 6 módulos con export
  (vacaciones, inventario ítems, inventario asignaciones, objetivos, evaluaciones,
  capacitaciones) + helper `_capacitaciones_export.py` nuevo.
- **1.3 — `components/ui/FiltersBar.tsx`** (52 líneas). Presentacional y controlado, 3
  tipos (`select`/`search`/`date`), labels visibles. **No fetchea, no debouncea, no
  tiene estado propio** — eso queda en la página. ⚠️ Su ahorro real es ~12 líneas por
  página, no ~27: **no sirve para destrabar divisiones**, sirve para no re-inflar al
  agregar filtros y para consistencia visual.

## ✅ FASE 2 — CERRADA (núcleo empleado)

Los tres módulos que más usa RRHH quedaron con filtros completos, paginación real,
export fiel a lo que se ve, y las tres páginas bajo el límite de líneas.

- **2.1 Ausencias** — filtro por empleado (cadena completa, no existía) · paginación
  (se cortaba en 20 filas en silencio) · división previa: write path a
  `services/_ausencias_write.py` y catálogo de tipos a `routers/ausencias_tipos.py` ·
  `page.tsx` 318 → **141** (`AusenciasTable.tsx` + `useFiltrosAusencias.ts`).
- **2.2 Vacaciones** — filtro por empleado · **`estado` pasó a server-side** (era el
  último "export que miente" del repo: filtraba en memoria y el archivo salía con todos
  los estados) · paginación · `page.tsx` 305 → **148** (`VacacionesTable.tsx` +
  `useFiltrosVacaciones.ts`).
- **2.3 Empleados** — filtro de área en la UI · **export nuevo, no existía** (23
  columnas, `services/_empleados_export.py`) · `Pagination.tsx` reemplaza el pager
  inline · `page.tsx` 299 → **108** (`EmpleadosTable.tsx` + `useFiltrosEmpleados.ts`).
- **2.4 Proyectos — asignación multi-selección.** `POST
  /{proyecto_id}/asignaciones/bulk` con éxito parcial clasificado (patrón nómina: no
  aborta, reporta). El single queda intacto. **El área filtra, no asigna** — asignar el
  área completa en bloque está descartado por producto.
- **2.5 Tests** — `tests/test_empleado_service.py` (10 tests: CRUD, whitelist de update,
  paginación, errores). Suite: **206 passed**.

## Pendiente

1. **Evaluaciones** — Franco ya tiene los Excel. Falta **definir qué entra al sistema y
   en qué formato** antes de tocar código. Conversación, no implementación.
2. **Imports de vacaciones y ausencias** — bloqueado, falta el Excel de RRHH.
3. **Reportes y KPIs** — definición pendiente de recuperar de conversaciones previas.
4. **Deploy** — ver la sección de build más abajo.

---

Todo el trabajo de esta etapa entra en cuatro frentes. Lo que no esté acá, no se toca.

### 1. Filtros + export en TODA sección con datos de empleados
**Estándar transversal, no un parche puntual.** En cada módulo que muestre información de empleados:
- Todos los filtros posibles disponibles en la UI (empresa, área, empleado, estado, tipo, fechas, y los que apliquen por módulo).
- El **export sale siempre con los filtros aplicados** — lo que se ve en pantalla es lo que sale en el archivo.

Objetivo de negocio: que RRHH obtenga cualquier corte de información, con el máximo detalle, sin pedirle nada a desarrollo.

Estado del terreno (relevado sobre 18 superficies, ver "Mapa de filtros y export" abajo): Vacaciones ya soporta `empleado_id` en service, repo y export, pero **el router de listado no lo expone y el front no lo tiene**. Ausencias **no soporta `empleado_id` en ninguna capa** (`ausencias_service.get_all` no lo acepta) — su export sí quedó corregido en Fase 0. **16 de 18 superficies no tienen export.**

### 2. Imports de Vacaciones y Ausencias
Mínimos pero funcionales, para que RRHH tenga toda la información en un solo lugar.

⚠️ **Realidad del repo:** NO existe ningún camino de import Excel. El único import que hay es **CSV con `csv.DictReader` de stdlib** (los dos flujos de nómina). `openpyxl` aparece solo en **export** (`services/export/_excel.py`). Por lo tanto esto no son "dos features chicas": es **una base de import compartida** (reader XLSX + flujo preview/confirmar genérico, moldeado sobre `nomina_csv_service` + `nomina_import_repo`) y después dos consumidores.

**Bloqueado hasta tener los archivos reales de ejemplo de RRHH** (vacaciones y ausencias). Sin eso no se define el parser.

Import de **ausencias no fue auditado** todavía — confirmar su estado en el diagnóstico antes de planificar.

### 3. Proyectos — asignación multi-selección de empleados
Hoy se asigna **un empleado por vez** (`POST /api/proyectos/{id}/asignaciones`, insert single, `AsignacionModal` con select único).

Lo que se construye: **elegir varios empleados a la vez y guardar una sola vez.**
- El **área es un filtro** de la lista de candidatos, NO el criterio de asignación. Dentro de un área puede haber gente que aplica al proyecto y gente que no.
- ❌ **Descartado explícitamente:** asignar el área completa en bloque.
- No hace falta tocar DDL: `proyecto_asignaciones` no necesita `area_id`; el área ya vive en el empleado y se resuelve en el service.

### 4. Tests
- **Adjuntos E2E real contra Supabase Storage.** Los 11 tests de `test_adjuntos.py` son unit con `_FakeRepo` y storage monkeypatcheado (sin red) — el flujo real nunca se ejecutó.
- **Ficha del empleado** — no existe `test_empleado*.py`. `test_critical_flows.py` toca empleado a nivel unit, no la ficha ni el CRUD E2E.
- Fuera de scope por ahora: cobertura de frontend (**0 tests en todo el front**, no existe ningún `.test`/`.spec`).

### Fuera del foco — NO tocar en esta etapa
- **S6 / DROP de `cargo` y `rol`** → **NO se borra nada.** Decisión de producto. Las columnas y los fallbacks quedan como están.
- **Campo `equipo`** (texto libre en el legajo) → al margen. Sin tabla `equipos`, "asignar/importar por equipo" no existe como opción.
- **Import de objetivos** → al margen. Además está bloqueado por modelo (los objetivos cuelgan de `users` vía `responsable_id`, no de empleado).
- **Evaluaciones (módulo + import)** → pendiente de **definición de negocio**: qué información entra al sistema y en qué formato. Conversación aparte antes de tocar código.
- **Tablas huérfanas** → se limpian **después del cutover a AWS**, no ahora (dropearlas implica migración nueva + regenerar `db/schema.sql` en plena migración).

---

## Qué es este proyecto
Sofia es el repositorio interno del producto **HR Karstec**: plataforma de gestión del ciclo de vida del empleado, **multiempresa** (2–5 empresas simultáneas), operada por un equipo de RRHH de 3 personas. Reporting con IA vía Claude Sonnet. Live en hrkarstec.site.

## Stack
- **Backend**: Python 3.11 + FastAPI. Arquitectura por capas **router → service → repository** (NO hay capa de controllers).
- **Frontend**: Next.js 16.2.4 (App Router) + TypeScript + Tailwind v4 + Shadcn/ui.
- **DB**: Supabase (PostgreSQL + Auth + Storage), con RLS. (En el destino AWS/RDS **no habrá RLS** — seguridad app-level.)
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
├── db/schema.sql        ← FUENTE DE VERDAD de reconstrucción (47 tablas, 310 constraints, 220 índices)
├── migrations/          ← SQL versionado (van por 074 en backend/; 075–077 viven en migracionAWS/)
└── tests/
```

**Salud de base (cerrada):** migraciones 072/073/074 corrigen drift de producción. `db/schema.sql` es la fuente de reconstrucción (probado en Postgres limpio). `000_run_all.sql` **deprecado con guard que aborta**. `db/README.md` documenta el bootstrap. Las 74 migraciones quedan como historial auditado (sin basura, sin huecos). ⚠️ `schema.sql` **no incluye los 36 triggers `updated_at`** — se recrean aparte (migración 077 en staging).

**Migraciones recientes (059–074):**
- **059** `empleados_roles` — columna `roles TEXT[]` (unifica `cargo`+`rol` en un multi-valor).
- **060** `empleados_legajo_ampliado` — 17 columnas del legajo real: `tipo_documento, sexo, telefono_alternativo, domicilio, estudios, ubicacion, turno, horas_contrato (INTEGER), organismo, gerencia, sector, seniority, perfil, categoria, modalidad_contratacion, referido, es_lider (BOOLEAN DEFAULT FALSE)`.
- **061** `adjuntos` · **062** `periodos_cerrados` · **063** `add_must_change_password` · **064** `empleados_campos_nomina` · **065** `tipo_contrato_texto_libre` · **066** `create_cesiones` · **067** `vacantes_campos_publicacion` · **068** `adjuntos_es_principal` · **069** `vacantes_info_puesto` · **070** `vacantes_requisitos_texto` · **071** `candidatos_sobreviven_vacante` · **072** `drop_fk_compuesta_candidatos_vacante` · **073** `drop_unique_huerfano_vacantes` (72/73 corrigen drift de prod) · **074** `retrofit_empresa_id_dni_empleados`.

## Convenciones de código
- Seguir ORDEN-Y-LEGIBILIDAD.md, SEGURIDAD-PENTEST.md, BASES-DE-DESARROLLO.md y UX-UI.md de la agencia.
- Errores: siempre `AppError(message, code, status_code)`.
- Logs: solo eventos de negocio importantes. Sin `print()` / `console.log()` — logger centralizado.
- Config: solo vía `settings`, nunca `os.environ` directo.
- **Límites de líneas (estrictos)**: router 80 · service 150 · repository 100 · componente React 150 · hook 80 · otros 200.
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
12. Cortar las sub-tareas por módulo cuando hay división de archivos de por medio.
13. Cuando se pide un diagnóstico, devolver SOLO el diagnóstico (read-only). Cuando se pide implementación, escribir código — no devolver otro diagnóstico.
14. **Cada repo nuevo que se escriba ahora es un repo más a portar a asyncpg** (hoy son 43). Priorizar wires sobre repos existentes; si hay que crear uno nuevo, moldearlo sobre `migracionAWS/empleado_repo_NEW`.

---

## Modelo de roles funcionales (T16 — COMPLETO)
Tres roles, definidos en `utils/permisos.py`:
- **admin_rrhh** — lectura + escritura en todo.
- **gerencia_lectura** — lectura en todo, escritura en nada.
- **mandos_medios** — lectura + escritura solo en VACACIONES y AUSENCIAS; sin acceso al resto.
- Rol desconocido / None → **fail-closed** (sin acceso).

Núcleo: `puede(rol, seccion, accion) -> bool`, `require_permission(seccion, accion)` dependency factory que lanza `AppError(..., "FORBIDDEN", 403)`. Enum `Seccion` con 26 valores. `MANDOS_MEDIOS_SECCIONES = frozenset({VACACIONES, AUSENCIAS})`. ~168 gates `Depends(require_permission(...))` inline. Espejo frontend en `frontend/services/permisos.ts`. Sidebar filtra `NAV_GROUPS` por permiso, AuthGuard gatea por ruta, el hook `useCanWrite` oculta botones de escritura.

**Decisión de producto (T17 NO APLICA):** todo usuario, sin importar rol, accede a TODAS las empresas. No existe "usuario limitado a ciertas empresas". No reabrir.

---

## Audit log app-level (T18 — COMPLETO)
Sistema de auditoría con captura **app-level** (no triggers DB). Backend (commit `92d5edf`) + UI (commit `8646a9b`).

**Modelo:** tabla `auditoria` (migración 024, extendida por 058): `id, tabla, registro_id, accion (CHECK INSERT|UPDATE|DELETE), datos_anteriores JSONB, datos_nuevos JSONB, usuario_id, ip, user_agent, created_at, empresa_id, entidad, evento`. Inmutable. RLS de SELECT: `auditoria_select_admin_gerencia`. Los triggers DB viejos fueron **dropeados** en 058.

`AuditService.registrar(...)` keyword-only, síncrono, **traga todo error**. `audit_repo` (insert + listar con filtros/paginación). Payloads canónicos en `services/_audit_payloads*.py`.

**Eventos instrumentados (21):** alta/update/baja_empleado · cancelacion_vacacion · alta/update/baja_ausencia · inicio_offboarding · devolucion_activo · carga_nomina · set_presupuesto · alta_empresa · toggle_empresa_activa · alta/baja_adjunto · cierre/reapertura_periodo · importacion_empleados · alta/baja_usuario · cambio_password.

**UI:** ruta `/auditoria` (admin/gerencia) + `components/features/auditoria/` + `components/ui/Pagination.tsx` (reutilizable).

---

## Importación CSV (T18.6 — COMPLETO) — y el molde para los imports nuevos
Importación masiva por CSV, con **dedup por DNI**. Dos flujos separados, ambos gateados con `Seccion.IMPORTACION + Accion.WRITE` (solo admin_rrhh).

**Flujo 1 — Nómina de empleados (single-shot, sin preview).**
`routers/importacion_nomina_empleados.py` → `services/nomina_empleados_service.py` + `services/_nomina_empleados_transforms.py` + `schemas/importacion_nomina_empleados.py`. CSV real: 27 columnas, separador `;`, encoding `latin1`. Idempotente y tolerante: dedup por DNI, no aborta ante error de fila, clasifica en 3 grupos (OK · con faltantes · no cargadas). Un evento de auditoría por lote. UI: `ImportarNominaModal.tsx` + `NominaResultView.tsx`.

**Flujo 2 — Nómina de costos (preview + confirmar).**
`routers/importacion_nomina.py` (`/nomina/preview`, `/nomina/confirmar`) → `services/nomina_csv_service.py::parse_nomina_csv` + `repositories/nomina_import_repo.py` + `schemas/importacion.py`. Resuelve DNI→empleado y detecta duplicados por `(anio, mes)`. UI: `ImportarNominaCSVModal.tsx`.

> **Este Flujo 2 es el molde de la base de import compartida** (foco actual, punto 2). Lo que falta agregar es el **reader XLSX** — hoy `openpyxl` solo se usa para export.

---

## Campo Roles multi-valor en empleados (S1–S5 COMPLETO · S6 NO SE EJECUTA)
Unificación de `cargo` + `rol` en un único campo **`roles TEXT[]`** (migración 059). Principal = `roles[0]`. CHECK `array_length(roles,1) >= 1`. Texto libre con autocompletado compartido entre empresas (`empleado_roles_repo.get_roles_conocidos`).

**Estado:** S1 ✅ · S2 ✅ (lecturas `roles[0]` con fallback `?? cargo`) · S3 ✅ (`RolesInput` chips + endpoint `roles-conocidos`) · S4 ✅ (audit) · S5 ✅ (import).

**S6 — DECISIÓN: NO SE EJECUTA.** `cargo` y `rol` **no se dropean**. Los 7 fallbacks de backend y los 6 del front **quedan**. Los campos siguen en `schemas/empleado.py` y `types/empleado.ts`. (Contexto técnico, para el día que se retome: la auditoría confirmó 0 escritores y todos los lectores roles-first, así que el drop sería seguro. Pero es decisión de producto no tocarlo.)

**⚠️ Despliegue:** la migración 059 deja `roles NOT NULL`. En producción, **059 + S3 + S5 van JUNTAS**.

---

## ABM de usuarios del sistema (Pieza 1 — COMPLETO)
Gestión de usuarios, **solo admin_rrhh** (`Seccion.USUARIOS + WRITE`). El rol se elige en el alta, validado contra `ROLES_VALIDOS`.

**Endpoints (`routers/usuarios.py`):** `POST /api/usuarios` (alta + contraseña temporal devuelta una sola vez, `must_change_password=true`, `empleado_id` opcional) · `DELETE /api/usuarios/{user_id}` (auto-eliminación bloqueada) · `POST /api/usuarios/cambiar-password` (self-service, sin gate de rol, id del token) · `GET /api/usuarios` (listado).

**Backend:** `schemas/usuario.py`, `services/usuario_service.py` (alta atómica por rollback), `repositories/usuario_repo.py`, `tests/test_usuarios.py`. Migración 063. Contraseñas nunca en logs.

**Frontend:** ruta `/usuarios` gateada. `components/features/usuarios/` + `components/ui/ConfirmDialog.tsx`. El selector de empleado a vincular filtra por `es_lider=true`. Cambio de contraseña forzado y voluntario ✅.

---

## Ownership de mandos_medios (Pieza 2 — COMPLETO, app-level)
Un `mandos_medios` ve y gestiona **solo su gente**: subordinados directos por `empleados.manager_id` + su propio registro. "A cargo" = `manager_id`, NO área ni `es_lider`.

**Criterio centralizado en `services/ownership.py`** (reusar, no reimplementar):
- `ids_empleados_visibles(user_id, rol, repo) -> None | [] | [ids]` — `None` = sin restricción; `[]` = no ve nada (fail-closed); `[ids]` = exactamente esos.
- `puede_gestionar_empleado(...)` — guard de escritura por fila.
- Repo dedicado `repositories/empleado_ownership_repo.py` (`find_by_user_id`, `ids_subordinados`, `ids_empleados_por_area`).

**Aplicado en Vacaciones y Ausencias:** listados (vía `_ownership_filter.resolver_filtro_empleados`, intersección ownership ∩ área), export, y 5 escrituras (CREAR → `OWNERSHIP_DENIED` 403; CANCELAR/EDITAR/BORRAR → 404 para ajeno).

⚠️ **Al construir el estándar de filtros+export (foco 1), todo filtro nuevo se compone POR INTERSECCIÓN con el ownership** — nunca lo reemplaza.

**Falta:** RLS a nivel DB (en AWS no va a existir; queda como app-level definitivo). Tests: `test_ownership.py`, `test_listados_ownership.py`, `test_escrituras_ownership.py`, `test_vacaciones_export.py`.

---

## Export estandarizado (base construida — se extiende en el foco 1)
Los 4 sub-módulos proyectan **columnas legibles sin UUIDs crudos** (nombres resueltos, fechas dd/mm/aaaa, booleanos Sí/No), vía `services/_<modulo>_export.py::construir_filas_export(items)`. El motor genérico (`services/export/`, `build_export`) **NO se toca**.
- **Vacaciones** (`_vacaciones_export.py`) — filtra por área/empleado con ownership.
- **Ausencias** (`_ausencias_export.py`) — **creado en Fase 0**. Aplica `area_id` y `tipo_id`, columnas legibles (incluye `Justificada` Sí/No). Compone por intersección con ownership.
- **Inventario asignaciones** (`_inventario_export.py`) e **ítems** (`_inventario_items_export.py`).
- **Evaluaciones** (`_evaluaciones_export.py`) y **Objetivos** (`_objetivos_export.py`) — sin ownership.

**`services/api.ts::descargarArchivo` acepta `params?: Record<string,string>` opcional** (agregado en Fase 0, retrocompatible, filtra vacíos y mergea con `formato`). Es la base del estándar — usalo, no dupliques fetch+blob.

**Export de Empleados** (`_empleados_export.py`, creado en Fase 2.3): 23 columnas, cero UUIDs, `roles[]` como texto separado por coma, nombres resueltos por los joins embebidos del `_SELECT` del repo (cero N+1). Omite a propósito las columnas de texto libre esparso de la migración 060 (domicilio, estudios, turno, organismo, perfil, etc.) — agregarlas es una línea si RRHH las pide.

## Patrón de página de listado (establecido en Fase 2 — copialo)
Las tres páginas del núcleo quedaron con la misma estructura, y es el molde para
cualquier listado nuevo o para dividir los que faltan:

```
app/(dashboard)/<modulo>/page.tsx        ← orquestador delgado (<150)
  estado page/total + modales + load + handlers CRUD + render
components/features/<modulo>/<Modulo>Table.tsx   ← presentacional (loading/error/empty)
components/features/<modulo>/useFiltros<Modulo>.ts ← estado de filtros + carga de
                                                     opciones + array de FiltroCampo
```

El hook recibe un `onFiltroChange` que la página cablea a `() => setPage(1)` — así el
reset de paginación queda resuelto sin acoplar `page` al hook.

**Reglas de paginación** (aprendidas de BUG 2 y repetidas en los 3 módulos): el front
manda `page`/`page_size` · `Pagination.tsx` (no escribas paginación nueva) · el pager
aparece solo si `total > pageSize` · **`page` se resetea a 1 al cambiar cualquier
filtro** · **el export NO se pagina.**

> **Foco 1 extiende esto:** el export de cada módulo tiene que recibir y aplicar **todos** los filtros del listado, no solo los que hoy soporta.

---

## Otros módulos en el código (referencia rápida)
- **Selección — Vacantes + Candidatos:** `routers/vacantes.py` + `routers/candidatos.py` (+ `_candidato_form.py`, formulario público sin auth), `services/vacante_service.py`, `candidato_service.py`, `cv_service.py`. Integraciones: `zernio_service.py`, `gmail_service.py`, LinkedIn. Front en `app/(dashboard)/vacantes/` y `candidatos/`.
- **Cesiones** (migración 066): entidad hija de empleado. `routers/cesiones.py` → `cesion_service.py` → `cesion_repo.py`, gateado por `Seccion.EMPLEADOS`, audita alta/update/baja. Vive en la ficha del empleado.
- **Proyectos:** `routers/proyecto_asignaciones.py` (POST single `asignar_empleado`), `services/asignaciones_service.py`, `repositories/proyectos_repo.py`. Front: `AsignacionModal.tsx` (select único) → `EquipoTab.tsx` → `services/proyectos.ts`.

## Staging de migración a AWS (`migracionAWS/`)
Carpeta **aislada** para la migración de Supabase a **AWS (asyncpg/RDS + S3)**. Código nuevo **sin tocar `backend/`** en producción. Contiene `*_NEW.py` (auth completo: `auth_service`, `token_service`, `token_repo`, middleware; `postgres_client.py` asyncpg; repos-molde `empleado_repo_NEW` + `empleado_lookup_repo_NEW`) + migraciones **075** (password_hash), **076** (refresh_tokens), **077** (recrear 36 triggers `updated_at`) + docs (`MIGRACION_A_RDS.md`, `README_AUTH.md`). El otro dev ejecuta la infra.

**Decisiones cerradas:** se recrean los triggers · **NO hay RLS** (seguridad app-level) · no se carga demo data.

**Minas ya desactivadas (documentadas para el otro dev):** asyncpg devuelve UUID nativos → cast `str()` explícito en mappers · FK `users.id → auth.users(id)` bloquea INSERT sin Supabase (dropear + `DEFAULT gen_random_uuid()`) · el `ON DELETE CASCADE` contra `auth.users` es lógica de negocio viva · `passlib` roto (bcrypt 5.0 sacó `__about__`) → usar `import bcrypt` directo · `schema.sql` no trae los 36 triggers `updated_at`.

---

## Estado actual del proyecto

### Entrega 1 — COMPLETA (63h, 15 tareas).

### Entrega 2 — EN CURSO (ver **FOCO ACTUAL** arriba)

**Cerrados:**
- **T16** roles funcionales ✅ · **T17** ❌ NO APLICA (decisión de producto) · **T18** audit log app-level ✅ · **T18.6** importación CSV (2 flujos) ✅
- **Campo Roles multi-valor** S1–S5 ✅ (S6 no se ejecuta)
- **ABM usuarios (Pieza 1)** ✅ · **Ownership mandos_medios (Pieza 2)** ✅ app-level · **Export estandarizado** ✅ (4 módulos)
- **Tanda A — ficha del empleado** A1/A2/A3/A4 ✅ (legajo, tracking de cambios, inventario, vacaciones en la ficha)
- **Adjuntos** (B4) ✅ · **Bloqueo por período** ✅ (semántica de overlap contra la fecha del registro, 4 archivos + 25 tests en verde) · **Salud de base** ✅

- **Fase 0 — bugs silenciosos de filtros + gate de build** ✅ (5 ítems, ver arriba)

**En construcción:** Fase 1 (patrones compartidos) → Fase 2 (núcleo empleado) · imports vacaciones/ausencias · multi-selección en proyectos · tests de adjuntos E2E y ficha.

**Al margen por decisión:** S6 (`cargo`/`rol`) · campo `equipo` · import de objetivos · tablas huérfanas.

**Pendiente de definición de negocio:** módulo de evaluaciones + su import — qué entra y en qué formato.

---

## Hallazgos de la auditoría de contraste (relevamiento read-only)

### Import: 0% construido en los tres módulos auditados
Vacaciones, Objetivos y Evaluaciones cortan en la capa (a): **sin parser, sin endpoint, sin UI**.
- `routers/vacaciones.py` (74): solo GET list/exportar/saldo/empleado/{id}, POST create-uno, PUT cancelar — sin `UploadFile`.
- `routers/objetivos.py` (79) sin import. Además el modelo no cuelga de empleado (`schema.sql:983` `empresa_id`→empresas, `:984` `responsable_id`→users; migración 049: "responsable_id → users, NO empleados").
- Los 4 routers de evaluaciones (ev_instancias/plantillas/ciclos/criterios) no exponen import.

### Proyectos
- Único POST: `proyecto_asignaciones.py:32-37 asignar_empleado` (uno por `empleado_id`). `asignaciones_service.py:41-77` sin loop. Repo `:63-80` `.insert(payload)` single.
- `proyecto_asignaciones` **no tiene `area_id`** (`schema.sql:584-596`) — y no lo necesita bajo el diseño elegido.
- **Sin tabla `equipos`**; `empleados.equipo` es texto libre (`schema.sql:298`).

### Mapa de filtros y export — 18 superficies relevadas

**Dos hechos globales:**
1. **`X-Empresa-Id`** lo inyecta el front (`services/api.ts:23-25`), el middleware lo vuelve `request.state.empresa_id`, los routers lo leen con `get_empresa_id()` (`None` = consolidado). `getEmpresaActivaId()` en las páginas es **solo display**, no viaja como query. Única excepción: **áreas** manda `empresa_id` como query real (`routers/areas.py:22`).
2. **Ownership (`manager_id`) vive en SOLO 2 (+1) módulos:** vacaciones, ausencias y `dashboard_equipo`. Los otros 15 no pasan por `ownership.py` ni `_ownership_filter.py` (verificado por firma: ningún `get_all` recibe `user_id`/`rol`). El corte por rol es a nivel sección vía `require_permission`, no por fila.

**Solo falta WIRE (el backend ya lo soporta):**
- **Vacaciones · filtro empleado** — service+repo+helper+export lo tienen; falta exponerlo en el list router (`vacaciones.py:30`) + control front.
- **Empleados · filtro área** — wired end-to-end backend (`empleado_repo.py:70`); ningún caller HTTP lo usa. Falta control UI + param en `fetchEmpleados`.
- **Inventario-asignaciones · filtro empleado** — wired backend+svc+router; solo lo usa la ficha, la tab no lo expone.
- **Todos los export con helper** — el endpoint ya recibe `formato`; falta pasarle los filtros del list.

**Falta la CADENA COMPLETA:**
- **Ausencias · filtro empleado** — no existe en ninguna capa → service+router+front.
- Filtros nuevos donde el modelo los permite y no hay nada: **costos** (empleado/área), **proyectos** (nombre/fechas), **on/offboarding** (estado/empleado/fechas), **vacantes** (área/nivel/prioridad/modalidad), **candidatos** (etapa/estado/vacante), **evaluaciones** (empleado; ciclos y plantillas sin filtros).

**Export dropea filtros que el list sí acepta:** objetivos (dropea los 4), evaluaciones (dropea ciclo+estado), inventario ítems (dropea estado), inventario asignaciones (dropea empleado), capacitaciones-asignaciones (dropea los 5). Ausencias ✅ corregido en Fase 0.

**SIN export (16):** empleados, costos/nómina, proyectos, asignaciones, horas, onboarding, offboarding, cesiones, sucesión, auditoría, vacantes, candidatos, organigrama, dashboard, empresas, áreas, capacitaciones-catálogo.

**Precedente a copiar — Auditoría es el filtro más rico del repo:** 5 controles UI (`AuditFilters.tsx:25-60`) → 8 params → router con 7 Query → repo aplica todos con `.eq/.gte/.lte` + count exacto (`audit_repo.py:61-93`). Es el molde de la `FiltersBar` genérica.

**Los 3 resolvers de empleado en paralelo (a unificar en Fase 1):**
- `ownership.py:21 ids_empleados_visibles` (base).
- `_ownership_filter.py:14 resolver_filtro_empleados` (ownership ∩ área) — lo usa ausencias.
- `_vacaciones_export.py:20 resolver_empleado_ids` (ownership ∩ área ∩ empleado) — **es el superset y ya existe**, pero vive en un archivo de vacaciones. Promoverlo a helper neutral elimina las 3 variantes.

**Paginación:** `Pagination.tsx` (47 líneas, reutilizable) se usa en `auditoria/page.tsx`, `HistorialCambiosSection.tsx` y `HorasTab.tsx` (agregado en Fase 0). Ningún otro listado lo usa — los demás traen todo o cortan en el default sin navegación.

**No existe ninguna barra de filtros genérica en el front.** Cada página arma los suyos inline — es parte de por qué `sucesion`/`costos`/`vacaciones`/`ausencias` están tan infladas.

### Trabajo abandonado (no había stubs: 0 `NotImplementedError`, 0 TODO/FIXME de producto)
- **Notificaciones — ABANDONADO.** Migraciones 022+023 crean `notificaciones` + `notificaciones_config`, 0 router/service/repo/schema/front.
- **`sucesion_posiciones` — HUÉRFANA.** Migs 015+028 la crean, pero `sucesion_repo.py:44-77` lee `empleados` (potencial/desempeño) + `assessment_resultados`.
- **`configuracion_empresa` — NUNCA CABLEADA.** Mig 030; evaluaciones usa `ev_ciclos`.

### Tablas huérfanas (0 refs en repos/services) — **no se tocan hasta después del cutover**
`assessment_reportes` (L104) · `configuracion_empresa` (L197) · `documentos_empleado` (L222, superseded por `adjuntos`) · `notificaciones` (L416) · `notificaciones_config` (L428) · `sucesion_posiciones` (L645). Las otras ~42 tablas tienen consumidor confirmado.

### Ramas git
Solo `main` y `origin/main`. `git log main..<otras>` vacío. Nada olvidado en ramas.

### Cobertura de tests
- **Períodos:** 25 tests (`test_periodos.py` 15 + `test_periodos_enganche.py` 10). Falta prueba funcional en vivo.
- **Adjuntos:** 11 tests, pero con `_FakeRepo` + storage monkeypatcheado (`:4,54,92-94`). **El E2E real contra Supabase Storage nunca se ejecutó.**
- **Ficha empleado:** sin test dedicado.
- **Frontend: 0 tests en todo el repo.**

---

## ⚠️ Build de producción y estilo de código — LEER ANTES DE TOCAR NADA

### El repo NO está formateado con ruff, pese a su propio `pyproject.toml`
`pyproject.toml` declara `[tool.ruff] line-length = 100` + `[tool.ruff.format]`, pero
el código está escrito en **estilo compacto de línea larga** (firmas de una sola línea
>100 chars). Los límites de líneas documentados en este archivo se midieron sobre ese
estilo.

Correr `ruff format` reflowea archivos enteros: en Fase 0 llevó
`ausencias_service.py` de 149 → **253** y `routers/ausencias.py` de 79 → **167**, casi
todo código no tocado.

> **NO correr `ruff format` dentro de una sesión de feature o bugfix.** Adoptar ruff
> repo-wide es una tarea propia, con re-medición completa de todos los límites. Hoy
> los dos estándares miden cosas distintas.

Corolario: si `pre-commit` estuviera instalado con los hooks de
`.pre-commit-config.yaml`, esto explotaría en el primer commit. **Confirmar si está
instalado** — es una mina para el otro dev en la migración a AWS.

### `tsc` en 0 y `next build` verde (Fase 0, BUG 5)
El front arrastraba **20 errores de `tsc --noEmit`** de larga data. Como no hay tests
de frontend, `tsc` es la única red de verificación — y una red con 20 errores
permanentes no sirve, porque nadie distingue el error nuevo del ruido viejo.

**Hallazgo crítico:** no había nada silenciándolos (`next.config.ts` sin
`ignoreBuildErrors`, `tsconfig` con `strict: true`, 0 `@ts-ignore` en todo el front).
`next dev` con turbopack transpila sin type-check, por eso pasaban desapercibidos —
pero **`next build` fallaba**. El sitio vivo venía de un build anterior a esos errores.

Resuelto en 4 grupos: componentes huérfanos borrados (`OrgNode.tsx`, `OrgPanel.tsx`) ·
`ProyectoModal` con estado tipado · badge `MULTI_PROY` del organigrama que se
renderizaba sin color (bug visual real) · módulo assessment.

> **Regla:** `npx tsc --noEmit` tiene que dar **0**. Cualquier cambio de frontend se
> verifica contra ese número. Si aparece uno, es tuyo.

**Pendiente de confirmar (fuera del código):** qué repo/rama tiene conectado el
proyecto en Vercel y la fecha del último deploy exitoso. Si viene fallando hace
tiempo, es un problema aparte.

### 🚨 Módulo assessment desactivado — NO convertir el `useState` en `const`
`app/(dashboard)/assessment/[id]/page.tsx` está **desactivado a propósito**: redirige
a `/dashboard`, no renderiza y no dispara el fetch. La implementación **se conserva
completa** para cuando se reactive.

El gate es `const [moduloActivo] = useState(false)` con el setter descartado. **Tiene
que ser `useState` y NO un `const`:** TS colapsa un `const` a literal `false` por
control-flow, vuelve a marcar el cuerpo como inalcanzable, se pierde el narrowing de
`resultado` y **`next build` falla de nuevo**. El valor de `useState` es opaco al
control-flow.

Hay un comentario en el archivo explicándolo. **No lo borres y no "simplifiques" el
patrón.** De paso, la reestructura arregló una violación latente de Rules of Hooks
(los hooks estaban después de un `return` incondicional y nunca se registraban).

---

## Deuda técnica conocida

### Líneas (archivos over-limit)
**Backend** (`.Count`): `reporte_generators` 249, `integracion_service` 201, `empleado_repo` 174, `reporte_anual` 154 · repos: `ev_instancias_repo` 146, `ev_plantillas_repo` 129, `nomina_repo` 107, `proyectos_repo` 104. (`costo_repo` 135 y `assessment_repo` 130 son **legacy sin callers** — candidatos a borrar.) `_audit_payloads_rrhh` en 186/200.

**Frontend** (límite 150, ~46 over-limit): `sucesion/page.tsx` 869, `costos/page.tsx` 618, `vacantes/[id]/page.tsx` 577, `reportes/page.tsx` 539, `onboarding/templates/[id]/page.tsx` 412, `onboarding/page.tsx` 410, `configuracion/page.tsx` 390, `ImportarNominaCSVModal.tsx` 377, `PlantillasTab.tsx` 336, **`vacaciones/page.tsx` 304**, **`ausencias/page.tsx` 301**, `empleados/page.tsx` 299, `CiclosTab.tsx` 297, `offboarding/page.tsx` 292, `NominaModal.tsx` 287, `EvaluacionesTab.tsx` 286, `areas/page.tsx` 261, `empresas/[id]/page.tsx` 230, `vacantes/page.tsx` 217, `empresas/page.tsx` 204 + ~26 más entre 152 y 268.

⚠️ **`vacaciones/page.tsx` (304) y `ausencias/page.tsx` (301) son exactamente donde cae el foco 1** — sumar filtros ahí exige dividir primero. Extraer la barra de filtros a componente propio es el corte natural, y es reutilizable en los demás módulos.

**Conteos actualizados tras Fase 2:** las tres páginas del núcleo bajaron del doble del límite a estar **dentro**: `ausencias/page.tsx` 318 → **141** · `vacaciones/page.tsx` 305 → **148** · `empleados/page.tsx` 299 → **108**. `ausencias_service.py` 149 → **71** (write path extraído) · `routers/ausencias.py` 79 → **65** (tipos extraídos).

**Sigue over-limit y sin tocar:** `sucesion/page.tsx` **855** · `costos/page.tsx` 618 · `onboarding/page.tsx` 410 · `configuracion/page.tsx` 390 · `ImportarNominaCSVModal.tsx` 377 · `PlantillasTab.tsx` 336 · `CiclosTab.tsx` 297 · `offboarding/page.tsx` 292 · `NominaModal.tsx` 287 · `EvaluacionesTab.tsx` 286 · `areas/page.tsx` 261 · `assessment/[id]/page.tsx` 192 · `ArbolProyecto.tsx` 170 · `AsignacionesTab.tsx` (capacitaciones) 211 · `ItemsTab.tsx` 152 + el resto.

**Backend over-limit:** `empleado_repo.py` **174** · `ev_instancias_repo.py` 146 · `nomina_repo.py` 107 · `proyectos_repo.py` 104.

- **Services cerca del límite 150:** `costo_service.py` **150** (al límite exacto), `ev_instancias_service.py` 146, `vacaciones_service.py` **142**, `empleado_service.py` 141. **El próximo cambio a cualquiera exige dividir primero.**
- **Routers cerca de 80:** `inventario_items.py` **79** (margen 1), `objetivos.py` 79, `asignaciones_capacitacion.py` 77, `vacaciones.py` 75.
- ✅ **Resueltos:** `empleados/[id]/page.tsx` (289 → 131), `objetivos/page.tsx` (167 → 149), `Sidebar.tsx` (dividido en acordeón: 144 + NavGroup 56 + NavItem 35 + ThemeToggle 24 + EmpresaSelector 68 + nav-config 66), `EmpleadoModal.tsx` (402 → 150, dividido en `empleados/modal/`).

### Routers cerca del límite (`.Count`)
`ausencias.py` 79 y `inventario_items.py` 79 — **margen 1**. `empleados.py` 74, `vacaciones.py` 73, `empresa.py` 64.
⚠️ Agregar params de filtro a `ausencias.py` lo pasa de largo. Compactar o dividir antes.

### Audit log (T18)
- `auditoria.tabla` es columna legacy (= `entidad`). Drop = deuda futura.
- `ip`/`user_agent` quedan NULL.
- Retención/particionado diferido.
- ✅ `000_run_all.sql` deprecado con guard — ya no reintroduce triggers viejos.
- Importación: si se audita, **evento único por lote**, nunca fila por fila.

### Importación CSV (T18.6)
- Los archivos viejos (`empleado_import_repo.py`, `_empleado_import_utils.py`, `ImportarCSVModal.tsx`) fueron reemplazados por el naming `nomina_*`. Ya no existen.
- `empleado_repo.find_by_dni` y `find_by_legajo` están **vivos**.

### Campo Roles
- Fallbacks `roles[0] ?? cargo` activos en lecturas — **se mantienen** (S6 no se ejecuta).
- `roles-conocidos` aplana en Python (PostgREST no expone `unnest` sin RPC). Migrar a RPC/vista si crece.
- ⚠️ **Conteos históricos posiblemente subestimados:** hasta A4 se midió con `Measure-Object -Line` (descarta blancos); el límite cuenta líneas reales (`.Count`). **Medir siempre con `.Count`.**

### Tests
- Bloque `_TEST_ENV` duplicado en varios archivos. Candidato a `conftest.py`. Cosmético.
- `test_escrituras_ownership.py` en 257 — aceptable por precedente (`test_usuarios.py` 314).

### Bloqueo por período (overlap)
- `monthrange` en `costo_service.cargar_nomina` es **código muerto** mientras costos pase `rol=None`: la guarda `rol != "mandos_medios"` retorna antes. La expansión mes→[día 1, último día] no la cubre ningún test.
- La guarda "sin fecha → no evalúa" de `verificar_periodo_abierto` no tiene test propio. Un call site que olvide pasar fechas queda sin bloqueo y en silencio.

### Nuevas (Fase 1 y 2)
- 🚨 **`fetchEmpleados` tiene 4 opcionales posicionales del mismo tipo** (`string |
  undefined`). En 2.3 se agregó `areaId` en 5ª posición y **rompió 5 callers en
  silencio** — `tsc` dio 0 y los 196 tests pasaron, porque intercambiar dos `string |
  undefined` no es un error de tipos. Se arregló reordenando (`empresaIdOverride` 5º,
  `areaId` 6º) y verificando los 9 callers **a mano**. **Va a volver a pasar.** El fix
  real es un objeto de opciones (`{ search, estado, empresaId, areaId }`), pero toca 9
  call sites. Mientras tanto: al tocar esa firma, tabla manual de callers, no confíes en
  `tsc`.
- **`aplicar_filtro_estado` (`repositories/_vacaciones_utils.py`) es un espejo de
  `derive_estado`.** La misma lógica en dos lados: si una cambia y la otra no, el filtro
  deja de coincidir con lo que se muestra. Merece un test que las compare.
- **`page_size=100000` en los export.** Funciona, pero es el mismo patrón de corte
  silencioso que BUG 2: si algún día una empresa lo supera, el archivo sale incompleto y
  nadie se entera.
- **N+1 en el bulk de proyectos:** ~4-5 queries por empleado. Aceptable para equipos de
  5-15 en una acción de admin puntual. Batchearlo exige tocar `proyectos_repo` (104,
  over-limit).
- **Search de empleados perdió el ícono de lupa** al migrar a `FiltersBar`. Si molesta,
  se agrega al componente y lo heredan todos.
- **Adjuntos E2E: bloqueado, decisión tomada.** No hay bucket no-productivo (`_BUCKET =
  "documentos"` hardcodeado en `adjunto_service.py:27`, sin override; el `.env` local
  apunta a producción). **Decisión: checklist manual ahora, E2E automatizado en el
  cutover a AWS/S3**, donde va a haber bucket de dev. No provisionar un proyecto de test
  en Supabase — se tira a la basura en la migración.


- **Divergencia de naming en Sucesión:** la UI ahora dice "área" pero el código sigue diciendo `posicion` (`fetchAnalisisPosicion`, `get_analisis_posicion`, `openAnalisis`). No se renombró dentro del bugfix, a propósito. Renombrar es refactor propio — pero que nadie crea que existe un análisis por posición en algún lado.
- **`auditoria.tabla` = `entidad` en las 126 filas (espejo 1:1).** Confirmado en Fase 0. Cuando se drope `tabla`, no hay que traducir ni preservar nada.
- **`assessment/[id]/page.tsx` en 192/150** — over-limit. Su división es tarea aparte, y cuidado con el gate (ver sección arriba).
- **Bordes de paginación en `HorasTab`:** al borrar el último registro de la última página queda una página vacía hasta paginar; `page` no se resetea al cambiar de proyecto. Fuera del alcance del bug, aceptados.

### FEATURE PEDIDA Y NUNCA CONSTRUIDA — "compatibilidad con una posición"
El modal de sucesión prometía "los candidatos más compatibles para una posición" y
nunca se implementó: el ranking es por score de assessment genérico, sin relación con
ninguna posición. En Fase 0 se sacó el control muerto y se corrigió el copy.

**No es deuda técnica, es una feature.** Cuando RRHH la reclame, la conversación es
**qué significa compatibilidad**: ¿match contra `roles[]`? ¿contra el assessment?
¿un score nuevo? ¿filtra la lista o la reordena por afinidad? Nada de eso está
definido. No improvisar un `ilike`.

### Otras
- `permisos.ts` es espejo manual de `permisos.py` — riesgo de divergencia.
- `middleware/auth.py` (~133-141) acepta cualquier UUID con formato válido como `X-Empresa-Id` sin verificar que exista. Baja prioridad.

### En pausa
- **Link público de carga de horas** — mockup HTML aprobado, esperando confirmación de RRHH.
- **Limpieza general del repo** (código muerto, duplicación, violaciones de reglas): estimada en 5-8 sesiones. No urgente. Candidato principal de centralización: el filtro `empresa` duplicado 8× en 29 repos.

---

## Git
- Operar siempre desde `RRHH/Sofia/`.
- **Commits los hace Franco manualmente** (nunca Claude Code). Commits y push desacoplados: no hay push hasta que Franco lo decida. Preferir commits por sub-sesión.
- Formato convencional (`feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`).
- **Nota de despliegue (estable):** migración 059 + S3 + S5 van **juntas** a producción. Producción puede driftear de las migraciones versionadas — verificar siempre contra el schema vivo.