-- Plantillas de onboarding reutilizables. Pueden ser genéricas o específicas por área.
-- Definen la estructura base de tareas que se instancian al contratar un nuevo empleado.
-- area_id NULL indica que la plantilla aplica a toda la organización.

CREATE TABLE public.onboarding_templates (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre        VARCHAR(150) NOT NULL,
    descripcion   TEXT,
    area_id       UUID         REFERENCES public.areas(id) ON DELETE SET NULL,
    duracion_dias SMALLINT     NOT NULL DEFAULT 30 CHECK (duracion_dias > 0),
    activo        BOOLEAN      NOT NULL DEFAULT TRUE,
    created_by    UUID         REFERENCES public.users(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE public.onboarding_templates ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_onboarding_templates_updated_at
    BEFORE UPDATE ON public.onboarding_templates
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_onboarding_templates_area   ON public.onboarding_templates(area_id);
CREATE INDEX idx_onboarding_templates_activo ON public.onboarding_templates(activo);

-- RLS Policies
CREATE POLICY "onboarding_templates_select_admin_management"
    ON public.onboarding_templates FOR SELECT
    USING (public.get_current_user_rol() IN ('admin_rrhh', 'management'));

CREATE POLICY "onboarding_templates_write_admin"
    ON public.onboarding_templates FOR ALL
    USING (public.get_current_user_rol() = 'admin_rrhh');
