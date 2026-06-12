-- 048_create_inventario_asignaciones.sql
-- Historial de asignaciones de ítems a empleados (una fila por asignación/devolución).
-- FK compuestas garantizan que ítem y empleado pertenecen a la misma empresa.
--
-- CLAVE — índice único PARCIAL (no UNIQUE simple):
--   CREATE UNIQUE INDEX ... WHERE fecha_devolucion IS NULL
--   → un ítem solo puede tener UNA asignación activa a la vez.
--   → el mismo ítem puede tener N asignaciones históricas (fecha_devolucion NOT NULL).
--   Esta semántica no es posible con un UNIQUE constraint simple.

BEGIN;

CREATE TABLE IF NOT EXISTS public.inventario_asignaciones (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id        UUID        NOT NULL,
    item_id           UUID        NOT NULL,
    empleado_id       UUID        NOT NULL,
    fecha_asignacion  DATE        NOT NULL DEFAULT CURRENT_DATE,
    fecha_devolucion  DATE,
    estado_devolucion TEXT        CHECK (
                                    estado_devolucion IN ('ok', 'con_daño')
                                    OR estado_devolucion IS NULL
                                  ),
    notas             TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT inv_asig_item_empresa_fk
        FOREIGN KEY (item_id, empresa_id)
        REFERENCES public.inventario_items(id, empresa_id),

    CONSTRAINT inv_asig_empleado_empresa_fk
        FOREIGN KEY (empleado_id, empresa_id)
        REFERENCES public.empleados(id, empresa_id)
);

-- Un ítem solo puede estar asignado a una persona a la vez.
CREATE UNIQUE INDEX IF NOT EXISTS idx_inv_asig_item_activo
    ON public.inventario_asignaciones (item_id)
    WHERE fecha_devolucion IS NULL;

CREATE INDEX IF NOT EXISTS idx_inv_asig_empresa  ON public.inventario_asignaciones (empresa_id);
CREATE INDEX IF NOT EXISTS idx_inv_asig_item     ON public.inventario_asignaciones (item_id);
CREATE INDEX IF NOT EXISTS idx_inv_asig_empleado ON public.inventario_asignaciones (empleado_id);

DROP TRIGGER IF EXISTS trg_inv_asig_updated_at ON public.inventario_asignaciones;
CREATE TRIGGER trg_inv_asig_updated_at
    BEFORE UPDATE ON public.inventario_asignaciones
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMIT;

NOTIFY pgrst, 'reload schema';
