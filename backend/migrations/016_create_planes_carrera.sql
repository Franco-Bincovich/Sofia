-- Planes de desarrollo de carrera para empleados.
-- Define el cargo objetivo, plazos y el responsable del acompañamiento (manager o RRHH).
-- progreso es un porcentaje 0-100 calculado o actualizado manualmente por el responsable.

CREATE TABLE public.planes_carrera (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    empleado_id    UUID        NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
    cargo_objetivo VARCHAR(150) NOT NULL,
    descripcion    TEXT,
    fecha_inicio   DATE        NOT NULL DEFAULT CURRENT_DATE,
    fecha_objetivo DATE,
    estado         VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'completado', 'pausado', 'cancelado')),
    progreso       SMALLINT    NOT NULL DEFAULT 0 CHECK (progreso BETWEEN 0 AND 100),
    responsable_id UUID        REFERENCES public.empleados(id) ON DELETE SET NULL,
    notas          TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.planes_carrera ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_planes_carrera_updated_at
    BEFORE UPDATE ON public.planes_carrera
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_planes_carrera_empleado ON public.planes_carrera(empleado_id);
CREATE INDEX idx_planes_carrera_estado   ON public.planes_carrera(estado);

-- RLS Policies
CREATE POLICY "planes_carrera_select_admin_management"
    ON public.planes_carrera FOR SELECT
    USING (public.get_current_user_rol() IN ('admin_rrhh', 'management'));

CREATE POLICY "planes_carrera_select_own"
    ON public.planes_carrera FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.empleados e
            WHERE e.id = empleado_id AND e.user_id = auth.uid()
        )
    );

CREATE POLICY "planes_carrera_write_admin_management"
    ON public.planes_carrera FOR ALL
    USING (public.get_current_user_rol() IN ('admin_rrhh', 'management'));
