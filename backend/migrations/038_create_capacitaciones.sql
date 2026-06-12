-- 038_create_capacitaciones.sql
-- Catálogo de capacitaciones/cursos por empresa.
-- UNIQUE(id, empresa_id) requerido para la FK compuesta de empleado_capacitacion.

BEGIN;

CREATE TABLE IF NOT EXISTS public.capacitaciones (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id     UUID        NOT NULL REFERENCES public.empresas(id),
    nombre         TEXT        NOT NULL,
    descripcion    TEXT,
    categoria      TEXT,
    duracion_horas NUMERIC,
    obligatoria    BOOLEAN     NOT NULL DEFAULT FALSE,
    activo         BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (id, empresa_id)
);

CREATE INDEX IF NOT EXISTS idx_cap_empresa_id ON public.capacitaciones (empresa_id);

CREATE TRIGGER trg_cap_updated_at
    BEFORE UPDATE ON public.capacitaciones
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_auditoria_cap
    AFTER INSERT OR UPDATE OR DELETE ON public.capacitaciones
    FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria();

NOTIFY pgrst, 'reload schema';

COMMIT;
