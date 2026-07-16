-- migrations/074_retrofit_empresa_id_dni_empleados.sql
-- Versiona el retrofit multiempresa de empleados, que era DRIFT: empresa_id, dni
-- y sus constraints existen en prod pero ninguna migracion los creaba. Mismo
-- patron que 054/055 (que saltearon empleados, la tabla central).
--
-- Sin esto, un rebuild desde cero aborta: la migracion 036 usa
-- empleados_id_empresa_uq sobre columnas que nunca se crearon.
--
-- POR ESCENARIO:
--   - PROD: todo ya existe -> todo IF NOT EXISTS / EXCEPTION es no-op. 0 filas.
--   - REBUILD: empleados vacia -> columnas se crean, backfill no toca nada,
--     SET NOT NULL pasa (sin nulos), UNIQUE no chocan (sin datos).
--
-- BACKFILL: no hardcodea UUID (esa empresa es dato cargado a mano, no existe en
-- rebuild) y usa LIMIT 1 sin ORDER BY (no depende de created_at). Afecta 0 filas
-- en ambos escenarios; el EXISTS evita fallar si no hay empresas.

BEGIN;

ALTER TABLE public.empleados ADD COLUMN IF NOT EXISTS empresa_id uuid;
ALTER TABLE public.empleados ADD COLUMN IF NOT EXISTS dni varchar;

UPDATE public.empleados
SET empresa_id = (SELECT id FROM public.empresas LIMIT 1)
WHERE empresa_id IS NULL
  AND EXISTS (SELECT 1 FROM public.empresas);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='empleados'
      AND column_name='empresa_id' AND is_nullable='YES'
  ) THEN
    ALTER TABLE public.empleados ALTER COLUMN empresa_id SET NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  ALTER TABLE public.empleados
    ADD CONSTRAINT empleados_empresa_fkey
    FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Los dos UNIQUE usan chequeo explicito sobre pg_constraint, NO EXCEPTION: un
-- UNIQUE se implementa como un indice del mismo nombre, y Postgres valida el
-- namespace de relaciones antes que el de constraints -> si ya existe tira
-- duplicate_table (42P07), no duplicate_object (42710). Un handler de
-- duplicate_object no lo atrapa y aborta la migracion. El chequeo previo no
-- depende de adivinar que excepcion tira Postgres. Mismo patron que la 055.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'empleados_id_empresa_uq'
      AND conrelid = 'public.empleados'::regclass
  ) THEN
    ALTER TABLE public.empleados
      ADD CONSTRAINT empleados_id_empresa_uq UNIQUE (id, empresa_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'empleados_empresa_dni_uq'
      AND conrelid = 'public.empleados'::regclass
  ) THEN
    ALTER TABLE public.empleados
      ADD CONSTRAINT empleados_empresa_dni_uq UNIQUE (empresa_id, dni);
  END IF;
END $$;

COMMIT;

NOTIFY pgrst, 'reload schema';
