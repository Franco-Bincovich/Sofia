-- Vacantes o posiciones abiertas en la empresa.
-- Cada vacante pertenece a un área, tiene un responsable de reclutamiento y un pipeline de estados.
-- rango_salarial_min/max son opcionales; se ocultan o muestran según política de la empresa.

CREATE TABLE public.vacantes (
    id                 UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo             VARCHAR(150)  NOT NULL,
    area_id            UUID          REFERENCES public.areas(id) ON DELETE RESTRICT,
    descripcion        TEXT,
    requisitos         TEXT,
    modalidad          VARCHAR(20)   CHECK (modalidad IN ('presencial', 'remoto', 'hibrido')),
    tipo_contrato      VARCHAR(20)   CHECK (tipo_contrato IN ('efectivo', 'plazo_fijo', 'contratado', 'pasantia')),
    nivel              VARCHAR(20)   CHECK (nivel IN ('junior', 'semi_senior', 'senior', 'lider', 'manager', 'director', 'c_level')),
    rango_salarial_min NUMERIC(12,2) CHECK (rango_salarial_min >= 0),
    rango_salarial_max NUMERIC(12,2) CHECK (rango_salarial_max >= 0),
    moneda             CHAR(3)       NOT NULL DEFAULT 'ARS',
    cantidad_puestos   SMALLINT      NOT NULL DEFAULT 1 CHECK (cantidad_puestos > 0),
    estado             VARCHAR(20)   NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador', 'activa', 'pausada', 'cerrada', 'cancelada')),
    prioridad          VARCHAR(10)   NOT NULL DEFAULT 'media' CHECK (prioridad IN ('baja', 'media', 'alta', 'urgente')),
    fecha_apertura     DATE,
    fecha_cierre       DATE,
    responsable_id     UUID          REFERENCES public.users(id) ON DELETE SET NULL,
    created_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_rango_salarial CHECK (
        rango_salarial_max IS NULL OR rango_salarial_min IS NULL OR
        rango_salarial_max >= rango_salarial_min
    )
);

ALTER TABLE public.vacantes ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_vacantes_updated_at
    BEFORE UPDATE ON public.vacantes
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_vacantes_area         ON public.vacantes(area_id);
CREATE INDEX idx_vacantes_estado       ON public.vacantes(estado);
CREATE INDEX idx_vacantes_responsable  ON public.vacantes(responsable_id);

-- RLS Policies
CREATE POLICY "vacantes_select_admin_management"
    ON public.vacantes FOR SELECT
    USING (public.get_current_user_rol() IN ('admin_rrhh', 'management'));

CREATE POLICY "vacantes_write_admin"
    ON public.vacantes FOR ALL
    USING (public.get_current_user_rol() = 'admin_rrhh');

CREATE POLICY "vacantes_insert_management"
    ON public.vacantes FOR INSERT
    WITH CHECK (public.get_current_user_rol() IN ('admin_rrhh', 'management'));
