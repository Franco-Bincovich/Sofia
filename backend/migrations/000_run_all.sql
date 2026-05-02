-- ============================================================
-- HR Karstec — Schema completo de base de datos
-- Ejecutar este archivo en el SQL Editor de Supabase para
-- provisionar todas las tablas, funciones, triggers y policies
-- en un único paso.
-- Orden: 001 → 024 (respeta dependencias entre tablas)
-- ============================================================


-- ============================================================
-- 001_create_users.sql
-- ============================================================

-- Extiende auth.users de Supabase con el perfil del usuario y el rol en el sistema.
-- Es la tabla central de identidad: todo acceso a la plataforma parte de aquí.
-- También define la función helper get_current_user_rol() usada por las policies de todas las tablas.

CREATE TABLE public.users (
    id            UUID         PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email         VARCHAR(255) NOT NULL UNIQUE,
    nombre        VARCHAR(100) NOT NULL,
    apellido      VARCHAR(100) NOT NULL,
    rol           VARCHAR(20)  NOT NULL CHECK (rol IN ('admin_rrhh', 'management', 'empleado')),
    avatar_url    TEXT,
    activo        BOOLEAN      NOT NULL DEFAULT TRUE,
    ultimo_acceso TIMESTAMPTZ,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Función SECURITY DEFINER: evita referencias circulares en policies de otras tablas.
-- Bypasses RLS al consultar users para que la policy no se llame recursivamente.
CREATE OR REPLACE FUNCTION public.get_current_user_rol()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT rol FROM public.users WHERE id = auth.uid()
$$;

-- Función genérica para mantener updated_at; usada por triggers de múltiples tablas.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS Policies
CREATE POLICY "users_select_own"
    ON public.users FOR SELECT
    USING (id = auth.uid());

CREATE POLICY "users_select_admin_management"
    ON public.users FOR SELECT
    USING (public.get_current_user_rol() IN ('admin_rrhh', 'management'));

CREATE POLICY "users_insert_admin"
    ON public.users FOR INSERT
    WITH CHECK (public.get_current_user_rol() = 'admin_rrhh');

CREATE POLICY "users_update_own"
    ON public.users FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

CREATE POLICY "users_update_admin"
    ON public.users FOR UPDATE
    USING (public.get_current_user_rol() = 'admin_rrhh');

CREATE POLICY "users_delete_admin"
    ON public.users FOR DELETE
    USING (public.get_current_user_rol() = 'admin_rrhh');


-- ============================================================
-- 002_create_areas.sql
-- ============================================================

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


-- ============================================================
-- 003_create_empleados.sql
-- ============================================================

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


-- ============================================================
-- 004_create_documentos_empleado.sql
-- ============================================================

-- Documentos adjuntos a cada empleado almacenados en Supabase Storage.
-- storage_path es la ruta relativa dentro del bucket; la URL pública se construye en el backend.
-- tipos: contrato, recibo_sueldo, certificado, dni, curriculum, evaluacion, otro.

CREATE TABLE public.documentos_empleado (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    empleado_id    UUID         NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
    tipo           VARCHAR(30)  NOT NULL CHECK (tipo IN ('contrato', 'recibo_sueldo', 'certificado', 'dni', 'curriculum', 'evaluacion', 'otro')),
    nombre_archivo VARCHAR(255) NOT NULL,
    descripcion    VARCHAR(500),
    bucket         VARCHAR(50)  NOT NULL DEFAULT 'documentos',
    storage_path   TEXT         NOT NULL,
    tamano_bytes   BIGINT       CHECK (tamano_bytes > 0),
    mime_type      VARCHAR(100),
    estado         VARCHAR(20)  NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'archivado', 'eliminado')),
    subido_por     UUID         REFERENCES public.users(id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE public.documentos_empleado ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_documentos_empleado ON public.documentos_empleado(empleado_id);
CREATE INDEX idx_documentos_tipo     ON public.documentos_empleado(tipo);
CREATE INDEX idx_documentos_estado   ON public.documentos_empleado(estado);

-- RLS Policies
CREATE POLICY "documentos_select_admin_management"
    ON public.documentos_empleado FOR SELECT
    USING (public.get_current_user_rol() IN ('admin_rrhh', 'management'));

CREATE POLICY "documentos_select_own"
    ON public.documentos_empleado FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.empleados e
            WHERE e.id = empleado_id AND e.user_id = auth.uid()
        )
    );

CREATE POLICY "documentos_write_admin"
    ON public.documentos_empleado FOR ALL
    USING (public.get_current_user_rol() = 'admin_rrhh');


-- ============================================================
-- 005_create_vacantes.sql
-- ============================================================

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


-- ============================================================
-- 006_create_candidatos.sql
-- ============================================================

-- Candidatos que se postulan a vacantes. Modela el pipeline de reclutamiento.
-- Una fila por postulación: el mismo candidato puede tener filas en distintas vacantes.
-- cv_storage_path es la ruta en el bucket 'cvs' de Supabase Storage.

CREATE TABLE public.candidatos (
    id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    vacante_id        UUID         NOT NULL REFERENCES public.vacantes(id) ON DELETE CASCADE,
    nombre            VARCHAR(100) NOT NULL,
    apellido          VARCHAR(100) NOT NULL,
    email             VARCHAR(255) NOT NULL,
    telefono          VARCHAR(30),
    cv_url            TEXT,
    cv_storage_path   TEXT,
    linkedin_url      TEXT,
    fuente            VARCHAR(30)  CHECK (fuente IN ('linkedin', 'referido', 'web', 'consultora', 'espontanea', 'otra')),
    etapa             VARCHAR(30)  NOT NULL DEFAULT 'recibido' CHECK (etapa IN ('recibido', 'revision_cv', 'entrevista_rrhh', 'entrevista_tecnica', 'entrevista_management', 'oferta', 'contratado', 'descartado')),
    estado            VARCHAR(20)  NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'descartado', 'contratado', 'en_espera')),
    notas             TEXT,
    puntuacion        SMALLINT     CHECK (puntuacion BETWEEN 1 AND 10),
    entrevistador_id  UUID         REFERENCES public.users(id) ON DELETE SET NULL,
    fecha_postulacion DATE         NOT NULL DEFAULT CURRENT_DATE,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE public.candidatos ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_candidatos_updated_at
    BEFORE UPDATE ON public.candidatos
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_candidatos_vacante ON public.candidatos(vacante_id);
CREATE INDEX idx_candidatos_etapa   ON public.candidatos(etapa);
CREATE INDEX idx_candidatos_email   ON public.candidatos(email);

-- RLS Policies
CREATE POLICY "candidatos_select_admin_management"
    ON public.candidatos FOR SELECT
    USING (public.get_current_user_rol() IN ('admin_rrhh', 'management'));

CREATE POLICY "candidatos_write_admin_management"
    ON public.candidatos FOR ALL
    USING (public.get_current_user_rol() IN ('admin_rrhh', 'management'));


-- ============================================================
-- 007_create_onboarding_templates.sql
-- ============================================================

-- Plantillas de onboarding reutilizables. Pueden ser genéricas o específicas por área.
-- Definen la estructura base de tareas que se instancian al contratar un nuevo empleado.
-- area_id NULL indica que la plantilla aplica a toda la organización.

CREATE TABLE public.onboarding_templates (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre        VARCHAR(150) NOT NULL,
    descripcion   TEXT,
    area_id       UUID         REFERENCES public.areas(id) ON DELETE SET NULL,
    duracion_dias SMALLINT     NOT NULL DEFAULT 30 CHECK (duracion_dias > 0),
    activo        BOOLEAN      NOT NULL DEFAULT TRUE,
    created_by    UUID         REFERENCES public.users(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE public.onboarding_templates ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_onboarding_templates_updated_at
    BEFORE UPDATE ON public.onboarding_templates
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_onboarding_templates_area   ON public.onboarding_templates(area_id);
CREATE INDEX idx_onboarding_templates_activo ON public.onboarding_templates(activo);

-- RLS Policies
CREATE POLICY "onboarding_templates_select_admin_management"
    ON public.onboarding_templates FOR SELECT
    USING (public.get_current_user_rol() IN ('admin_rrhh', 'management'));

CREATE POLICY "onboarding_templates_write_admin"
    ON public.onboarding_templates FOR ALL
    USING (public.get_current_user_rol() = 'admin_rrhh');


-- ============================================================
-- 008_create_onboarding_tareas.sql
-- ============================================================

-- Tareas individuales que componen una plantilla de onboarding.
-- El campo orden define la secuencia sugerida de ejecución dentro de la plantilla.
-- responsable_tipo indica quién es el responsable de completar cada tarea.

CREATE TABLE public.onboarding_tareas (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id      UUID         NOT NULL REFERENCES public.onboarding_templates(id) ON DELETE CASCADE,
    nombre           VARCHAR(200) NOT NULL,
    descripcion      TEXT,
    responsable_tipo VARCHAR(20)  NOT NULL CHECK (responsable_tipo IN ('rrhh', 'manager', 'empleado', 'ti', 'administracion')),
    orden            SMALLINT     NOT NULL DEFAULT 1 CHECK (orden > 0),
    dias_limite      SMALLINT     NOT NULL DEFAULT 1 CHECK (dias_limite > 0),
    obligatoria      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE public.onboarding_tareas ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_onboarding_tareas_template ON public.onboarding_tareas(template_id);
CREATE INDEX idx_onboarding_tareas_orden    ON public.onboarding_tareas(template_id, orden);

-- RLS Policies
CREATE POLICY "onboarding_tareas_select_admin_management"
    ON public.onboarding_tareas FOR SELECT
    USING (public.get_current_user_rol() IN ('admin_rrhh', 'management'));

CREATE POLICY "onboarding_tareas_write_admin"
    ON public.onboarding_tareas FOR ALL
    USING (public.get_current_user_rol() = 'admin_rrhh');


-- ============================================================
-- 009_create_onboarding_instancias.sql
-- ============================================================

-- Instancia de onboarding activa para un empleado específico.
-- Se crea al dar de alta un nuevo empleado aplicando una plantilla.
-- Las filas de progreso (010) se generan automáticamente al crear la instancia.

CREATE TABLE public.onboarding_instancias (
    id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    empleado_id        UUID        NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
    template_id        UUID        NOT NULL REFERENCES public.onboarding_templates(id) ON DELETE RESTRICT,
    fecha_inicio       DATE        NOT NULL DEFAULT CURRENT_DATE,
    fecha_fin_esperada DATE,
    fecha_completada   DATE,
    estado             VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_progreso', 'completado', 'cancelado')),
    created_by         UUID        REFERENCES public.users(id) ON DELETE SET NULL,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.onboarding_instancias ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_onboarding_instancias_updated_at
    BEFORE UPDATE ON public.onboarding_instancias
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_onboarding_instancias_empleado ON public.onboarding_instancias(empleado_id);
CREATE INDEX idx_onboarding_instancias_estado   ON public.onboarding_instancias(estado);

-- RLS Policies
CREATE POLICY "onboarding_instancias_select_admin_management"
    ON public.onboarding_instancias FOR SELECT
    USING (public.get_current_user_rol() IN ('admin_rrhh', 'management'));

CREATE POLICY "onboarding_instancias_select_own"
    ON public.onboarding_instancias FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.empleados e
            WHERE e.id = empleado_id AND e.user_id = auth.uid()
        )
    );

CREATE POLICY "onboarding_instancias_write_admin"
    ON public.onboarding_instancias FOR ALL
    USING (public.get_current_user_rol() = 'admin_rrhh');


-- ============================================================
-- 010_create_onboarding_progreso.sql
-- ============================================================

-- Progreso de cada tarea dentro de una instancia de onboarding.
-- Una fila por combinación única instancia-tarea; se pobla al crear la instancia.
-- El UNIQUE garantiza que no se duplique el seguimiento de una misma tarea.

CREATE TABLE public.onboarding_progreso (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    instancia_id     UUID        NOT NULL REFERENCES public.onboarding_instancias(id) ON DELETE CASCADE,
    tarea_id         UUID        NOT NULL REFERENCES public.onboarding_tareas(id) ON DELETE CASCADE,
    estado           VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_progreso', 'completado', 'omitido')),
    fecha_completada TIMESTAMPTZ,
    completado_por   UUID        REFERENCES public.users(id) ON DELETE SET NULL,
    notas            TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (instancia_id, tarea_id)
);

ALTER TABLE public.onboarding_progreso ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_onboarding_progreso_updated_at
    BEFORE UPDATE ON public.onboarding_progreso
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_onboarding_progreso_instancia ON public.onboarding_progreso(instancia_id);
CREATE INDEX idx_onboarding_progreso_estado    ON public.onboarding_progreso(estado);

-- RLS Policies
CREATE POLICY "onboarding_progreso_select_admin_management"
    ON public.onboarding_progreso FOR SELECT
    USING (public.get_current_user_rol() IN ('admin_rrhh', 'management'));

CREATE POLICY "onboarding_progreso_select_own"
    ON public.onboarding_progreso FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.onboarding_instancias oi
            JOIN public.empleados e ON e.id = oi.empleado_id
            WHERE oi.id = instancia_id AND e.user_id = auth.uid()
        )
    );

CREATE POLICY "onboarding_progreso_write_admin_management"
    ON public.onboarding_progreso FOR ALL
    USING (public.get_current_user_rol() IN ('admin_rrhh', 'management'));


-- ============================================================
-- 011_create_offboarding_instancias.sql
-- ============================================================

-- Proceso de offboarding cuando un empleado se desvincula de la empresa.
-- Registra el motivo de egreso, fechas clave y el resultado de la entrevista de salida.
-- ON DELETE RESTRICT en empleado_id: no se puede borrar un empleado con offboarding activo.

CREATE TABLE public.offboarding_instancias (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    empleado_id         UUID        NOT NULL REFERENCES public.empleados(id) ON DELETE RESTRICT,
    motivo_egreso       VARCHAR(30) NOT NULL CHECK (motivo_egreso IN ('renuncia', 'despido', 'acuerdo_mutuo', 'fin_contrato', 'jubilacion', 'fallecimiento', 'otro')),
    descripcion_motivo  TEXT,
    fecha_notificacion  DATE,
    fecha_ultimo_dia    DATE        NOT NULL,
    estado              VARCHAR(20) NOT NULL DEFAULT 'iniciado' CHECK (estado IN ('iniciado', 'en_proceso', 'completado', 'cancelado')),
    entrevista_salida   BOOLEAN     NOT NULL DEFAULT FALSE,
    notas_entrevista    TEXT,
    created_by          UUID        REFERENCES public.users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.offboarding_instancias ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_offboarding_instancias_updated_at
    BEFORE UPDATE ON public.offboarding_instancias
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_offboarding_instancias_empleado ON public.offboarding_instancias(empleado_id);
CREATE INDEX idx_offboarding_instancias_estado   ON public.offboarding_instancias(estado);

-- RLS Policies
CREATE POLICY "offboarding_instancias_select_admin_management"
    ON public.offboarding_instancias FOR SELECT
    USING (public.get_current_user_rol() IN ('admin_rrhh', 'management'));

CREATE POLICY "offboarding_instancias_write_admin"
    ON public.offboarding_instancias FOR ALL
    USING (public.get_current_user_rol() = 'admin_rrhh');


-- ============================================================
-- 012_create_offboarding_activos.sql
-- ============================================================

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


-- ============================================================
-- 013_create_costos_nomina.sql
-- ============================================================

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


-- ============================================================
-- 014_create_presupuesto_areas.sql
-- ============================================================

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


-- ============================================================
-- 015_create_sucesion_posiciones.sql
-- ============================================================

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


-- ============================================================
-- 016_create_planes_carrera.sql
-- ============================================================

-- Planes de desarrollo de carrera para empleados.
-- Define el cargo objetivo, plazos y el responsable del acompañamiento (manager o RRHH).
-- progreso es un porcentaje 0-100 calculado o actualizado manualmente por el responsable.

CREATE TABLE public.planes_carrera (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    empleado_id    UUID        NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
    cargo_objetivo VARCHAR(150) NOT NULL,
    descripcion    TEXT,
    fecha_inicio   DATE        NOT NULL DEFAULT CURRENT_DATE,
    fecha_objetivo DATE,
    estado         VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'completado', 'pausado', 'cancelado')),
    progreso       SMALLINT    NOT NULL DEFAULT 0 CHECK (progreso BETWEEN 0 AND 100),
    responsable_id UUID        REFERENCES public.empleados(id) ON DELETE SET NULL,
    notas          TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.planes_carrera ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_planes_carrera_updated_at
    BEFORE UPDATE ON public.planes_carrera
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_planes_carrera_empleado ON public.planes_carrera(empleado_id);
CREATE INDEX idx_planes_carrera_estado   ON public.planes_carrera(estado);

-- RLS Policies
CREATE POLICY "planes_carrera_select_admin_management"
    ON public.planes_carrera FOR SELECT
    USING (public.get_current_user_rol() IN ('admin_rrhh', 'management'));

CREATE POLICY "planes_carrera_select_own"
    ON public.planes_carrera FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.empleados e
            WHERE e.id = empleado_id AND e.user_id = auth.uid()
        )
    );

CREATE POLICY "planes_carrera_write_admin_management"
    ON public.planes_carrera FOR ALL
    USING (public.get_current_user_rol() IN ('admin_rrhh', 'management'));


-- ============================================================
-- 017_create_planes_carrera_hitos.sql
-- ============================================================

-- Hitos del plan de carrera: capacitaciones, certificaciones, proyectos o mentorías.
-- Cada hito tiene tipo, fecha objetivo y estado de cumplimiento.
-- evidencia_url apunta a un documento en Storage o a un certificado externo.

CREATE TABLE public.planes_carrera_hitos (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id          UUID        NOT NULL REFERENCES public.planes_carrera(id) ON DELETE CASCADE,
    nombre           VARCHAR(200) NOT NULL,
    descripcion      TEXT,
    tipo             VARCHAR(20) NOT NULL CHECK (tipo IN ('capacitacion', 'certificacion', 'proyecto', 'mentoring', 'rotacion', 'otro')),
    fecha_objetivo   DATE,
    fecha_completada DATE,
    estado           VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_progreso', 'completado', 'cancelado')),
    evidencia_url    TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.planes_carrera_hitos ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_planes_carrera_hitos_updated_at
    BEFORE UPDATE ON public.planes_carrera_hitos
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_hitos_plan   ON public.planes_carrera_hitos(plan_id);
CREATE INDEX idx_hitos_estado ON public.planes_carrera_hitos(estado);

-- RLS Policies
CREATE POLICY "hitos_select_admin_management"
    ON public.planes_carrera_hitos FOR SELECT
    USING (public.get_current_user_rol() IN ('admin_rrhh', 'management'));

CREATE POLICY "hitos_select_own"
    ON public.planes_carrera_hitos FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.planes_carrera pc
            JOIN public.empleados e ON e.id = pc.empleado_id
            WHERE pc.id = plan_id AND e.user_id = auth.uid()
        )
    );

CREATE POLICY "hitos_write_admin_management"
    ON public.planes_carrera_hitos FOR ALL
    USING (public.get_current_user_rol() IN ('admin_rrhh', 'management'));


-- ============================================================
-- 018_create_assessment_campanas.sql
-- ============================================================

-- Campañas de evaluación (assessment). Agrupa un conjunto de links enviados bajo una misma evaluación.
-- configuracion JSONB almacena las preguntas, escalas y parámetros específicos de cada tipo.
-- tipos: conductual (DISC/Big5), cognitivo, técnico, o mixto.

CREATE TABLE public.assessment_campanas (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre        VARCHAR(150) NOT NULL,
    descripcion   TEXT,
    tipo          VARCHAR(20) NOT NULL CHECK (tipo IN ('conductual', 'cognitivo', 'tecnico', 'mixto')),
    subtipo       VARCHAR(50),
    configuracion JSONB       NOT NULL DEFAULT '{}',
    estado        VARCHAR(20) NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador', 'activa', 'cerrada', 'archivada')),
    fecha_inicio  DATE,
    fecha_fin     DATE,
    created_by    UUID        REFERENCES public.users(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.assessment_campanas ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_assessment_campanas_updated_at
    BEFORE UPDATE ON public.assessment_campanas
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_campanas_estado ON public.assessment_campanas(estado);
CREATE INDEX idx_campanas_tipo   ON public.assessment_campanas(tipo);

-- RLS Policies
CREATE POLICY "campanas_select_admin_management"
    ON public.assessment_campanas FOR SELECT
    USING (public.get_current_user_rol() IN ('admin_rrhh', 'management'));

CREATE POLICY "campanas_write_admin"
    ON public.assessment_campanas FOR ALL
    USING (public.get_current_user_rol() = 'admin_rrhh');


-- ============================================================
-- 019_create_assessment_links.sql
-- ============================================================

-- Links únicos para completar un assessment. Pueden enviarse a empleados internos o candidatos externos.
-- El token es un hex de 32 bytes generado por pgcrypto; único y no guessable.
-- La ruta pública /assessment/[token] no requiere autenticación para soportar candidatos externos.

CREATE TABLE public.assessment_links (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    campana_id     UUID         NOT NULL REFERENCES public.assessment_campanas(id) ON DELETE CASCADE,
    empleado_id    UUID         REFERENCES public.empleados(id) ON DELETE SET NULL,
    candidato_id   UUID         REFERENCES public.candidatos(id) ON DELETE SET NULL,
    token          VARCHAR(100) NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
    email_destino  VARCHAR(255) NOT NULL,
    nombre_destino VARCHAR(200),
    estado         VARCHAR(20)  NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'enviado', 'abierto', 'completado', 'expirado', 'cancelado')),
    expira_en      TIMESTAMPTZ  NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    enviado_en     TIMESTAMPTZ,
    abierto_en     TIMESTAMPTZ,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    -- Un link apunta a un empleado o a un candidato, o a ninguno (link libre), pero nunca a ambos.
    CONSTRAINT chk_link_destino_exclusivo CHECK (
        NOT (empleado_id IS NOT NULL AND candidato_id IS NOT NULL)
    )
);

ALTER TABLE public.assessment_links ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_links_campana  ON public.assessment_links(campana_id);
CREATE INDEX idx_links_token    ON public.assessment_links(token);
CREATE INDEX idx_links_estado   ON public.assessment_links(estado);
CREATE INDEX idx_links_empleado ON public.assessment_links(empleado_id);

-- RLS Policies
CREATE POLICY "links_select_admin_management"
    ON public.assessment_links FOR SELECT
    USING (public.get_current_user_rol() IN ('admin_rrhh', 'management'));

-- Permite acceso público por token para que candidatos externos accedan al assessment
CREATE POLICY "links_select_by_token"
    ON public.assessment_links FOR SELECT
    USING (estado NOT IN ('cancelado'));

CREATE POLICY "links_write_admin"
    ON public.assessment_links FOR ALL
    USING (public.get_current_user_rol() = 'admin_rrhh');

CREATE POLICY "links_update_sistema"
    ON public.assessment_links FOR UPDATE
    USING (TRUE)
    WITH CHECK (TRUE);


-- ============================================================
-- 020_create_assessment_resultados.sql
-- ============================================================

-- Resultados de un assessment completado por un destinatario.
-- respuestas y puntuacion son JSONB para soportar distintos tipos y versiones de evaluación.
-- UNIQUE en link_id: un link solo puede tener un resultado (se completa una sola vez).

CREATE TABLE public.assessment_resultados (
    id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    link_id               UUID        NOT NULL UNIQUE REFERENCES public.assessment_links(id) ON DELETE CASCADE,
    campana_id            UUID        NOT NULL REFERENCES public.assessment_campanas(id) ON DELETE RESTRICT,
    empleado_id           UUID        REFERENCES public.empleados(id) ON DELETE SET NULL,
    candidato_id          UUID        REFERENCES public.candidatos(id) ON DELETE SET NULL,
    respuestas            JSONB       NOT NULL DEFAULT '{}',
    puntuacion            JSONB,
    perfil_resultado      JSONB,
    tiempo_total_segundos INTEGER     CHECK (tiempo_total_segundos > 0),
    completado_en         TIMESTAMPTZ,
    ip_completion         INET,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.assessment_resultados ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_assessment_resultados_updated_at
    BEFORE UPDATE ON public.assessment_resultados
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_resultados_campana   ON public.assessment_resultados(campana_id);
CREATE INDEX idx_resultados_empleado  ON public.assessment_resultados(empleado_id);
CREATE INDEX idx_resultados_candidato ON public.assessment_resultados(candidato_id);

-- RLS Policies
CREATE POLICY "resultados_select_admin_management"
    ON public.assessment_resultados FOR SELECT
    USING (public.get_current_user_rol() IN ('admin_rrhh', 'management'));

CREATE POLICY "resultados_select_own"
    ON public.assessment_resultados FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.empleados e
            WHERE e.id = empleado_id AND e.user_id = auth.uid()
        )
    );

-- Permite insertar desde la ruta pública de assessment (sin sesión activa)
CREATE POLICY "resultados_insert_publico"
    ON public.assessment_resultados FOR INSERT
    WITH CHECK (TRUE);

CREATE POLICY "resultados_update_admin"
    ON public.assessment_resultados FOR UPDATE
    USING (public.get_current_user_rol() = 'admin_rrhh');


-- ============================================================
-- 021_create_assessment_reportes.sql
-- ============================================================

-- Reportes generados a partir de un resultado de assessment.
-- Pueden ser generados por el motor de IA (Claude) o manualmente por RRHH.
-- visible_empleado controla si el empleado puede ver su propio reporte.

CREATE TABLE public.assessment_reportes (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    resultado_id     UUID        NOT NULL REFERENCES public.assessment_resultados(id) ON DELETE CASCADE,
    tipo_reporte     VARCHAR(30) NOT NULL CHECK (tipo_reporte IN ('perfil_conductual', 'perfil_cognitivo', 'fit_cultural', 'plan_desarrollo', 'comparativo', 'ejecutivo')),
    titulo           VARCHAR(200) NOT NULL,
    contenido        JSONB       NOT NULL DEFAULT '{}',
    resumen          TEXT,
    generado_por     VARCHAR(10) NOT NULL DEFAULT 'ia' CHECK (generado_por IN ('ia', 'manual')),
    modelo_ia        VARCHAR(100),
    url_pdf          TEXT,
    storage_path     TEXT,
    visible_empleado BOOLEAN     NOT NULL DEFAULT FALSE,
    created_by       UUID        REFERENCES public.users(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.assessment_reportes ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_reportes_resultado ON public.assessment_reportes(resultado_id);
CREATE INDEX idx_reportes_tipo      ON public.assessment_reportes(tipo_reporte);

-- RLS Policies
CREATE POLICY "reportes_select_admin_management"
    ON public.assessment_reportes FOR SELECT
    USING (public.get_current_user_rol() IN ('admin_rrhh', 'management'));

CREATE POLICY "reportes_select_own"
    ON public.assessment_reportes FOR SELECT
    USING (
        visible_empleado = TRUE AND
        EXISTS (
            SELECT 1 FROM public.assessment_resultados ar
            JOIN public.empleados e ON e.id = ar.empleado_id
            WHERE ar.id = resultado_id AND e.user_id = auth.uid()
        )
    );

CREATE POLICY "reportes_write_admin"
    ON public.assessment_reportes FOR ALL
    USING (public.get_current_user_rol() = 'admin_rrhh');


-- ============================================================
-- 022_create_notificaciones.sql
-- ============================================================

-- Notificaciones in-app para usuarios del sistema.
-- Se crean por triggers o por la capa de servicios del backend ante eventos relevantes.
-- referencia_tipo + referencia_id apuntan al registro que originó la notificación.

CREATE TABLE public.notificaciones (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    tipo            VARCHAR(30) NOT NULL CHECK (tipo IN (
        'onboarding_tarea', 'offboarding_inicio', 'assessment_enviado',
        'assessment_completado', 'vacante_nueva', 'candidato_nuevo',
        'documento_vencimiento', 'plan_carrera_hito', 'sucesion_alerta',
        'sistema', 'otro'
    )),
    titulo          VARCHAR(200) NOT NULL,
    mensaje         TEXT        NOT NULL,
    referencia_tipo VARCHAR(50),
    referencia_id   UUID,
    leida           BOOLEAN     NOT NULL DEFAULT FALSE,
    leida_en        TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_notificaciones_user    ON public.notificaciones(user_id);
CREATE INDEX idx_notificaciones_leida   ON public.notificaciones(user_id, leida);
CREATE INDEX idx_notificaciones_created ON public.notificaciones(created_at DESC);

-- RLS Policies — cada usuario accede únicamente a sus propias notificaciones
CREATE POLICY "notificaciones_select_own"
    ON public.notificaciones FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "notificaciones_update_own"
    ON public.notificaciones FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Inserción permitida desde el sistema (service role o backend con service key)
CREATE POLICY "notificaciones_insert_sistema"
    ON public.notificaciones FOR INSERT
    WITH CHECK (TRUE);

CREATE POLICY "notificaciones_admin"
    ON public.notificaciones FOR ALL
    USING (public.get_current_user_rol() = 'admin_rrhh');


-- ============================================================
-- 023_create_notificaciones_config.sql
-- ============================================================

-- Preferencias de notificación por usuario y tipo de evento.
-- UNIQUE en (user_id, tipo_evento): una fila de configuración por evento por usuario.
-- canal 'ninguno' desactiva completamente ese tipo de notificación para el usuario.

CREATE TABLE public.notificaciones_config (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    tipo_evento VARCHAR(30) NOT NULL CHECK (tipo_evento IN (
        'onboarding_tarea', 'offboarding_inicio', 'assessment_enviado',
        'assessment_completado', 'vacante_nueva', 'candidato_nuevo',
        'documento_vencimiento', 'plan_carrera_hito', 'sucesion_alerta',
        'sistema', 'otro'
    )),
    canal       VARCHAR(10) NOT NULL CHECK (canal IN ('email', 'in_app', 'ambos', 'ninguno')),
    activo      BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, tipo_evento)
);

ALTER TABLE public.notificaciones_config ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_notificaciones_config_updated_at
    BEFORE UPDATE ON public.notificaciones_config
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_notif_config_user ON public.notificaciones_config(user_id);

-- RLS Policies — cada usuario gestiona su propia configuración
CREATE POLICY "notif_config_select_own"
    ON public.notificaciones_config FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "notif_config_write_own"
    ON public.notificaciones_config FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "notif_config_admin"
    ON public.notificaciones_config FOR ALL
    USING (public.get_current_user_rol() = 'admin_rrhh');


-- ============================================================
-- 024_create_auditoria.sql
-- ============================================================

-- Log de auditoría inmutable para trazabilidad de cambios en datos sensibles.
-- INSERT permitido para todos; UPDATE y DELETE bloqueados por política.
-- La función fn_auditoria() se activa automáticamente desde triggers en tablas críticas.

CREATE TABLE public.auditoria (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tabla            VARCHAR(100) NOT NULL,
    registro_id      UUID        NOT NULL,
    accion           VARCHAR(10) NOT NULL CHECK (accion IN ('INSERT', 'UPDATE', 'DELETE')),
    datos_anteriores JSONB,
    datos_nuevos     JSONB,
    usuario_id       UUID        REFERENCES public.users(id) ON DELETE SET NULL,
    ip               INET,
    user_agent       TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_auditoria_tabla    ON public.auditoria(tabla);
CREATE INDEX idx_auditoria_registro ON public.auditoria(tabla, registro_id);
CREATE INDEX idx_auditoria_usuario  ON public.auditoria(usuario_id);
CREATE INDEX idx_auditoria_created  ON public.auditoria(created_at DESC);

-- RLS Policies — solo admin_rrhh puede leer; nadie puede modificar ni borrar
CREATE POLICY "auditoria_select_admin"
    ON public.auditoria FOR SELECT
    USING (public.get_current_user_rol() = 'admin_rrhh');

CREATE POLICY "auditoria_insert_todos"
    ON public.auditoria FOR INSERT
    WITH CHECK (TRUE);

-- Trigger genérico de auditoría. Se instala en cada tabla sensible a continuación.
CREATE OR REPLACE FUNCTION public.fn_auditoria()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.auditoria (tabla, registro_id, accion, datos_nuevos, usuario_id)
        VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW), auth.uid());
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO public.auditoria (tabla, registro_id, accion, datos_anteriores, datos_nuevos, usuario_id)
        VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.auditoria (tabla, registro_id, accion, datos_anteriores, usuario_id)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD), auth.uid());
        RETURN OLD;
    END IF;
END;
$$;

-- Auditoría automática activada en las tablas con datos más sensibles
CREATE TRIGGER trg_auditoria_users
    AFTER INSERT OR UPDATE OR DELETE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria();

CREATE TRIGGER trg_auditoria_empleados
    AFTER INSERT OR UPDATE OR DELETE ON public.empleados
    FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria();

CREATE TRIGGER trg_auditoria_costos_nomina
    AFTER INSERT OR UPDATE OR DELETE ON public.costos_nomina
    FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria();

CREATE TRIGGER trg_auditoria_offboarding
    AFTER INSERT OR UPDATE OR DELETE ON public.offboarding_instancias
    FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria();

CREATE TRIGGER trg_auditoria_assessment_resultados
    AFTER INSERT OR UPDATE OR DELETE ON public.assessment_resultados
    FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria();
