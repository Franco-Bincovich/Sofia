-- Resultados de un assessment completado por un destinatario.
-- respuestas y puntuacion son JSONB para soportar distintos tipos y versiones de evaluación.
-- UNIQUE en link_id: un link solo puede tener un resultado (se completa una sola vez).

CREATE TABLE public.assessment_resultados (
    id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    link_id               UUID        NOT NULL UNIQUE REFERENCES public.assessment_links(id) ON DELETE CASCADE,
    campana_id            UUID        NOT NULL REFERENCES public.assessment_campanas(id) ON DELETE RESTRICT,
    empleado_id           UUID        REFERENCES public.empleados(id) ON DELETE SET NULL,
    candidato_id          UUID        REFERENCES public.candidatos(id) ON DELETE SET NULL,
    respuestas            JSONB       NOT NULL DEFAULT '{}',
    puntuacion            JSONB,
    perfil_resultado      JSONB,
    tiempo_total_segundos INTEGER     CHECK (tiempo_total_segundos > 0),
    completado_en         TIMESTAMPTZ,
    ip_completion         INET,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.assessment_resultados ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_assessment_resultados_updated_at
    BEFORE UPDATE ON public.assessment_resultados
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_resultados_campana   ON public.assessment_resultados(campana_id);
CREATE INDEX idx_resultados_empleado  ON public.assessment_resultados(empleado_id);
CREATE INDEX idx_resultados_candidato ON public.assessment_resultados(candidato_id);

-- RLS Policies
CREATE POLICY "resultados_select_admin_management"
    ON public.assessment_resultados FOR SELECT
    USING (public.get_current_user_rol() IN ('admin_rrhh', 'management'));

CREATE POLICY "resultados_select_own"
    ON public.assessment_resultados FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.empleados e
            WHERE e.id = empleado_id AND e.user_id = auth.uid()
        )
    );

-- Permite insertar desde la ruta pública de assessment (sin sesión activa)
CREATE POLICY "resultados_insert_publico"
    ON public.assessment_resultados FOR INSERT
    WITH CHECK (TRUE);

CREATE POLICY "resultados_update_admin"
    ON public.assessment_resultados FOR UPDATE
    USING (public.get_current_user_rol() = 'admin_rrhh');
