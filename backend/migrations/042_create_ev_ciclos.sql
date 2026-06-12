-- 042_create_ev_ciclos.sql
-- Ciclos de evaluación: campaña temporal que usa una plantilla (ej. "Evaluación Q2 2026").
-- FK compuesta (plantilla_id, empresa_id) garantiza misma empresa.
-- UNIQUE(id, empresa_id) requerido para FKs compuestas en ev_instancias.

BEGIN;

CREATE TABLE IF NOT EXISTS public.ev_ciclos (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id      UUID        NOT NULL REFERENCES public.empresas(id),
    nombre          TEXT        NOT NULL,
    plantilla_id    UUID        NOT NULL,
    fecha_inicio    DATE        NOT NULL,
    fecha_fin       DATE        NOT NULL,
    estado          TEXT        NOT NULL DEFAULT 'abierto' CHECK (estado IN ('abierto', 'cerrado')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (id, empresa_id),

    CONSTRAINT ev_ciclo_plantilla_fk
        FOREIGN KEY (plantilla_id, empresa_id)
        REFERENCES public.ev_plantillas(id, empresa_id)
);

CREATE INDEX IF NOT EXISTS idx_evcicp_empresa   ON public.ev_ciclos (empresa_id);
CREATE INDEX IF NOT EXISTS idx_evcicp_plantilla ON public.ev_ciclos (plantilla_id);
CREATE INDEX IF NOT EXISTS idx_evcicp_estado    ON public.ev_ciclos (estado);

CREATE TRIGGER trg_evciclo_updated_at
    BEFORE UPDATE ON public.ev_ciclos
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_auditoria_evciclo
    AFTER INSERT OR UPDATE OR DELETE ON public.ev_ciclos
    FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria();

NOTIFY pgrst, 'reload schema';

COMMIT;
