-- 049_create_objetivos.sql
-- Tablero de objetivos/tareas del equipo de RRHH. Una sola tabla, sin jerarquía.
-- responsable_id → public.users (operadores RRHH), NO empleados.
-- empresa_id NOT NULL: todos los objetivos están ligados a una empresa concreta.
-- estado: CHECK en la tabla; el movimiento kanban es por_hacer → haciendo → terminado.

BEGIN;

CREATE TABLE IF NOT EXISTS public.objetivos (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id      UUID        NOT NULL REFERENCES public.empresas(id),
    responsable_id  UUID        NOT NULL REFERENCES public.users(id),
    titulo          TEXT        NOT NULL,
    descripcion     TEXT,
    prioridad       TEXT        NOT NULL DEFAULT 'media'
                                CHECK (prioridad IN ('baja', 'media', 'alta')),
    estado          TEXT        NOT NULL DEFAULT 'por_hacer'
                                CHECK (estado IN ('por_hacer', 'haciendo', 'terminado')),
    fecha_entrega   DATE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_obj_empresa     ON public.objetivos (empresa_id);
CREATE INDEX IF NOT EXISTS idx_obj_responsable ON public.objetivos (responsable_id);
CREATE INDEX IF NOT EXISTS idx_obj_estado      ON public.objetivos (estado);

DROP TRIGGER IF EXISTS trg_obj_updated_at ON public.objetivos;
CREATE TRIGGER trg_obj_updated_at
    BEFORE UPDATE ON public.objetivos
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_auditoria_obj ON public.objetivos;
CREATE TRIGGER trg_auditoria_obj
    AFTER INSERT OR UPDATE OR DELETE ON public.objetivos
    FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria();

COMMIT;

NOTIFY pgrst, 'reload schema';
