-- 047_create_inventario_items.sql
-- Catálogo de ítems de inventario por empresa.
-- UNIQUE(id, empresa_id) requerido para FK compuesta de inventario_asignaciones.
-- estado: se actualiza automáticamente al asignar/devolver (gestionado por el service).

BEGIN;

CREATE TABLE IF NOT EXISTS public.inventario_items (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id   UUID        NOT NULL REFERENCES public.empresas(id),
    nombre       TEXT        NOT NULL,
    descripcion  TEXT,
    tipo         TEXT        NOT NULL,
    numero_serie TEXT,
    estado       TEXT        NOT NULL DEFAULT 'disponible'
                             CHECK (estado IN ('disponible', 'asignado', 'en_reparacion', 'baja')),
    fecha_alta   DATE        NOT NULL DEFAULT CURRENT_DATE,
    costo        NUMERIC,
    notas        TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (id, empresa_id)
);

CREATE INDEX IF NOT EXISTS idx_inv_items_empresa ON public.inventario_items (empresa_id);
CREATE INDEX IF NOT EXISTS idx_inv_items_estado  ON public.inventario_items (estado);

DROP TRIGGER IF EXISTS trg_inv_items_updated_at ON public.inventario_items;
CREATE TRIGGER trg_inv_items_updated_at
    BEFORE UPDATE ON public.inventario_items
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_auditoria_inv_items ON public.inventario_items;
CREATE TRIGGER trg_auditoria_inv_items
    AFTER INSERT OR UPDATE OR DELETE ON public.inventario_items
    FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria();

COMMIT;

NOTIFY pgrst, 'reload schema';
