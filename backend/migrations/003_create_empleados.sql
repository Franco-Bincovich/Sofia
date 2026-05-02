-- Tabla central del ciclo de vida del empleado. Cubre desde el ingreso hasta el egreso.
-- Soporta jerarquía (manager_id auto-referencial) y vinculación opcional con un usuario del sistema.
-- Cierra la FK diferida areas.responsable_id → empleados que quedó pendiente en 002.

CREATE TABLE public.empleados (
    id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID         REFERENCES public.users(id) ON DELETE SET NULL,
    legajo            VARCHAR(20)  UNIQUE,
    nombre            VARCHAR(100) NOT NULL,
    apellido          VARCHAR(100) NOT NULL,
    email_corporativo VARCHAR(255) UNIQUE,
    email_personal    VARCHAR(255),
    telefono          VARCHAR(30),
    fecha_nacimiento  DATE,
    fecha_ingreso     DATE         NOT NULL,
    fecha_egreso      DATE,
    area_id           UUID         REFERENCES public.areas(id) ON DELETE RESTRICT,
    cargo             VARCHAR(100),
    nivel             VARCHAR(20)  CHECK (nivel IN ('junior', 'semi_senior', 'senior', 'lider', 'manager', 'director', 'c_level')),
    modalidad_trabajo VARCHAR(20)  CHECK (modalidad_trabajo IN ('presencial', 'remoto', 'hibrido')),
    tipo_contrato     VARCHAR(20)  CHECK (tipo_contrato IN ('efectivo', 'plazo_fijo', 'contratado', 'pasantia')),
    estado            VARCHAR(20)  NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'baja', 'licencia', 'suspendido')),
    manager_id        UUID         REFERENCES public.empleados(id) ON DELETE SET NULL,
    foto_url          TEXT,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- FK diferida: areas.responsable_id → empleados (creada aquí para evitar dependencia circular)
ALTER TABLE public.areas
    ADD CONSTRAINT fk_areas_responsable
    FOREIGN KEY (responsable_id) REFERENCES public.empleados(id) ON DELETE SET NULL;

ALTER TABLE public.empleados ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_empleados_updated_at
    BEFORE UPDATE ON public.empleados
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_empleados_area    ON public.empleados(area_id);
CREATE INDEX idx_empleados_manager ON public.empleados(manager_id);
CREATE INDEX idx_empleados_estado  ON public.empleados(estado);
CREATE INDEX idx_empleados_user    ON public.empleados(user_id);

-- RLS Policies
CREATE POLICY "empleados_select_admin_management"
    ON public.empleados FOR SELECT
    USING (public.get_current_user_rol() IN ('admin_rrhh', 'management'));

CREATE POLICY "empleados_select_own"
    ON public.empleados FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "empleados_write_admin"
    ON public.empleados FOR ALL
    USING (public.get_current_user_rol() = 'admin_rrhh');
