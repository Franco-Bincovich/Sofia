-- 039_create_empleado_capacitacion.sql
-- Asignación de una capacitación a un empleado con seguimiento de estado y certificado.
-- FK compuesta garantiza que empleado y capacitación son de la misma empresa.
-- UNIQUE(capacitacion_id, empleado_id) impide asignar el mismo curso dos veces al mismo empleado.

BEGIN;

CREATE TABLE IF NOT EXISTS public.empleado_capacitacion (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id        UUID        NOT NULL,
    capacitacion_id   UUID        NOT NULL,
    empleado_id       UUID        NOT NULL,
    estado            TEXT        NOT NULL DEFAULT 'pendiente'
                                  CHECK (estado IN ('pendiente', 'en_curso', 'completado')),
    fecha_asignacion  DATE,
    fecha_limite      DATE,
    fecha_completado  DATE,
    certificado_url   TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (capacitacion_id, empleado_id),

    CONSTRAINT ec_capacitacion_empresa_fk
        FOREIGN KEY (capacitacion_id, empresa_id)
        REFERENCES public.capacitaciones(id, empresa_id),

    CONSTRAINT ec_empleado_empresa_fk
        FOREIGN KEY (empleado_id, empresa_id)
        REFERENCES public.empleados(id, empresa_id)
);

CREATE INDEX IF NOT EXISTS idx_ec_empresa_id      ON public.empleado_capacitacion (empresa_id);
CREATE INDEX IF NOT EXISTS idx_ec_empleado_id     ON public.empleado_capacitacion (empleado_id);
CREATE INDEX IF NOT EXISTS idx_ec_capacitacion_id ON public.empleado_capacitacion (capacitacion_id);

CREATE TRIGGER trg_ec_updated_at
    BEFORE UPDATE ON public.empleado_capacitacion
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_auditoria_ec
    AFTER INSERT OR UPDATE OR DELETE ON public.empleado_capacitacion
    FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria();

NOTIFY pgrst, 'reload schema';

COMMIT;
