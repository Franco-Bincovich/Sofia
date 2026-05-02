-- Campañas de evaluación (assessment). Agrupa un conjunto de links enviados bajo una misma evaluación.
-- configuracion JSONB almacena las preguntas, escalas y parámetros específicos de cada tipo.
-- tipos: conductual (DISC/Big5), cognitivo, técnico, o mixto.

CREATE TABLE public.assessment_campanas (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre        VARCHAR(150) NOT NULL,
    descripcion   TEXT,
    tipo          VARCHAR(20) NOT NULL CHECK (tipo IN ('conductual', 'cognitivo', 'tecnico', 'mixto')),
    subtipo       VARCHAR(50),
    configuracion JSONB       NOT NULL DEFAULT '{}',
    estado        VARCHAR(20) NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador', 'activa', 'cerrada', 'archivada')),
    fecha_inicio  DATE,
    fecha_fin     DATE,
    created_by    UUID        REFERENCES public.users(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.assessment_campanas ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_assessment_campanas_updated_at
    BEFORE UPDATE ON public.assessment_campanas
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_campanas_estado ON public.assessment_campanas(estado);
CREATE INDEX idx_campanas_tipo   ON public.assessment_campanas(tipo);

-- RLS Policies
CREATE POLICY "campanas_select_admin_management"
    ON public.assessment_campanas FOR SELECT
    USING (public.get_current_user_rol() IN ('admin_rrhh', 'management'));

CREATE POLICY "campanas_write_admin"
    ON public.assessment_campanas FOR ALL
    USING (public.get_current_user_rol() = 'admin_rrhh');
