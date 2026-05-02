-- Plan de sucesión para posiciones clave de la organización.
-- Identifica titular, sucesor primario y secundario con su nivel de preparación.
-- Permite anticipar riesgos de rotación en roles críticos y planificar la cobertura.

CREATE TABLE public.sucesion_posiciones (
    id                           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    cargo                        VARCHAR(150) NOT NULL,
    area_id                      UUID        REFERENCES public.areas(id) ON DELETE SET NULL,
    titular_id                   UUID        REFERENCES public.empleados(id) ON DELETE SET NULL,
    sucesor_primario_id          UUID        REFERENCES public.empleados(id) ON DELETE SET NULL,
    sucesor_secundario_id        UUID        REFERENCES public.empleados(id) ON DELETE SET NULL,
    nivel_preparacion_primario   VARCHAR(20) CHECK (nivel_preparacion_primario IN ('listo_ya', '1_2_anios', '3_5_anios', 'potencial')),
    nivel_preparacion_secundario VARCHAR(20) CHECK (nivel_preparacion_secundario IN ('listo_ya', '1_2_anios', '3_5_anios', 'potencial')),
    criticidad                   VARCHAR(10) NOT NULL DEFAULT 'media' CHECK (criticidad IN ('baja', 'media', 'alta', 'critica')),
    estado                       VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'en_revision', 'cerrado')),
    notas                        TEXT,
    created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.sucesion_posiciones ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_sucesion_posiciones_updated_at
    BEFORE UPDATE ON public.sucesion_posiciones
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_sucesion_area           ON public.sucesion_posiciones(area_id);
CREATE INDEX idx_sucesion_titular        ON public.sucesion_posiciones(titular_id);
CREATE INDEX idx_sucesion_criticidad     ON public.sucesion_posiciones(criticidad);

-- RLS Policies
CREATE POLICY "sucesion_select_admin_management"
    ON public.sucesion_posiciones FOR SELECT
    USING (public.get_current_user_rol() IN ('admin_rrhh', 'management'));

CREATE POLICY "sucesion_write_admin"
    ON public.sucesion_posiciones FOR ALL
    USING (public.get_current_user_rol() = 'admin_rrhh');
