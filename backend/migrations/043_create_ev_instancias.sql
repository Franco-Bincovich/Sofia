-- 043_create_ev_instancias.sql
-- Evaluación de un empleado dentro de un ciclo.
-- UNIQUE(ciclo_id, empleado_id): un empleado se evalúa una sola vez por ciclo.
-- FKs compuestas garantizan empresa_id consistente entre instancia, ciclo y empleado.
-- UNIQUE(id, empresa_id) requerido para FKs compuestas en ev_resultados.

BEGIN;

CREATE TABLE IF NOT EXISTS public.ev_instancias (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id          UUID        NOT NULL REFERENCES public.empresas(id),
    ciclo_id            UUID        NOT NULL,
    empleado_id         UUID        NOT NULL,
    evaluador_id        UUID        REFERENCES public.empleados(id),
    estado              TEXT        NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador', 'finalizada')),
    puntaje_global      NUMERIC,
    comentario_general  TEXT,
    fecha_evaluacion    DATE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (id, empresa_id),
    UNIQUE (ciclo_id, empleado_id),

    CONSTRAINT ev_instancia_ciclo_fk
        FOREIGN KEY (ciclo_id, empresa_id)
        REFERENCES public.ev_ciclos(id, empresa_id),

    CONSTRAINT ev_instancia_empleado_fk
        FOREIGN KEY (empleado_id, empresa_id)
        REFERENCES public.empleados(id, empresa_id)
);

CREATE INDEX IF NOT EXISTS idx_evinst_empresa  ON public.ev_instancias (empresa_id);
CREATE INDEX IF NOT EXISTS idx_evinst_ciclo    ON public.ev_instancias (ciclo_id);
CREATE INDEX IF NOT EXISTS idx_evinst_empleado ON public.ev_instancias (empleado_id);
CREATE INDEX IF NOT EXISTS idx_evinst_estado   ON public.ev_instancias (estado);

CREATE TRIGGER trg_evinst_updated_at
    BEFORE UPDATE ON public.ev_instancias
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_auditoria_evinst
    AFTER INSERT OR UPDATE OR DELETE ON public.ev_instancias
    FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria();

NOTIFY pgrst, 'reload schema';

COMMIT;
