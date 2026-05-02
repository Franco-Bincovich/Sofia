-- Áreas / departamentos de la organización. Soporta jerarquía mediante auto-referencia.
-- El campo responsable_id recibe su FK constraint en 003 para evitar dependencia circular con empleados.

CREATE TABLE public.areas (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre         VARCHAR(100) NOT NULL,
    codigo         VARCHAR(20)  UNIQUE,
    descripcion    TEXT,
    area_padre_id  UUID         REFERENCES public.areas(id) ON DELETE RESTRICT,
    responsable_id UUID,
    nivel          SMALLINT     NOT NULL DEFAULT 1 CHECK (nivel BETWEEN 1 AND 10),
    activo         BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_areas_updated_at
    BEFORE UPDATE ON public.areas
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_areas_padre  ON public.areas(area_padre_id);
CREATE INDEX idx_areas_activo ON public.areas(activo);

-- RLS Policies
CREATE POLICY "areas_select_authenticated"
    ON public.areas FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "areas_write_admin"
    ON public.areas FOR ALL
    USING (public.get_current_user_rol() = 'admin_rrhh');
