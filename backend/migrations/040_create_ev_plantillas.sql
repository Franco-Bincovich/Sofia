-- 040_create_ev_plantillas.sql
-- Plantillas reutilizables de evaluación de desempeño.
-- tipo_escala define si la puntuación es numérica (escala_min/max) o cualitativa (opciones_cualitativas).
-- area_id nullable: NULL = aplica a toda la empresa.
-- UNIQUE(id, empresa_id) requerido para FKs compuestas en tablas hijas.

BEGIN;

CREATE TABLE IF NOT EXISTS public.ev_plantillas (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id              UUID        NOT NULL REFERENCES public.empresas(id),
    nombre                  TEXT        NOT NULL,
    descripcion             TEXT,
    tipo_escala             TEXT        NOT NULL CHECK (tipo_escala IN ('numerica', 'cualitativa')),
    escala_min              INT,
    escala_max              INT,
    opciones_cualitativas   JSONB,
    activa                  BOOLEAN     NOT NULL DEFAULT TRUE,
    area_id                 UUID        REFERENCES public.areas(id),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (id, empresa_id)
);

CREATE INDEX IF NOT EXISTS idx_evp_empresa ON public.ev_plantillas (empresa_id);
CREATE INDEX IF NOT EXISTS idx_evp_area    ON public.ev_plantillas (area_id);
CREATE INDEX IF NOT EXISTS idx_evp_activa  ON public.ev_plantillas (activa);

CREATE TRIGGER trg_evp_updated_at
    BEFORE UPDATE ON public.ev_plantillas
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_auditoria_evp
    AFTER INSERT OR UPDATE OR DELETE ON public.ev_plantillas
    FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria();

NOTIFY pgrst, 'reload schema';

COMMIT;
