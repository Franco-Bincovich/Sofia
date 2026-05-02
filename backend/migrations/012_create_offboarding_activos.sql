-- Activos de la empresa que el empleado debe devolver durante el offboarding.
-- Ejemplos: laptop, celular, tarjeta de acceso, licencias de software, llaves.
-- Cada activo tiene un estado propio independiente del estado general del offboarding.

CREATE TABLE public.offboarding_activos (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    instancia_id     UUID         NOT NULL REFERENCES public.offboarding_instancias(id) ON DELETE CASCADE,
    tipo_activo      VARCHAR(30)  NOT NULL CHECK (tipo_activo IN ('laptop', 'celular', 'monitor', 'tarjeta_acceso', 'licencia_software', 'llave', 'uniforme', 'otro')),
    descripcion      VARCHAR(255),
    numero_serie     VARCHAR(100),
    estado           VARCHAR(20)  NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'devuelto', 'no_aplica', 'perdido')),
    fecha_devolucion DATE,
    recibido_por     UUID         REFERENCES public.users(id) ON DELETE SET NULL,
    notas            VARCHAR(500),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE public.offboarding_activos ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_offboarding_activos_updated_at
    BEFORE UPDATE ON public.offboarding_activos
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_offboarding_activos_instancia ON public.offboarding_activos(instancia_id);
CREATE INDEX idx_offboarding_activos_estado    ON public.offboarding_activos(estado);

-- RLS Policies
CREATE POLICY "offboarding_activos_select_admin_management"
    ON public.offboarding_activos FOR SELECT
    USING (public.get_current_user_rol() IN ('admin_rrhh', 'management'));

CREATE POLICY "offboarding_activos_write_admin"
    ON public.offboarding_activos FOR ALL
    USING (public.get_current_user_rol() = 'admin_rrhh');
