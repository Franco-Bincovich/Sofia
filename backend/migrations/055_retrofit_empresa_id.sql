-- 055_retrofit_empresa_id.sql
-- Versiona el retrofit de `empresa_id` sobre las tablas históricas (migraciones
-- 001-035) que el código ya filtra por esa columna pero cuyo CREATE TABLE
-- original no la incluía. Se agregó A MANO en Supabase y nunca se versionó.
--
-- Patrón por tabla (idempotente, corre sobre producción sin romper nada):
--   1. ADD COLUMN IF NOT EXISTS empresa_id UUID (nullable primero).
--   2. Backfill a HR Karstec (5201b8ec-...) de las filas sin empresa.
--   3. ALTER COLUMN ... SET NOT NULL.
--   4. FK a empresas(id) con guard sobre pg_constraint (Postgres no soporta
--      ADD CONSTRAINT IF NOT EXISTS) usando el nombre exacto de producción.
--   5. Índice idx_<tabla>_empresa_id en las tablas de mayor volumen.
--
-- Excepción: reportes_generados.empresa_id queda NULLABLE en producción → sin
-- backfill ni SET NOT NULL, solo columna + FK.
--
-- Los UNIQUE compuestos (id, empresa_id) ya los crean las migraciones 036-053;
-- no se repiten acá.

BEGIN;

-- ── areas ────────────────────────────────────────────────────────────────────
DO $$
BEGIN
    ALTER TABLE public.areas ADD COLUMN IF NOT EXISTS empresa_id UUID;
    UPDATE public.areas SET empresa_id = '5201b8ec-ac7f-4e83-baee-5e924e420b31' WHERE empresa_id IS NULL;
    ALTER TABLE public.areas ALTER COLUMN empresa_id SET NOT NULL;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'areas_empresa_fkey' AND conrelid = 'public.areas'::regclass) THEN
        ALTER TABLE public.areas ADD CONSTRAINT areas_empresa_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
    END IF;
END $$;

-- ── vacantes ─────────────────────────────────────────────────────────────────
DO $$
BEGIN
    ALTER TABLE public.vacantes ADD COLUMN IF NOT EXISTS empresa_id UUID;
    UPDATE public.vacantes SET empresa_id = '5201b8ec-ac7f-4e83-baee-5e924e420b31' WHERE empresa_id IS NULL;
    ALTER TABLE public.vacantes ALTER COLUMN empresa_id SET NOT NULL;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vacantes_empresa_fkey' AND conrelid = 'public.vacantes'::regclass) THEN
        ALTER TABLE public.vacantes ADD CONSTRAINT vacantes_empresa_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
    END IF;
END $$;

-- ── candidatos ───────────────────────────────────────────────────────────────
DO $$
BEGIN
    ALTER TABLE public.candidatos ADD COLUMN IF NOT EXISTS empresa_id UUID;
    UPDATE public.candidatos SET empresa_id = '5201b8ec-ac7f-4e83-baee-5e924e420b31' WHERE empresa_id IS NULL;
    ALTER TABLE public.candidatos ALTER COLUMN empresa_id SET NOT NULL;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'candidatos_empresa_fkey' AND conrelid = 'public.candidatos'::regclass) THEN
        ALTER TABLE public.candidatos ADD CONSTRAINT candidatos_empresa_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
    END IF;
END $$;

-- ── costos_nomina ────────────────────────────────────────────────────────────
DO $$
BEGIN
    ALTER TABLE public.costos_nomina ADD COLUMN IF NOT EXISTS empresa_id UUID;
    UPDATE public.costos_nomina SET empresa_id = '5201b8ec-ac7f-4e83-baee-5e924e420b31' WHERE empresa_id IS NULL;
    ALTER TABLE public.costos_nomina ALTER COLUMN empresa_id SET NOT NULL;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'costos_nomina_empresa_fkey' AND conrelid = 'public.costos_nomina'::regclass) THEN
        ALTER TABLE public.costos_nomina ADD CONSTRAINT costos_nomina_empresa_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
    END IF;
END $$;

-- ── presupuesto_areas ────────────────────────────────────────────────────────
DO $$
BEGIN
    ALTER TABLE public.presupuesto_areas ADD COLUMN IF NOT EXISTS empresa_id UUID;
    UPDATE public.presupuesto_areas SET empresa_id = '5201b8ec-ac7f-4e83-baee-5e924e420b31' WHERE empresa_id IS NULL;
    ALTER TABLE public.presupuesto_areas ALTER COLUMN empresa_id SET NOT NULL;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'presupuesto_areas_empresa_fkey' AND conrelid = 'public.presupuesto_areas'::regclass) THEN
        ALTER TABLE public.presupuesto_areas ADD CONSTRAINT presupuesto_areas_empresa_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
    END IF;
END $$;

-- ── sucesion_posiciones ──────────────────────────────────────────────────────
DO $$
BEGIN
    ALTER TABLE public.sucesion_posiciones ADD COLUMN IF NOT EXISTS empresa_id UUID;
    UPDATE public.sucesion_posiciones SET empresa_id = '5201b8ec-ac7f-4e83-baee-5e924e420b31' WHERE empresa_id IS NULL;
    ALTER TABLE public.sucesion_posiciones ALTER COLUMN empresa_id SET NOT NULL;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sucesion_posiciones_empresa_fkey' AND conrelid = 'public.sucesion_posiciones'::regclass) THEN
        ALTER TABLE public.sucesion_posiciones ADD CONSTRAINT sucesion_posiciones_empresa_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
    END IF;
END $$;

-- ── planes_carrera ───────────────────────────────────────────────────────────
DO $$
BEGIN
    ALTER TABLE public.planes_carrera ADD COLUMN IF NOT EXISTS empresa_id UUID;
    UPDATE public.planes_carrera SET empresa_id = '5201b8ec-ac7f-4e83-baee-5e924e420b31' WHERE empresa_id IS NULL;
    ALTER TABLE public.planes_carrera ALTER COLUMN empresa_id SET NOT NULL;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'planes_carrera_empresa_fkey' AND conrelid = 'public.planes_carrera'::regclass) THEN
        ALTER TABLE public.planes_carrera ADD CONSTRAINT planes_carrera_empresa_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
    END IF;
END $$;

-- ── planes_carrera_hitos ─────────────────────────────────────────────────────
DO $$
BEGIN
    ALTER TABLE public.planes_carrera_hitos ADD COLUMN IF NOT EXISTS empresa_id UUID;
    UPDATE public.planes_carrera_hitos SET empresa_id = '5201b8ec-ac7f-4e83-baee-5e924e420b31' WHERE empresa_id IS NULL;
    ALTER TABLE public.planes_carrera_hitos ALTER COLUMN empresa_id SET NOT NULL;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'planes_carrera_hitos_empresa_fkey' AND conrelid = 'public.planes_carrera_hitos'::regclass) THEN
        ALTER TABLE public.planes_carrera_hitos ADD CONSTRAINT planes_carrera_hitos_empresa_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
    END IF;
END $$;

-- ── assessment_campanas ──────────────────────────────────────────────────────
DO $$
BEGIN
    ALTER TABLE public.assessment_campanas ADD COLUMN IF NOT EXISTS empresa_id UUID;
    UPDATE public.assessment_campanas SET empresa_id = '5201b8ec-ac7f-4e83-baee-5e924e420b31' WHERE empresa_id IS NULL;
    ALTER TABLE public.assessment_campanas ALTER COLUMN empresa_id SET NOT NULL;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assessment_campanas_empresa_fkey' AND conrelid = 'public.assessment_campanas'::regclass) THEN
        ALTER TABLE public.assessment_campanas ADD CONSTRAINT assessment_campanas_empresa_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
    END IF;
END $$;

-- ── assessment_links ─────────────────────────────────────────────────────────
DO $$
BEGIN
    ALTER TABLE public.assessment_links ADD COLUMN IF NOT EXISTS empresa_id UUID;
    UPDATE public.assessment_links SET empresa_id = '5201b8ec-ac7f-4e83-baee-5e924e420b31' WHERE empresa_id IS NULL;
    ALTER TABLE public.assessment_links ALTER COLUMN empresa_id SET NOT NULL;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assessment_links_empresa_fkey' AND conrelid = 'public.assessment_links'::regclass) THEN
        ALTER TABLE public.assessment_links ADD CONSTRAINT assessment_links_empresa_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
    END IF;
END $$;

-- ── assessment_resultados ────────────────────────────────────────────────────
DO $$
BEGIN
    ALTER TABLE public.assessment_resultados ADD COLUMN IF NOT EXISTS empresa_id UUID;
    UPDATE public.assessment_resultados SET empresa_id = '5201b8ec-ac7f-4e83-baee-5e924e420b31' WHERE empresa_id IS NULL;
    ALTER TABLE public.assessment_resultados ALTER COLUMN empresa_id SET NOT NULL;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assessment_resultados_empresa_fkey' AND conrelid = 'public.assessment_resultados'::regclass) THEN
        ALTER TABLE public.assessment_resultados ADD CONSTRAINT assessment_resultados_empresa_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
    END IF;
END $$;

-- ── assessment_reportes ──────────────────────────────────────────────────────
DO $$
BEGIN
    ALTER TABLE public.assessment_reportes ADD COLUMN IF NOT EXISTS empresa_id UUID;
    UPDATE public.assessment_reportes SET empresa_id = '5201b8ec-ac7f-4e83-baee-5e924e420b31' WHERE empresa_id IS NULL;
    ALTER TABLE public.assessment_reportes ALTER COLUMN empresa_id SET NOT NULL;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assessment_reportes_empresa_fkey' AND conrelid = 'public.assessment_reportes'::regclass) THEN
        ALTER TABLE public.assessment_reportes ADD CONSTRAINT assessment_reportes_empresa_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
    END IF;
END $$;

-- ── onboarding_templates ─────────────────────────────────────────────────────
DO $$
BEGIN
    ALTER TABLE public.onboarding_templates ADD COLUMN IF NOT EXISTS empresa_id UUID;
    UPDATE public.onboarding_templates SET empresa_id = '5201b8ec-ac7f-4e83-baee-5e924e420b31' WHERE empresa_id IS NULL;
    ALTER TABLE public.onboarding_templates ALTER COLUMN empresa_id SET NOT NULL;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'onboarding_templates_empresa_fkey' AND conrelid = 'public.onboarding_templates'::regclass) THEN
        ALTER TABLE public.onboarding_templates ADD CONSTRAINT onboarding_templates_empresa_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
    END IF;
END $$;

-- ── onboarding_tareas ────────────────────────────────────────────────────────
DO $$
BEGIN
    ALTER TABLE public.onboarding_tareas ADD COLUMN IF NOT EXISTS empresa_id UUID;
    UPDATE public.onboarding_tareas SET empresa_id = '5201b8ec-ac7f-4e83-baee-5e924e420b31' WHERE empresa_id IS NULL;
    ALTER TABLE public.onboarding_tareas ALTER COLUMN empresa_id SET NOT NULL;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'onboarding_tareas_empresa_fkey' AND conrelid = 'public.onboarding_tareas'::regclass) THEN
        ALTER TABLE public.onboarding_tareas ADD CONSTRAINT onboarding_tareas_empresa_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
    END IF;
END $$;

-- ── onboarding_instancias ────────────────────────────────────────────────────
DO $$
BEGIN
    ALTER TABLE public.onboarding_instancias ADD COLUMN IF NOT EXISTS empresa_id UUID;
    UPDATE public.onboarding_instancias SET empresa_id = '5201b8ec-ac7f-4e83-baee-5e924e420b31' WHERE empresa_id IS NULL;
    ALTER TABLE public.onboarding_instancias ALTER COLUMN empresa_id SET NOT NULL;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'onboarding_instancias_empresa_fkey' AND conrelid = 'public.onboarding_instancias'::regclass) THEN
        ALTER TABLE public.onboarding_instancias ADD CONSTRAINT onboarding_instancias_empresa_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
    END IF;
END $$;

-- ── onboarding_progreso ──────────────────────────────────────────────────────
DO $$
BEGIN
    ALTER TABLE public.onboarding_progreso ADD COLUMN IF NOT EXISTS empresa_id UUID;
    UPDATE public.onboarding_progreso SET empresa_id = '5201b8ec-ac7f-4e83-baee-5e924e420b31' WHERE empresa_id IS NULL;
    ALTER TABLE public.onboarding_progreso ALTER COLUMN empresa_id SET NOT NULL;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'onboarding_progreso_empresa_fkey' AND conrelid = 'public.onboarding_progreso'::regclass) THEN
        ALTER TABLE public.onboarding_progreso ADD CONSTRAINT onboarding_progreso_empresa_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
    END IF;
END $$;

-- ── offboarding_instancias ───────────────────────────────────────────────────
DO $$
BEGIN
    ALTER TABLE public.offboarding_instancias ADD COLUMN IF NOT EXISTS empresa_id UUID;
    UPDATE public.offboarding_instancias SET empresa_id = '5201b8ec-ac7f-4e83-baee-5e924e420b31' WHERE empresa_id IS NULL;
    ALTER TABLE public.offboarding_instancias ALTER COLUMN empresa_id SET NOT NULL;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'offboarding_instancias_empresa_fkey' AND conrelid = 'public.offboarding_instancias'::regclass) THEN
        ALTER TABLE public.offboarding_instancias ADD CONSTRAINT offboarding_instancias_empresa_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
    END IF;
END $$;

-- ── offboarding_activos ──────────────────────────────────────────────────────
DO $$
BEGIN
    ALTER TABLE public.offboarding_activos ADD COLUMN IF NOT EXISTS empresa_id UUID;
    UPDATE public.offboarding_activos SET empresa_id = '5201b8ec-ac7f-4e83-baee-5e924e420b31' WHERE empresa_id IS NULL;
    ALTER TABLE public.offboarding_activos ALTER COLUMN empresa_id SET NOT NULL;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'offboarding_activos_empresa_fkey' AND conrelid = 'public.offboarding_activos'::regclass) THEN
        ALTER TABLE public.offboarding_activos ADD CONSTRAINT offboarding_activos_empresa_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
    END IF;
END $$;

-- ── documentos_empleado ──────────────────────────────────────────────────────
DO $$
BEGIN
    ALTER TABLE public.documentos_empleado ADD COLUMN IF NOT EXISTS empresa_id UUID;
    UPDATE public.documentos_empleado SET empresa_id = '5201b8ec-ac7f-4e83-baee-5e924e420b31' WHERE empresa_id IS NULL;
    ALTER TABLE public.documentos_empleado ALTER COLUMN empresa_id SET NOT NULL;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'documentos_empleado_empresa_fkey' AND conrelid = 'public.documentos_empleado'::regclass) THEN
        ALTER TABLE public.documentos_empleado ADD CONSTRAINT documentos_empleado_empresa_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
    END IF;
END $$;

-- ── configuracion_empresa ────────────────────────────────────────────────────
DO $$
BEGIN
    ALTER TABLE public.configuracion_empresa ADD COLUMN IF NOT EXISTS empresa_id UUID;
    UPDATE public.configuracion_empresa SET empresa_id = '5201b8ec-ac7f-4e83-baee-5e924e420b31' WHERE empresa_id IS NULL;
    ALTER TABLE public.configuracion_empresa ALTER COLUMN empresa_id SET NOT NULL;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'configuracion_empresa_empresa_fkey' AND conrelid = 'public.configuracion_empresa'::regclass) THEN
        ALTER TABLE public.configuracion_empresa ADD CONSTRAINT configuracion_empresa_empresa_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
    END IF;
END $$;

-- ── reportes_generados (empresa_id NULLABLE en producción) ───────────────────
-- Sin backfill ni SET NOT NULL: la columna admite NULL (reportes consolidados).
DO $$
BEGIN
    ALTER TABLE public.reportes_generados ADD COLUMN IF NOT EXISTS empresa_id UUID;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reportes_generados_empresa_id_fkey' AND conrelid = 'public.reportes_generados'::regclass) THEN
        ALTER TABLE public.reportes_generados ADD CONSTRAINT reportes_generados_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
    END IF;
END $$;

-- ── Índices empresa_id en las tablas de mayor volumen ────────────────────────
CREATE INDEX IF NOT EXISTS idx_areas_empresa_id                  ON public.areas (empresa_id);
CREATE INDEX IF NOT EXISTS idx_vacantes_empresa_id               ON public.vacantes (empresa_id);
CREATE INDEX IF NOT EXISTS idx_candidatos_empresa_id             ON public.candidatos (empresa_id);
CREATE INDEX IF NOT EXISTS idx_costos_nomina_empresa_id          ON public.costos_nomina (empresa_id);
CREATE INDEX IF NOT EXISTS idx_documentos_empleado_empresa_id    ON public.documentos_empleado (empresa_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_instancias_empresa_id  ON public.onboarding_instancias (empresa_id);
CREATE INDEX IF NOT EXISTS idx_offboarding_instancias_empresa_id ON public.offboarding_instancias (empresa_id);
CREATE INDEX IF NOT EXISTS idx_assessment_resultados_empresa_id  ON public.assessment_resultados (empresa_id);
CREATE INDEX IF NOT EXISTS idx_planes_carrera_empresa_id         ON public.planes_carrera (empresa_id);

COMMIT;

NOTIFY pgrst, 'reload schema';
