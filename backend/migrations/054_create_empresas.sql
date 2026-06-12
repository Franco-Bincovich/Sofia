-- 054_create_empresas.sql
-- Versiona el retrofit multiempresa que se aplicó A MANO en Supabase y nunca
-- se versionó: crea la tabla `empresas` (raíz del modelo multiempresa) y la
-- siembra con las dos empresas reales de producción.
--
-- Las migraciones 036-053 ya asumen que esta tabla existe (REFERENCES empresas).
-- En la DB real esto ya está aplicado; por eso todo es idempotente
-- (CREATE TABLE IF NOT EXISTS, INSERT ... ON CONFLICT DO NOTHING, DROP ... IF EXISTS).
-- Puede correrse sobre producción sin romper nada.

BEGIN;

-- Esquema verificado contra producción.
CREATE TABLE IF NOT EXISTS public.empresas (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre       VARCHAR      NOT NULL,
    activa       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    razon_social VARCHAR,
    cuit         VARCHAR,
    direccion    TEXT,
    telefono     VARCHAR,
    email        VARCHAR,
    logo_url     TEXT
);

-- Seed: las dos empresas reales (IDs fijos verificados contra producción).
INSERT INTO public.empresas (id, nombre) VALUES
    ('5201b8ec-ac7f-4e83-baee-5e924e420b31', 'HR Karstec'),
    ('0b1dfd2a-ebe3-48b8-990c-4e092ba1595a', 'Servicios y Consultoría')
ON CONFLICT (id) DO NOTHING;

-- Trigger updated_at — set_updated_at() ya existe desde la migración 001.
DROP TRIGGER IF EXISTS trg_empresas_updated_at ON public.empresas;
CREATE TRIGGER trg_empresas_updated_at
    BEFORE UPDATE ON public.empresas
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

-- Catálogo de empresas legible por cualquier usuario autenticado.
DROP POLICY IF EXISTS "empresas_select_authenticated" ON public.empresas;
CREATE POLICY "empresas_select_authenticated"
    ON public.empresas FOR SELECT
    USING (auth.uid() IS NOT NULL);

COMMIT;

NOTIFY pgrst, 'reload schema';
