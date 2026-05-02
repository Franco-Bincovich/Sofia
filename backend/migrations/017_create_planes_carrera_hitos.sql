-- Hitos del plan de carrera: capacitaciones, certificaciones, proyectos o mentorías.
-- Cada hito tiene tipo, fecha objetivo y estado de cumplimiento.
-- evidencia_url apunta a un documento en Storage o a un certificado externo.

CREATE TABLE public.planes_carrera_hitos (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id          UUID        NOT NULL REFERENCES public.planes_carrera(id) ON DELETE CASCADE,
    nombre           VARCHAR(200) NOT NULL,
    descripcion      TEXT,
    tipo             VARCHAR(20) NOT NULL CHECK (tipo IN ('capacitacion', 'certificacion', 'proyecto', 'mentoring', 'rotacion', 'otro')),
    fecha_objetivo   DATE,
    fecha_completada DATE,
    estado           VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_progreso', 'completado', 'cancelado')),
    evidencia_url    TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.planes_carrera_hitos ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_planes_carrera_hitos_updated_at
    BEFORE UPDATE ON public.planes_carrera_hitos
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_hitos_plan   ON public.planes_carrera_hitos(plan_id);
CREATE INDEX idx_hitos_estado ON public.planes_carrera_hitos(estado);

-- RLS Policies
CREATE POLICY "hitos_select_admin_management"
    ON public.planes_carrera_hitos FOR SELECT
    USING (public.get_current_user_rol() IN ('admin_rrhh', 'management'));

CREATE POLICY "hitos_select_own"
    ON public.planes_carrera_hitos FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.planes_carrera pc
            JOIN public.empleados e ON e.id = pc.empleado_id
            WHERE pc.id = plan_id AND e.user_id = auth.uid()
        )
    );

CREATE POLICY "hitos_write_admin_management"
    ON public.planes_carrera_hitos FOR ALL
    USING (public.get_current_user_rol() IN ('admin_rrhh', 'management'));
