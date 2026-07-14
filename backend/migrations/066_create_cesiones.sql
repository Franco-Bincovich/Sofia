-- 066_create_cesiones.sql
--
-- POR QUÉ:
-- Un empleado puede tener 0..N "cesiones": momentos en que estuvo cedido/trabajando en otra
-- empresa y volvió. Cada cesión = una FECHA (ingreso reconocido al volver) + el NOMBRE de la
-- empresa externa (texto libre). Hoy el dato vive aplanado en empleados.fecha_ingreso_reconocida;
-- su migración a esta tabla es una pieza POSTERIOR — acá NO se toca esa columna.
--
-- MODELO:
--   * empleado_id: FK a empleados, ON DELETE CASCADE (borrar el empleado borra sus cesiones).
--   * empresa_id: empresa DUEÑA/actual del empleado (aislamiento multiempresa, mismo criterio
--     que el resto de las tablas hijas). El service lo hereda de empleados.empresa_id.
--   * fecha: fecha de la cesión (ingreso reconocido). empresa_cesion: empresa externa (texto libre).
--
-- RLS: se HABILITA sin policies (deny-all directo para anon/authenticated). El backend accede
-- con service_key (supabase_admin, bypasea RLS) y el control real es APP-LEVEL (require_permission
-- por Seccion.EMPLEADOS). Mismo criterio que 061 (adjuntos): no se replican policies del modelo viejo.
--
-- Idempotente: CREATE TABLE / INDEX ... IF NOT EXISTS. NO se ejecuta acá (la corre Franco).

BEGIN;

CREATE TABLE IF NOT EXISTS public.cesiones (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    empleado_id    UUID        NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
    empresa_id     UUID        NOT NULL REFERENCES public.empresas(id),
    fecha          DATE        NOT NULL,
    empresa_cesion TEXT        NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cesiones_empleado ON public.cesiones(empleado_id);
CREATE INDEX IF NOT EXISTS idx_cesiones_empresa  ON public.cesiones(empresa_id);

-- updated_at automático (misma función que empleados/proyectos).
DROP TRIGGER IF EXISTS trg_cesiones_updated_at ON public.cesiones;
CREATE TRIGGER trg_cesiones_updated_at
    BEFORE UPDATE ON public.cesiones
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.cesiones ENABLE ROW LEVEL SECURITY;

COMMIT;

NOTIFY pgrst, 'reload schema';
