-- 051_create_proyecto_asignaciones.sql
-- Asignación de un empleado a un proyecto.
-- empleado_id: FK SIMPLE a empleados(id) — PK global, no compuesta.
--   El empleado puede pertenecer a una empresa DISTINTA a la dueña del proyecto.
-- empleado_empresa_id: empresa del empleado, poblada por el service al hacer lookup
--   de empleados.empresa_id. No se hereda del proyecto.
-- valor_hora: tarifa acordada para ESTE empleado en ESTE proyecto.
--   Al cargar horas se congela en horas_proyecto.valor_hora_snapshot.
-- UNIQUE(proyecto_id, empleado_id): un empleado no puede asignarse dos veces al mismo proyecto.

BEGIN;

CREATE TABLE IF NOT EXISTS public.proyecto_asignaciones (
    id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    proyecto_id         UUID          NOT NULL REFERENCES public.proyectos(id),
    empleado_id         UUID          NOT NULL REFERENCES public.empleados(id),
    empleado_empresa_id UUID          NOT NULL REFERENCES public.empresas(id),
    rol                 TEXT          NOT NULL,
    valor_hora          NUMERIC(16,2) NOT NULL DEFAULT 0,
    fecha_desde         DATE,
    fecha_hasta         DATE,
    activo              BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_proyecto_empleado UNIQUE (proyecto_id, empleado_id)
);

CREATE INDEX IF NOT EXISTS idx_pa_proyecto    ON public.proyecto_asignaciones (proyecto_id);
CREATE INDEX IF NOT EXISTS idx_pa_empleado    ON public.proyecto_asignaciones (empleado_id);
CREATE INDEX IF NOT EXISTS idx_pa_emp_empresa ON public.proyecto_asignaciones (empleado_empresa_id);

DROP TRIGGER IF EXISTS trg_pa_updated_at ON public.proyecto_asignaciones;
CREATE TRIGGER trg_pa_updated_at
    BEFORE UPDATE ON public.proyecto_asignaciones
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_auditoria_pa ON public.proyecto_asignaciones;
CREATE TRIGGER trg_auditoria_pa
    AFTER INSERT OR UPDATE OR DELETE ON public.proyecto_asignaciones
    FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria();

COMMIT;

NOTIFY pgrst, 'reload schema';
