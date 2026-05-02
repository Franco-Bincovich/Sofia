-- Reportes generados a partir de un resultado de assessment.
-- Pueden ser generados por el motor de IA (Claude) o manualmente por RRHH.
-- visible_empleado controla si el empleado puede ver su propio reporte.

CREATE TABLE public.assessment_reportes (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    resultado_id     UUID        NOT NULL REFERENCES public.assessment_resultados(id) ON DELETE CASCADE,
    tipo_reporte     VARCHAR(30) NOT NULL CHECK (tipo_reporte IN ('perfil_conductual', 'perfil_cognitivo', 'fit_cultural', 'plan_desarrollo', 'comparativo', 'ejecutivo')),
    titulo           VARCHAR(200) NOT NULL,
    contenido        JSONB       NOT NULL DEFAULT '{}',
    resumen          TEXT,
    generado_por     VARCHAR(10) NOT NULL DEFAULT 'ia' CHECK (generado_por IN ('ia', 'manual')),
    modelo_ia        VARCHAR(100),
    url_pdf          TEXT,
    storage_path     TEXT,
    visible_empleado BOOLEAN     NOT NULL DEFAULT FALSE,
    created_by       UUID        REFERENCES public.users(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.assessment_reportes ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_reportes_resultado ON public.assessment_reportes(resultado_id);
CREATE INDEX idx_reportes_tipo      ON public.assessment_reportes(tipo_reporte);

-- RLS Policies
CREATE POLICY "reportes_select_admin_management"
    ON public.assessment_reportes FOR SELECT
    USING (public.get_current_user_rol() IN ('admin_rrhh', 'management'));

CREATE POLICY "reportes_select_own"
    ON public.assessment_reportes FOR SELECT
    USING (
        visible_empleado = TRUE AND
        EXISTS (
            SELECT 1 FROM public.assessment_resultados ar
            JOIN public.empleados e ON e.id = ar.empleado_id
            WHERE ar.id = resultado_id AND e.user_id = auth.uid()
        )
    );

CREATE POLICY "reportes_write_admin"
    ON public.assessment_reportes FOR ALL
    USING (public.get_current_user_rol() = 'admin_rrhh');
