-- 036_create_solicitudes_vacaciones.sql
-- Tabla de registros de vacaciones.
-- empresa_id se hereda del empleado al crear (no lo provee el usuario directamente).
-- Estado (planificada/tomada/cancelada) es DERIVADO al leer: solo se persiste la columna `cancelada`.

BEGIN;

-- La FK compuesta (empleado_id, empresa_id) → empleados(id, empresa_id) requiere
-- un UNIQUE constraint explícito en empleados sobre esas dos columnas.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'empleados_id_empresa_uq'
      AND conrelid = 'public.empleados'::regclass
  ) THEN
    ALTER TABLE public.empleados
      ADD CONSTRAINT empleados_id_empresa_uq UNIQUE (id, empresa_id);
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.solicitudes_vacaciones (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id  UUID        NOT NULL REFERENCES public.empresas(id),
    empleado_id UUID        NOT NULL,
    fecha_desde DATE        NOT NULL,
    fecha_hasta DATE        NOT NULL,
    dias        INTEGER     NOT NULL CHECK (dias > 0),
    comentario  TEXT,
    cancelada   BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT sv_fechas_check
        CHECK (fecha_hasta >= fecha_desde),
    CONSTRAINT sv_empleado_empresa_fk
        FOREIGN KEY (empleado_id, empresa_id)
        REFERENCES public.empleados(id, empresa_id)
);

CREATE INDEX IF NOT EXISTS idx_sv_empresa_id
    ON public.solicitudes_vacaciones (empresa_id);

CREATE INDEX IF NOT EXISTS idx_sv_empleado_id
    ON public.solicitudes_vacaciones (empleado_id);

CREATE TRIGGER trg_sv_updated_at
    BEFORE UPDATE ON public.solicitudes_vacaciones
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_auditoria_sv
    AFTER INSERT OR UPDATE OR DELETE ON public.solicitudes_vacaciones
    FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria();

ALTER TABLE public.solicitudes_vacaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sv_select_authenticated"
    ON public.solicitudes_vacaciones FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "sv_write_admin"
    ON public.solicitudes_vacaciones FOR ALL
    USING (public.get_current_user_rol() = 'admin_rrhh');

COMMIT;

NOTIFY pgrst, 'reload schema';
