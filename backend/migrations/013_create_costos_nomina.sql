-- Costos de nómina por empleado y período mensual.
-- El campo total es una columna generada: suma automáticamente todos los componentes.
-- UNIQUE en (empleado_id, anio, mes) previene duplicados por período.

CREATE TABLE public.costos_nomina (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    empleado_id     UUID          NOT NULL REFERENCES public.empleados(id) ON DELETE RESTRICT,
    anio            SMALLINT      NOT NULL CHECK (anio BETWEEN 2000 AND 2100),
    mes             SMALLINT      NOT NULL CHECK (mes BETWEEN 1 AND 12),
    salario_bruto   NUMERIC(14,2) NOT NULL CHECK (salario_bruto >= 0),
    cargas_sociales NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (cargas_sociales >= 0),
    bonos           NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (bonos >= 0),
    otros_costos    NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (otros_costos >= 0),
    total           NUMERIC(14,2) GENERATED ALWAYS AS (salario_bruto + cargas_sociales + bonos + otros_costos) STORED,
    moneda          CHAR(3)       NOT NULL DEFAULT 'ARS',
    notas           TEXT,
    created_by      UUID          REFERENCES public.users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    UNIQUE (empleado_id, anio, mes)
);

ALTER TABLE public.costos_nomina ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_costos_nomina_updated_at
    BEFORE UPDATE ON public.costos_nomina
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_costos_nomina_empleado ON public.costos_nomina(empleado_id);
CREATE INDEX idx_costos_nomina_periodo  ON public.costos_nomina(anio, mes);

-- RLS Policies — costos son información sensible: solo admin_rrhh y management
CREATE POLICY "costos_nomina_select_admin_management"
    ON public.costos_nomina FOR SELECT
    USING (public.get_current_user_rol() IN ('admin_rrhh', 'management'));

CREATE POLICY "costos_nomina_write_admin"
    ON public.costos_nomina FOR ALL
    USING (public.get_current_user_rol() = 'admin_rrhh');
