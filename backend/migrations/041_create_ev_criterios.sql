-- 041_create_ev_criterios.sql
-- Criterios de evaluación que pertenecen a una plantilla.
-- FK compuesta (plantilla_id, empresa_id) garantiza que criterio y plantilla son de la misma empresa.
-- peso > 0 para que el promedio ponderado sea siempre válido.

BEGIN;

CREATE TABLE IF NOT EXISTS public.ev_criterios (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id      UUID        NOT NULL REFERENCES public.empresas(id),
    plantilla_id    UUID        NOT NULL,
    nombre          TEXT        NOT NULL,
    descripcion     TEXT,
    peso            NUMERIC     NOT NULL DEFAULT 1 CHECK (peso > 0),
    orden           INT         NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT ev_criterio_plantilla_fk
        FOREIGN KEY (plantilla_id, empresa_id)
        REFERENCES public.ev_plantillas(id, empresa_id)
);

CREATE INDEX IF NOT EXISTS idx_evcrit_plantilla ON public.ev_criterios (plantilla_id);
CREATE INDEX IF NOT EXISTS idx_evcrit_empresa   ON public.ev_criterios (empresa_id);

CREATE TRIGGER trg_evcrit_updated_at
    BEFORE UPDATE ON public.ev_criterios
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_auditoria_evcrit
    AFTER INSERT OR UPDATE OR DELETE ON public.ev_criterios
    FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria();

NOTIFY pgrst, 'reload schema';

COMMIT;
