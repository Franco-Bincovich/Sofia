-- Tareas individuales que componen una plantilla de onboarding.
-- El campo orden define la secuencia sugerida de ejecución dentro de la plantilla.
-- responsable_tipo indica quién es el responsable de completar cada tarea.

CREATE TABLE public.onboarding_tareas (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id      UUID         NOT NULL REFERENCES public.onboarding_templates(id) ON DELETE CASCADE,
    nombre           VARCHAR(200) NOT NULL,
    descripcion      TEXT,
    responsable_tipo VARCHAR(20)  NOT NULL CHECK (responsable_tipo IN ('rrhh', 'manager', 'empleado', 'ti', 'administracion')),
    orden            SMALLINT     NOT NULL DEFAULT 1 CHECK (orden > 0),
    dias_limite      SMALLINT     NOT NULL DEFAULT 1 CHECK (dias_limite > 0),
    obligatoria      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE public.onboarding_tareas ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_onboarding_tareas_template ON public.onboarding_tareas(template_id);
CREATE INDEX idx_onboarding_tareas_orden    ON public.onboarding_tareas(template_id, orden);

-- RLS Policies
CREATE POLICY "onboarding_tareas_select_admin_management"
    ON public.onboarding_tareas FOR SELECT
    USING (public.get_current_user_rol() IN ('admin_rrhh', 'management'));

CREATE POLICY "onboarding_tareas_write_admin"
    ON public.onboarding_tareas FOR ALL
    USING (public.get_current_user_rol() = 'admin_rrhh');
