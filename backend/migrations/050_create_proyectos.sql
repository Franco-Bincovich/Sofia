-- 050_create_proyectos.sql
-- Tabla raíz del módulo de proyectos.
-- empresa_id = empresa DUEÑA del proyecto (la que lo patrocina/lidera).
-- Las empresas colaboradoras se derivan de proyecto_asignaciones.empleado_empresa_id.
-- presupuesto: monto total estimado. El costo real se calcula en el service
-- sumando horas_proyecto.horas × horas_proyecto.valor_hora_snapshot.

BEGIN;

CREATE TABLE IF NOT EXISTS public.proyectos (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id      UUID          NOT NULL REFERENCES public.empresas(id),
    nombre          TEXT          NOT NULL,
    descripcion     TEXT,
    estado          TEXT          NOT NULL DEFAULT 'activo'
                                  CHECK (estado IN ('activo', 'pausado', 'cerrado', 'cancelado')),
    fecha_inicio    DATE,
    fecha_fin       DATE,
    presupuesto     NUMERIC(16,2) NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proyectos_empresa ON public.proyectos (empresa_id);
CREATE INDEX IF NOT EXISTS idx_proyectos_estado  ON public.proyectos (estado);

DROP TRIGGER IF EXISTS trg_proyectos_updated_at ON public.proyectos;
CREATE TRIGGER trg_proyectos_updated_at
    BEFORE UPDATE ON public.proyectos
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_auditoria_proyectos ON public.proyectos;
CREATE TRIGGER trg_auditoria_proyectos
    AFTER INSERT OR UPDATE OR DELETE ON public.proyectos
    FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria();

COMMIT;

NOTIFY pgrst, 'reload schema';
