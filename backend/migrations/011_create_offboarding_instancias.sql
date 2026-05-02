-- Proceso de offboarding cuando un empleado se desvincula de la empresa.
-- Registra el motivo de egreso, fechas clave y el resultado de la entrevista de salida.
-- ON DELETE RESTRICT en empleado_id: no se puede borrar un empleado con offboarding activo.

CREATE TABLE public.offboarding_instancias (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    empleado_id         UUID        NOT NULL REFERENCES public.empleados(id) ON DELETE RESTRICT,
    motivo_egreso       VARCHAR(30) NOT NULL CHECK (motivo_egreso IN ('renuncia', 'despido', 'acuerdo_mutuo', 'fin_contrato', 'jubilacion', 'fallecimiento', 'otro')),
    descripcion_motivo  TEXT,
    fecha_notificacion  DATE,
    fecha_ultimo_dia    DATE        NOT NULL,
    estado              VARCHAR(20) NOT NULL DEFAULT 'iniciado' CHECK (estado IN ('iniciado', 'en_proceso', 'completado', 'cancelado')),
    entrevista_salida   BOOLEAN     NOT NULL DEFAULT FALSE,
    notas_entrevista    TEXT,
    created_by          UUID        REFERENCES public.users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.offboarding_instancias ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_offboarding_instancias_updated_at
    BEFORE UPDATE ON public.offboarding_instancias
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_offboarding_instancias_empleado ON public.offboarding_instancias(empleado_id);
CREATE INDEX idx_offboarding_instancias_estado   ON public.offboarding_instancias(estado);

-- RLS Policies
CREATE POLICY "offboarding_instancias_select_admin_management"
    ON public.offboarding_instancias FOR SELECT
    USING (public.get_current_user_rol() IN ('admin_rrhh', 'management'));

CREATE POLICY "offboarding_instancias_write_admin"
    ON public.offboarding_instancias FOR ALL
    USING (public.get_current_user_rol() = 'admin_rrhh');
