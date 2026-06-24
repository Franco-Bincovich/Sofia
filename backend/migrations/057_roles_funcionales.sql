-- 057_roles_funcionales.sql
--
-- POR QUÉ:
-- La Entrega 2 introduce la capa de permisos funcionales. Hasta ahora el enum de
-- public.users.rol modelaba roles ESTRUCTURALES heredados del bootstrap
-- ('admin_rrhh' / 'management' / 'empleado'), que el backend nunca llegó a usar
-- para diferenciar funcionalidad. El nuevo modelo funcional define tres roles con
-- semántica real de acceso:
--     admin_rrhh       → acceso total (lectura + escritura)
--     gerencia_lectura → solo lectura sobre los módulos sensibles (ex 'management')
--     mandos_medios    → rol funcional nuevo (sin policies todavía; las define la
--                        capa de permisos de Entrega 2)
--
-- 'management' se reemplaza por 'gerencia_lectura' y 'empleado' desaparece del
-- enum: el empleado nunca es usuario del sistema (aporta datos por link público con
-- token, sin login), por lo que no necesita un rol en public.users.
--
-- SIN BACKFILL DE DATOS: hoy existe un único usuario con rol='admin_rrhh'. No hay
-- filas 'management' ni 'empleado', así que el cambio de CHECK no requiere
-- actualizar ninguna fila existente.
--
-- ALCANCE RLS: 27 policies de las migraciones 001–031 comparan contra el literal
-- 'management'. Este archivo las corrige TODAS para no dejar policies apuntando a un
-- valor que ya no existe en el CHECK. Las migraciones históricas NO se editan: la
-- corrección vive acá (DROP POLICY IF EXISTS + CREATE POLICY).
--   · 21 policies de SOLO LECTURA (FOR SELECT): 'management' → 'gerencia_lectura'.
--   · 1 policy de escritura exclusiva de gerencia (vacantes_insert_management): se
--     ELIMINA sin recrear, porque gerencia ahora es solo-lectura y la escritura de
--     admin ya está cubierta por la policy vacantes_write_admin preexistente.
--   · 5 policies de escritura COMPARTIDAS admin+management: NO se pueden dropear sin
--     recrear, porque eso quitaría también la escritura de admin_rrhh. Se recrean
--     restringidas a admin_rrhh únicamente.
--
-- NOTA: el agregado bootstrap 000_run_all.sql contiene copias de estas policies pero
-- queda fuera de scope (no se edita). Correr esta migración tras 000_run_all también
-- lo corrige, porque las policies se recrean por nombre.
--
-- Idempotente: DROP CONSTRAINT IF EXISTS y DROP POLICY IF EXISTS antes de cada CREATE.

BEGIN;

-- ============================================================================
-- 1. CHECK constraint de public.users.rol
-- El CHECK original es inline sin nombre (001_create_users.sql:10), por lo que
-- Postgres lo autogeneró como 'users_rol_check' (patrón {tabla}_{columna}_check).
-- ============================================================================

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_rol_check;

ALTER TABLE public.users
    ADD CONSTRAINT users_rol_check
    CHECK (rol IN ('admin_rrhh', 'gerencia_lectura', 'mandos_medios'));

-- ============================================================================
-- 2. Policies RLS de SOLO LECTURA: 'management' → 'gerencia_lectura'
-- Recrear las 21 policies FOR SELECT preservando su semántica original
-- (lectura para admin + gerencia sobre módulos sensibles).
-- ============================================================================

DROP POLICY IF EXISTS "users_select_admin_management" ON public.users;
CREATE POLICY "users_select_admin_management"
    ON public.users FOR SELECT
    USING (public.get_current_user_rol() IN ('admin_rrhh', 'gerencia_lectura'));

DROP POLICY IF EXISTS "empleados_select_admin_management" ON public.empleados;
CREATE POLICY "empleados_select_admin_management"
    ON public.empleados FOR SELECT
    USING (public.get_current_user_rol() IN ('admin_rrhh', 'gerencia_lectura'));

DROP POLICY IF EXISTS "documentos_select_admin_management" ON public.documentos_empleado;
CREATE POLICY "documentos_select_admin_management"
    ON public.documentos_empleado FOR SELECT
    USING (public.get_current_user_rol() IN ('admin_rrhh', 'gerencia_lectura'));

DROP POLICY IF EXISTS "vacantes_select_admin_management" ON public.vacantes;
CREATE POLICY "vacantes_select_admin_management"
    ON public.vacantes FOR SELECT
    USING (public.get_current_user_rol() IN ('admin_rrhh', 'gerencia_lectura'));

DROP POLICY IF EXISTS "candidatos_select_admin_management" ON public.candidatos;
CREATE POLICY "candidatos_select_admin_management"
    ON public.candidatos FOR SELECT
    USING (public.get_current_user_rol() IN ('admin_rrhh', 'gerencia_lectura'));

DROP POLICY IF EXISTS "onboarding_templates_select_admin_management" ON public.onboarding_templates;
CREATE POLICY "onboarding_templates_select_admin_management"
    ON public.onboarding_templates FOR SELECT
    USING (public.get_current_user_rol() IN ('admin_rrhh', 'gerencia_lectura'));

DROP POLICY IF EXISTS "onboarding_tareas_select_admin_management" ON public.onboarding_tareas;
CREATE POLICY "onboarding_tareas_select_admin_management"
    ON public.onboarding_tareas FOR SELECT
    USING (public.get_current_user_rol() IN ('admin_rrhh', 'gerencia_lectura'));

DROP POLICY IF EXISTS "onboarding_instancias_select_admin_management" ON public.onboarding_instancias;
CREATE POLICY "onboarding_instancias_select_admin_management"
    ON public.onboarding_instancias FOR SELECT
    USING (public.get_current_user_rol() IN ('admin_rrhh', 'gerencia_lectura'));

DROP POLICY IF EXISTS "onboarding_progreso_select_admin_management" ON public.onboarding_progreso;
CREATE POLICY "onboarding_progreso_select_admin_management"
    ON public.onboarding_progreso FOR SELECT
    USING (public.get_current_user_rol() IN ('admin_rrhh', 'gerencia_lectura'));

DROP POLICY IF EXISTS "offboarding_instancias_select_admin_management" ON public.offboarding_instancias;
CREATE POLICY "offboarding_instancias_select_admin_management"
    ON public.offboarding_instancias FOR SELECT
    USING (public.get_current_user_rol() IN ('admin_rrhh', 'gerencia_lectura'));

DROP POLICY IF EXISTS "offboarding_activos_select_admin_management" ON public.offboarding_activos;
CREATE POLICY "offboarding_activos_select_admin_management"
    ON public.offboarding_activos FOR SELECT
    USING (public.get_current_user_rol() IN ('admin_rrhh', 'gerencia_lectura'));

DROP POLICY IF EXISTS "costos_nomina_select_admin_management" ON public.costos_nomina;
CREATE POLICY "costos_nomina_select_admin_management"
    ON public.costos_nomina FOR SELECT
    USING (public.get_current_user_rol() IN ('admin_rrhh', 'gerencia_lectura'));

DROP POLICY IF EXISTS "presupuesto_areas_select_admin_management" ON public.presupuesto_areas;
CREATE POLICY "presupuesto_areas_select_admin_management"
    ON public.presupuesto_areas FOR SELECT
    USING (public.get_current_user_rol() IN ('admin_rrhh', 'gerencia_lectura'));

DROP POLICY IF EXISTS "sucesion_select_admin_management" ON public.sucesion_posiciones;
CREATE POLICY "sucesion_select_admin_management"
    ON public.sucesion_posiciones FOR SELECT
    USING (public.get_current_user_rol() IN ('admin_rrhh', 'gerencia_lectura'));

DROP POLICY IF EXISTS "planes_carrera_select_admin_management" ON public.planes_carrera;
CREATE POLICY "planes_carrera_select_admin_management"
    ON public.planes_carrera FOR SELECT
    USING (public.get_current_user_rol() IN ('admin_rrhh', 'gerencia_lectura'));

DROP POLICY IF EXISTS "hitos_select_admin_management" ON public.planes_carrera_hitos;
CREATE POLICY "hitos_select_admin_management"
    ON public.planes_carrera_hitos FOR SELECT
    USING (public.get_current_user_rol() IN ('admin_rrhh', 'gerencia_lectura'));

DROP POLICY IF EXISTS "campanas_select_admin_management" ON public.assessment_campanas;
CREATE POLICY "campanas_select_admin_management"
    ON public.assessment_campanas FOR SELECT
    USING (public.get_current_user_rol() IN ('admin_rrhh', 'gerencia_lectura'));

DROP POLICY IF EXISTS "links_select_admin_management" ON public.assessment_links;
CREATE POLICY "links_select_admin_management"
    ON public.assessment_links FOR SELECT
    USING (public.get_current_user_rol() IN ('admin_rrhh', 'gerencia_lectura'));

DROP POLICY IF EXISTS "resultados_select_admin_management" ON public.assessment_resultados;
CREATE POLICY "resultados_select_admin_management"
    ON public.assessment_resultados FOR SELECT
    USING (public.get_current_user_rol() IN ('admin_rrhh', 'gerencia_lectura'));

DROP POLICY IF EXISTS "reportes_select_admin_management" ON public.assessment_reportes;
CREATE POLICY "reportes_select_admin_management"
    ON public.assessment_reportes FOR SELECT
    USING (public.get_current_user_rol() IN ('admin_rrhh', 'gerencia_lectura'));

DROP POLICY IF EXISTS "reportes_select_admin_management" ON public.reportes_generados;
CREATE POLICY "reportes_select_admin_management"
    ON public.reportes_generados FOR SELECT
    USING (public.get_current_user_rol() IN ('admin_rrhh', 'gerencia_lectura'));

-- ============================================================================
-- 3. Policies RLS de ESCRITURA que mencionaban 'management'
-- En el nuevo modelo gerencia_lectura NO escribe. Se ajustan según el caso.
-- ============================================================================

-- 3a. vacantes_insert_management: grant EXTRA de INSERT solo para gerencia.
-- La escritura de admin ya está cubierta por la policy preexistente
-- vacantes_write_admin (FOR ALL, admin-only). Se ELIMINA sin recrear.
DROP POLICY IF EXISTS "vacantes_insert_management" ON public.vacantes;

-- 3b. Policies de escritura COMPARTIDAS admin+management.
-- Eran la ÚNICA vía de escritura para admin en estas tablas, así que no se pueden
-- dropear sin recrear: se restringen a admin_rrhh para preservar su acceso y quitar
-- el de gerencia. Mantienen FOR ALL con USING (semántica original).
DROP POLICY IF EXISTS "candidatos_write_admin_management" ON public.candidatos;
CREATE POLICY "candidatos_write_admin_management"
    ON public.candidatos FOR ALL
    USING (public.get_current_user_rol() = 'admin_rrhh');

DROP POLICY IF EXISTS "onboarding_progreso_write_admin_management" ON public.onboarding_progreso;
CREATE POLICY "onboarding_progreso_write_admin_management"
    ON public.onboarding_progreso FOR ALL
    USING (public.get_current_user_rol() = 'admin_rrhh');

DROP POLICY IF EXISTS "planes_carrera_write_admin_management" ON public.planes_carrera;
CREATE POLICY "planes_carrera_write_admin_management"
    ON public.planes_carrera FOR ALL
    USING (public.get_current_user_rol() = 'admin_rrhh');

DROP POLICY IF EXISTS "hitos_write_admin_management" ON public.planes_carrera_hitos;
CREATE POLICY "hitos_write_admin_management"
    ON public.planes_carrera_hitos FOR ALL
    USING (public.get_current_user_rol() = 'admin_rrhh');

-- reportes_generados: la original era FOR INSERT pero usaba USING (Postgres lo
-- ignora en INSERT, dejando el control inefectivo). Se recrea admin-only con la
-- forma correcta WITH CHECK.
DROP POLICY IF EXISTS "reportes_write_admin_management" ON public.reportes_generados;
CREATE POLICY "reportes_write_admin_management"
    ON public.reportes_generados FOR INSERT
    WITH CHECK (public.get_current_user_rol() = 'admin_rrhh');

COMMIT;
