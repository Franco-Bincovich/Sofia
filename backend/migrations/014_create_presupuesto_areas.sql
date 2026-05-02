-- Presupuesto de personal por área y período. Permite comparar gasto ejecutado vs presupuestado.
-- mes NULL representa el presupuesto anual del área; mes con valor representa un mes específico.
-- UNIQUE en (area_id, anio, mes, tipo_costo) evita duplicados por período y tipo.

CREATE TABLE public.presupuesto_areas (
    id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    area_id             UUID          NOT NULL REFERENCES public.areas(id) ON DELETE RESTRICT,
    anio                SMALLINT      NOT NULL CHECK (anio BETWEEN 2000 AND 2100),
    mes                 SMALLINT      CHECK (mes BETWEEN 1 AND 12),
    tipo_costo          VARCHAR(20)   NOT NULL CHECK (tipo_costo IN ('nomina', 'beneficios', 'capacitacion', 'reclutamiento', 'total')),
    monto_presupuestado NUMERIC(16,2) NOT NULL CHECK (monto_presupuestado >= 0),
    monto_ejecutado     NUMERIC(16,2) NOT NULL DEFAULT 0 CHECK (monto_ejecutado >= 0),
    moneda              CHAR(3)       NOT NULL DEFAULT 'ARS',
    notas               TEXT,
    created_by          UUID          REFERENCES public.users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    UNIQUE (area_id, anio, mes, tipo_costo)
);

ALTER TABLE public.presupuesto_areas ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_presupuesto_areas_updated_at
    BEFORE UPDATE ON public.presupuesto_areas
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_presupuesto_areas_area    ON public.presupuesto_areas(area_id);
CREATE INDEX idx_presupuesto_areas_periodo ON public.presupuesto_areas(anio, mes);

-- RLS Policies
CREATE POLICY "presupuesto_areas_select_admin_management"
    ON public.presupuesto_areas FOR SELECT
    USING (public.get_current_user_rol() IN ('admin_rrhh', 'management'));

CREATE POLICY "presupuesto_areas_write_admin"
    ON public.presupuesto_areas FOR ALL
    USING (public.get_current_user_rol() = 'admin_rrhh');
