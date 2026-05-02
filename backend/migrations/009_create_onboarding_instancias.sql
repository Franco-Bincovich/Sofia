-- Instancia de onboarding activa para un empleado específico.
-- Se crea al dar de alta un nuevo empleado aplicando una plantilla.
-- Las filas de progreso (010) se generan automáticamente al crear la instancia.

CREATE TABLE public.onboarding_instancias (
    id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    empleado_id        UUID        NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
    template_id        UUID        NOT NULL REFERENCES public.onboarding_templates(id) ON DELETE RESTRICT,
    fecha_inicio       DATE        NOT NULL DEFAULT CURRENT_DATE,
    fecha_fin_esperada DATE,
    fecha_completada   DATE,
    estado             VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_progreso', 'completado', 'cancelado')),
    created_by         UUID        REFERENCES public.users(id) ON DELETE SET NULL,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.onboarding_instancias ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_onboarding_instancias_updated_at
    BEFORE UPDATE ON public.onboarding_instancias
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_onboarding_instancias_empleado ON public.onboarding_instancias(empleado_id);
CREATE INDEX idx_onboarding_instancias_estado   ON public.onboarding_instancias(estado);

-- RLS Policies
CREATE POLICY "onboarding_instancias_select_admin_management"
    ON public.onboarding_instancias FOR SELECT
    USING (public.get_current_user_rol() IN ('admin_rrhh', 'management'));

CREATE POLICY "onboarding_instancias_select_own"
    ON public.onboarding_instancias FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.empleados e
            WHERE e.id = empleado_id AND e.user_id = auth.uid()
        )
    );

CREATE POLICY "onboarding_instancias_write_admin"
    ON public.onboarding_instancias FOR ALL
    USING (public.get_current_user_rol() = 'admin_rrhh');
