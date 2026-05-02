-- Progreso de cada tarea dentro de una instancia de onboarding.
-- Una fila por combinación única instancia-tarea; se pobla al crear la instancia.
-- El UNIQUE garantiza que no se duplique el seguimiento de una misma tarea.

CREATE TABLE public.onboarding_progreso (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    instancia_id     UUID        NOT NULL REFERENCES public.onboarding_instancias(id) ON DELETE CASCADE,
    tarea_id         UUID        NOT NULL REFERENCES public.onboarding_tareas(id) ON DELETE CASCADE,
    estado           VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_progreso', 'completado', 'omitido')),
    fecha_completada TIMESTAMPTZ,
    completado_por   UUID        REFERENCES public.users(id) ON DELETE SET NULL,
    notas            TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (instancia_id, tarea_id)
);

ALTER TABLE public.onboarding_progreso ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_onboarding_progreso_updated_at
    BEFORE UPDATE ON public.onboarding_progreso
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_onboarding_progreso_instancia ON public.onboarding_progreso(instancia_id);
CREATE INDEX idx_onboarding_progreso_estado    ON public.onboarding_progreso(estado);

-- RLS Policies
CREATE POLICY "onboarding_progreso_select_admin_management"
    ON public.onboarding_progreso FOR SELECT
    USING (public.get_current_user_rol() IN ('admin_rrhh', 'management'));

CREATE POLICY "onboarding_progreso_select_own"
    ON public.onboarding_progreso FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.onboarding_instancias oi
            JOIN public.empleados e ON e.id = oi.empleado_id
            WHERE oi.id = instancia_id AND e.user_id = auth.uid()
        )
    );

CREATE POLICY "onboarding_progreso_write_admin_management"
    ON public.onboarding_progreso FOR ALL
    USING (public.get_current_user_rol() IN ('admin_rrhh', 'management'));
