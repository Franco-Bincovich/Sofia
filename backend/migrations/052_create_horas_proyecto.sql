-- 052_create_horas_proyecto.sql
-- Registro de horas trabajadas en un proyecto, cargadas internamente por RRHH.
-- asignacion_id: de aquí se lee valor_hora al insertar → se congela en valor_hora_snapshot.
-- proyecto_id / empresa_id / empleado_empresa_id: denormalizados para filtros
--   directos sin joins adicionales.
-- valor_hora_snapshot: congelado al momento de la carga. Cambiar la tarifa
--   en proyecto_asignaciones NO altera registros ya cargados.
-- Sin updated_at: los registros de horas son inmutables (delete + re-insert si hay error).
-- Sin link público de carga en esta migración (sesión posterior).

BEGIN;

CREATE TABLE IF NOT EXISTS public.horas_proyecto (
    id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    asignacion_id       UUID          NOT NULL REFERENCES public.proyecto_asignaciones(id),
    proyecto_id         UUID          NOT NULL REFERENCES public.proyectos(id),
    empresa_id          UUID          NOT NULL REFERENCES public.empresas(id),
    empleado_empresa_id UUID          NOT NULL REFERENCES public.empresas(id),
    fecha               DATE          NOT NULL,
    horas               NUMERIC(6,2)  NOT NULL CHECK (horas > 0),
    valor_hora_snapshot NUMERIC(16,2) NOT NULL,
    descripcion         TEXT,
    cargado_por         UUID          REFERENCES public.users(id),
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hp_proyecto   ON public.horas_proyecto (proyecto_id);
CREATE INDEX IF NOT EXISTS idx_hp_asignacion ON public.horas_proyecto (asignacion_id);
CREATE INDEX IF NOT EXISTS idx_hp_empresa    ON public.horas_proyecto (empresa_id);
CREATE INDEX IF NOT EXISTS idx_hp_fecha      ON public.horas_proyecto (fecha);

DROP TRIGGER IF EXISTS trg_auditoria_hp ON public.horas_proyecto;
CREATE TRIGGER trg_auditoria_hp
    AFTER INSERT OR UPDATE OR DELETE ON public.horas_proyecto
    FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria();

COMMIT;

NOTIFY pgrst, 'reload schema';
