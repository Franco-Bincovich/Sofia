-- 037_create_ausencias.sql
-- tipos_ausencia: catálogo global (sin empresa_id), sembrado con 4 tipos base.
-- solicitudes_ausencia: multiempresa; empresa_id heredado del empleado al crear.
-- NO se validan solapamientos (a diferencia de vacaciones).

BEGIN;

-- ── tipos_ausencia ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tipos_ausencia (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre     TEXT        NOT NULL UNIQUE,
    es_base    BOOLEAN     NOT NULL DEFAULT FALSE,
    activo     BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_ta_updated_at
    BEFORE UPDATE ON public.tipos_ausencia
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.tipos_ausencia (nombre, es_base, activo) VALUES
    ('Enfermedad',    TRUE, TRUE),
    ('Personal',      TRUE, TRUE),
    ('Injustificada', TRUE, TRUE),
    ('Otro',          TRUE, TRUE)
ON CONFLICT (nombre) DO NOTHING;

-- ── solicitudes_ausencia ───────────────────────────────────────────────────────
-- La FK compuesta (empleado_id, empresa_id) requiere UNIQUE en empleados.
-- La migración 036 ya lo crea con IF NOT EXISTS; aquí no es necesario recrearlo.

CREATE TABLE IF NOT EXISTS public.solicitudes_ausencia (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id  UUID        NOT NULL REFERENCES public.empresas(id),
    empleado_id UUID        NOT NULL,
    tipo_id     UUID        NOT NULL REFERENCES public.tipos_ausencia(id),
    fecha_desde DATE        NOT NULL,
    fecha_hasta DATE        NOT NULL,
    dias        INTEGER     NOT NULL CHECK (dias > 0),
    justificada BOOLEAN     NOT NULL DEFAULT FALSE,
    motivo      TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT sa_fechas_check CHECK (fecha_hasta >= fecha_desde),
    CONSTRAINT sa_empleado_empresa_fk
        FOREIGN KEY (empleado_id, empresa_id)
        REFERENCES public.empleados(id, empresa_id)
);

CREATE INDEX IF NOT EXISTS idx_sa_empresa_id  ON public.solicitudes_ausencia (empresa_id);
CREATE INDEX IF NOT EXISTS idx_sa_empleado_id ON public.solicitudes_ausencia (empleado_id);

CREATE TRIGGER trg_sa_updated_at
    BEFORE UPDATE ON public.solicitudes_ausencia
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_auditoria_sa
    AFTER INSERT OR UPDATE OR DELETE ON public.solicitudes_ausencia
    FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria();

NOTIFY pgrst, 'reload schema';

COMMIT;
