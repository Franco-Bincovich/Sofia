-- 044_create_ev_resultados.sql
-- Resultado por criterio dentro de una instancia de evaluación.
-- Las filas se generan vacías automáticamente al crear la instancia (una por criterio de la plantilla).
-- puntaje: para escala numérica. valor: para escala cualitativa. Se usa uno según tipo_escala de la plantilla.
-- UNIQUE(instancia_id, criterio_id): una sola fila por combinación.

BEGIN;

CREATE TABLE IF NOT EXISTS public.ev_resultados (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id      UUID        NOT NULL REFERENCES public.empresas(id),
    instancia_id    UUID        NOT NULL,
    criterio_id     UUID        NOT NULL REFERENCES public.ev_criterios(id),
    puntaje         NUMERIC,
    valor           TEXT,
    comentario      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (instancia_id, criterio_id),

    CONSTRAINT ev_resultado_instancia_fk
        FOREIGN KEY (instancia_id, empresa_id)
        REFERENCES public.ev_instancias(id, empresa_id)
);

CREATE INDEX IF NOT EXISTS idx_evres_instancia ON public.ev_resultados (instancia_id);
CREATE INDEX IF NOT EXISTS idx_evres_empresa   ON public.ev_resultados (empresa_id);

CREATE TRIGGER trg_evres_updated_at
    BEFORE UPDATE ON public.ev_resultados
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_auditoria_evres
    AFTER INSERT OR UPDATE OR DELETE ON public.ev_resultados
    FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria();

NOTIFY pgrst, 'reload schema';

COMMIT;
