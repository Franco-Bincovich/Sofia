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


-- ############################################################
-- Migraciones 025-035 (extensiones de schema + datos demo)
-- ############################################################


-- ============================================================
-- 025_add_username_to_users.sql
-- ============================================================

-- Agrega la columna username a public.users para soportar login por nombre de usuario.
-- Se pobla con la parte local del email como valor inicial.
-- Índice funcional sobre LOWER(username) para búsquedas case-insensitive eficientes.

ALTER TABLE public.users
    ADD COLUMN username VARCHAR(50);

-- Valor inicial: parte local del email en minúsculas.
-- Reemplazar con usernames reales antes de poner en producción.
UPDATE public.users
    SET username = LOWER(SPLIT_PART(email, '@', 1));

-- Forzar NOT NULL y unicidad una vez que todos los registros tienen valor.
ALTER TABLE public.users
    ALTER COLUMN username SET NOT NULL;

ALTER TABLE public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);

-- Índice funcional para ilike case-insensitive sin full-scan.
CREATE UNIQUE INDEX idx_users_username_lower
    ON public.users (LOWER(username));


-- ============================================================
-- 026_adapt_vacantes_candidatos.sql
-- ============================================================

-- 026: Adapta vacantes y candidatos al modelo de dominio HR Karstec.
-- Alinea estados de vacante y etapas de pipeline con los valores de la app.
-- Agrega columnas cargo_anterior, empresa_anterior, score_ia a candidatos.
-- Cambia requisitos de TEXT a JSONB para soportar lista de strings.

BEGIN;

-- ── vacantes.requisitos: TEXT → JSONB ─────────────────────────────────────────
ALTER TABLE public.vacantes
    ALTER COLUMN requisitos TYPE JSONB USING
        CASE
            WHEN requisitos IS NULL OR trim(requisitos) = '' THEN '[]'::jsonb
            ELSE to_jsonb(string_to_array(trim(requisitos), E'\n'))
        END;

ALTER TABLE public.vacantes
    ALTER COLUMN requisitos SET DEFAULT '[]'::jsonb;

-- ── vacantes.estado: migrar datos y actualizar constraint ─────────────────────
UPDATE public.vacantes SET estado = 'nueva'      WHERE estado IN ('borrador', 'activa');
UPDATE public.vacantes SET estado = 'en_proceso' WHERE estado = 'pausada';
UPDATE public.vacantes SET estado = 'cerrada'    WHERE estado = 'cancelada';

ALTER TABLE public.vacantes DROP CONSTRAINT IF EXISTS vacantes_estado_check;
ALTER TABLE public.vacantes
    ADD CONSTRAINT vacantes_estado_check
    CHECK (estado IN ('nueva', 'en_proceso', 'con_candidatos', 'cerrada'));

ALTER TABLE public.vacantes ALTER COLUMN estado SET DEFAULT 'nueva';

-- ── candidatos: nuevas columnas ───────────────────────────────────────────────
ALTER TABLE public.candidatos
    ADD COLUMN IF NOT EXISTS cargo_anterior   VARCHAR(200),
    ADD COLUMN IF NOT EXISTS empresa_anterior VARCHAR(200),
    ADD COLUMN IF NOT EXISTS score_ia         NUMERIC(4,2) CHECK (score_ia BETWEEN 0 AND 10);

-- ── candidatos.etapa: migrar datos y actualizar constraint ────────────────────
UPDATE public.candidatos SET etapa = 'postulado'
    WHERE etapa IN ('recibido', 'revision_cv', 'descartado',
                    'entrevista_management', 'contratado');

ALTER TABLE public.candidatos DROP CONSTRAINT IF EXISTS candidatos_etapa_check;
ALTER TABLE public.candidatos
    ADD CONSTRAINT candidatos_etapa_check
    CHECK (etapa IN ('postulado', 'assessment', 'entrevista_rrhh',
                     'entrevista_tecnica', 'oferta'));

ALTER TABLE public.candidatos ALTER COLUMN etapa SET DEFAULT 'postulado';

COMMIT;


-- ============================================================
-- 027_onboarding_default_template.sql
-- ============================================================

-- Agrega columna semana a onboarding_tareas e inserta template por defecto.
-- semana 1-4 representa las 4 semanas del proceso de onboarding estándar.

ALTER TABLE public.onboarding_tareas
    ADD COLUMN IF NOT EXISTS semana SMALLINT NOT NULL DEFAULT 1
        CHECK (semana BETWEEN 1 AND 4);

INSERT INTO public.onboarding_templates (nombre, descripcion, duracion_dias, activo)
VALUES ('Template Estándar Karstec', 'Onboarding base para todos los ingresos nuevos', 30, TRUE)
ON CONFLICT DO NOTHING;

DO $$
DECLARE
    tmpl_id UUID;
BEGIN
    SELECT id INTO tmpl_id
    FROM public.onboarding_templates
    WHERE nombre = 'Template Estándar Karstec'
    LIMIT 1;

    IF tmpl_id IS NULL THEN RETURN; END IF;

    -- Semana 1: Bienvenida e integración
    INSERT INTO public.onboarding_tareas
        (template_id, nombre, descripcion, responsable_tipo, semana, orden, dias_limite)
    VALUES
        (tmpl_id, 'Reunión de bienvenida con RRHH',
         'Presentación del equipo, cultura y políticas de la empresa', 'rrhh', 1, 1, 1),
        (tmpl_id, 'Configuración de equipos y accesos',
         'Entrega de laptop, accesos a sistemas y cuentas corporativas', 'ti', 1, 2, 2),
        (tmpl_id, 'Presentación al equipo de trabajo',
         'Conocer al equipo directo y manager', 'manager', 1, 3, 2),
        (tmpl_id, 'Lectura y firma del reglamento interno',
         'Revisar y firmar el reglamento interno de la empresa', 'empleado', 1, 4, 3);

    -- Semana 2: Capacitación técnica
    INSERT INTO public.onboarding_tareas
        (template_id, nombre, descripcion, responsable_tipo, semana, orden, dias_limite)
    VALUES
        (tmpl_id, 'Capacitación en herramientas corporativas',
         'Slack, Jira, Confluence y herramientas de uso diario', 'ti', 2, 1, 3),
        (tmpl_id, 'Revisión de procesos del área',
         'Entender flujos de trabajo y metodologías del equipo', 'manager', 2, 2, 5),
        (tmpl_id, 'Asignación de buddy / mentor',
         'Designar un compañero de referencia para las primeras semanas', 'rrhh', 2, 3, 3),
        (tmpl_id, 'Completar capacitación de seguridad informática',
         'Curso obligatorio de seguridad informática y protección de datos', 'empleado', 2, 4, 5);

    -- Semana 3: Integración operativa
    INSERT INTO public.onboarding_tareas
        (template_id, nombre, descripcion, responsable_tipo, semana, orden, dias_limite)
    VALUES
        (tmpl_id, 'Primera tarea real asignada',
         'Participar activamente en una tarea real del equipo', 'manager', 3, 1, 7),
        (tmpl_id, 'Revisión y definición de objetivos del período',
         'Definir OKRs o metas para el primer trimestre', 'manager', 3, 2, 7),
        (tmpl_id, 'Check-in con RRHH — semana 3',
         'Reunión de seguimiento y consulta de inquietudes con RRHH', 'rrhh', 3, 3, 7),
        (tmpl_id, 'Acceso y revisión de documentación del producto',
         'Leer documentación técnica y de negocio del área', 'empleado', 3, 4, 10);

    -- Semana 4: Cierre del primer mes
    INSERT INTO public.onboarding_tareas
        (template_id, nombre, descripcion, responsable_tipo, semana, orden, dias_limite)
    VALUES
        (tmpl_id, 'Evaluación de integración del primer mes',
         'Assessment informal de adaptación y primeras impresiones', 'rrhh', 4, 1, 14),
        (tmpl_id, 'Feedback 360 del equipo y manager',
         'Recolectar y compartir feedback del equipo y del manager', 'manager', 4, 2, 14),
        (tmpl_id, 'Confirmación del período de prueba',
         'Revisión formal y confirmación de continuidad en la empresa', 'rrhh', 4, 3, 14),
        (tmpl_id, 'Establecer plan de desarrollo inicial',
         'Definir plan de carrera y desarrollo para los próximos 6 meses', 'manager', 4, 4, 14);
END $$;


-- ============================================================
-- 028_sucesion_campos.sql
-- ============================================================

-- Agrega potencial y desempeno a empleados para el mapa 9-Box.
-- Ambas columnas son requeridas con valor por defecto 'medio' para no romper filas existentes.

ALTER TABLE public.empleados
    ADD COLUMN potencial VARCHAR(10) NOT NULL DEFAULT 'medio'
        CHECK (potencial IN ('alto', 'medio', 'bajo')),
    ADD COLUMN desempeno VARCHAR(10) NOT NULL DEFAULT 'medio'
        CHECK (desempeno IN ('alto', 'medio', 'bajo'));

CREATE INDEX idx_empleados_potencial ON public.empleados(potencial);
CREATE INDEX idx_empleados_desempeno ON public.empleados(desempeno);


-- ============================================================
-- 029_empleados_rol.sql
-- ============================================================

-- Agrega columna rol a empleados para registrar el rol funcional o título interno.
-- Opcional: no rompe registros existentes ni requiere backfill.

ALTER TABLE public.empleados ADD COLUMN IF NOT EXISTS rol VARCHAR(100);


-- ============================================================
-- 030_configuracion_empresa.sql
-- ============================================================

-- Tabla de configuración global de la empresa (singleton — una sola fila).
-- El nombre se usa en el organigrama y otros módulos como identidad de la organización.

CREATE TABLE IF NOT EXISTS configuracion_empresa (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre     VARCHAR(200) NOT NULL DEFAULT 'Mi Empresa',
  logo_url   TEXT,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_configuracion_empresa_updated_at
    BEFORE UPDATE ON configuracion_empresa
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE configuracion_empresa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "empresa_select_authenticated"
    ON configuracion_empresa FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "empresa_write_admin"
    ON configuracion_empresa FOR ALL
    USING (public.get_current_user_rol() = 'admin_rrhh');

INSERT INTO configuracion_empresa (nombre) VALUES ('Karstec') ON CONFLICT DO NOTHING;


-- ============================================================
-- 031_reportes_generados.sql
-- ============================================================

-- Historial de reportes generados. Almacena los datos completos en JSONB
-- para permitir descarga posterior sin recalcular.

CREATE TABLE IF NOT EXISTS reportes_generados (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre       VARCHAR(200) NOT NULL,
  tipo         VARCHAR(50)  NOT NULL,
  parametros   JSONB,
  datos        JSONB        NOT NULL DEFAULT '{}',
  generado_por VARCHAR(200) NOT NULL DEFAULT 'Sistema',
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reportes_tipo       ON reportes_generados(tipo);
CREATE INDEX idx_reportes_created_at ON reportes_generados(created_at DESC);

ALTER TABLE reportes_generados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reportes_select_admin_management"
    ON reportes_generados FOR SELECT
    USING (public.get_current_user_rol() IN ('admin_rrhh', 'management'));

CREATE POLICY "reportes_write_admin_management"
    ON reportes_generados FOR INSERT
    USING (public.get_current_user_rol() IN ('admin_rrhh', 'management'));


-- ============================================================
-- 032_usuario_integraciones.sql
-- ============================================================

CREATE TABLE usuario_integraciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL, -- 'google', 'anthropic'
  access_token TEXT,
  refresh_token TEXT,
  token_expiry TIMESTAMPTZ,
  email_cuenta TEXT, -- para mostrar qué cuenta está conectada
  api_key TEXT, -- para Anthropic
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tipo)
);
ALTER TABLE usuario_integraciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_integrations" ON usuario_integraciones
  FOR ALL USING (user_id = (SELECT id FROM public.users WHERE id::text = current_setting('request.jwt.claims', true)::json->>'sub'));


-- ============================================================
-- 033_assessment_posicion.sql
-- ============================================================

-- Agrega área y posición objetivo a campañas de assessment
ALTER TABLE assessment_campanas
  ADD COLUMN IF NOT EXISTS area_id UUID REFERENCES areas(id),
  ADD COLUMN IF NOT EXISTS posicion_objetivo VARCHAR(200);

-- Vincula links de evaluación a empleados del sistema para actualizar 9-Box automáticamente
ALTER TABLE assessment_links
  ADD COLUMN IF NOT EXISTS empleado_id UUID REFERENCES empleados(id);


-- ============================================================
-- 034_vacante_linkedin.sql
-- ============================================================

-- 034_vacante_linkedin.sql
-- Agrega campos de publicación LinkedIn y email de contacto a vacantes
ALTER TABLE vacantes ADD COLUMN IF NOT EXISTS linkedin_post_id TEXT;
ALTER TABLE vacantes ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE vacantes ADD COLUMN IF NOT EXISTS email_contacto TEXT;


-- ============================================================
-- 035_demo_data.sql
-- ============================================================

-- 035_demo_data.sql
-- Datos de demostración completos para HR Karstec.
-- Idempotente: ON CONFLICT DO NOTHING / WHERE NOT EXISTS en todos los INSERT.
-- Los area_id y empleado_id se resuelven con subqueries dinámicos (sin UUIDs hardcodeados).

BEGIN;

-- ════════════════════════════════════════════════════════════════
-- 1. EMPLEADOS
-- ════════════════════════════════════════════════════════════════

-- ── Área IT (6 empleados) ─────────────────────────────────────────
INSERT INTO public.empleados
    (nombre, apellido, email_corporativo, cargo, rol,
     fecha_ingreso, tipo_contrato, modalidad_trabajo, estado,
     area_id, nivel, potencial, desempeno)
VALUES
    ('Martín', 'Rodríguez', 'martin.rodriguez@karstec.com',
     'Tech Lead', 'Líder Técnico IT',
     '2022-03-15', 'efectivo', 'hibrido', 'activo',
     (SELECT id FROM public.areas WHERE nombre = 'IT'),
     'lider', 'alto', 'alto'),

    ('Valentina', 'Castro', 'valentina.castro@karstec.com',
     'Desarrolladora Senior', 'Software Engineer Senior',
     '2022-08-01', 'efectivo', 'remoto', 'activo',
     (SELECT id FROM public.areas WHERE nombre = 'IT'),
     'senior', 'medio', 'alto'),

    ('Lucas', 'Pereyra', 'lucas.pereyra@karstec.com',
     'Desarrollador Full Stack', 'Software Engineer',
     '2023-06-12', 'efectivo', 'hibrido', 'activo',
     (SELECT id FROM public.areas WHERE nombre = 'IT'),
     'semi_senior', 'alto', 'medio'),

    ('Camila', 'Sánchez', 'camila.sanchez@karstec.com',
     'QA Engineer', 'Quality Assurance Engineer',
     '2023-09-05', 'efectivo', 'presencial', 'activo',
     (SELECT id FROM public.areas WHERE nombre = 'IT'),
     'semi_senior', 'medio', 'medio'),

    ('Tomás', 'Ferreyra', 'tomas.ferreyra@karstec.com',
     'DevOps', 'DevOps Engineer',
     '2022-11-28', 'efectivo', 'remoto', 'activo',
     (SELECT id FROM public.areas WHERE nombre = 'IT'),
     'senior', 'alto', 'alto'),

    ('Lucía', 'Moreno', 'lucia.moreno@karstec.com',
     'Desarrolladora Junior', 'Software Engineer Junior',
     '2024-11-01', 'plazo_fijo', 'presencial', 'activo',
     (SELECT id FROM public.areas WHERE nombre = 'IT'),
     'junior', 'medio', 'medio')

ON CONFLICT (email_corporativo) DO NOTHING;

-- ── Área Gestión de Deuda (5 empleados) ──────────────────────────
INSERT INTO public.empleados
    (nombre, apellido, email_corporativo, cargo, rol,
     fecha_ingreso, tipo_contrato, modalidad_trabajo, estado,
     area_id, nivel, potencial, desempeno)
VALUES
    ('Diego', 'Torres', 'diego.torres@karstec.com',
     'Gerente de Cobranzas', 'Gerente de Gestión de Deuda',
     '2022-01-10', 'efectivo', 'presencial', 'activo',
     (SELECT id FROM public.areas WHERE nombre = 'Gestión de Deuda'),
     'manager', 'alto', 'alto'),

    ('Ana', 'García', 'ana.garcia@karstec.com',
     'Analista Senior', 'Analista de Cobranzas Senior',
     '2022-07-18', 'efectivo', 'hibrido', 'activo',
     (SELECT id FROM public.areas WHERE nombre = 'Gestión de Deuda'),
     'senior', 'medio', 'alto'),

    ('Carlos', 'López', 'carlos.lopez@karstec.com',
     'Analista de Riesgo', 'Risk Analyst',
     '2023-04-03', 'efectivo', 'presencial', 'licencia',
     (SELECT id FROM public.areas WHERE nombre = 'Gestión de Deuda'),
     'semi_senior', 'bajo', 'medio'),

    ('Sofía', 'Méndez', 'sofia.mendez.gd@karstec.com',
     'Coordinadora', 'Coordinadora de Cobranzas',
     '2023-02-14', 'efectivo', 'hibrido', 'activo',
     (SELECT id FROM public.areas WHERE nombre = 'Gestión de Deuda'),
     'senior', 'medio', 'medio'),

    ('Pablo', 'Herrera', 'pablo.herrera@karstec.com',
     'Analista Junior', 'Analista de Cobranzas Junior',
     '2024-03-25', 'plazo_fijo', 'presencial', 'baja',
     (SELECT id FROM public.areas WHERE nombre = 'Gestión de Deuda'),
     'junior', 'bajo', 'bajo')

ON CONFLICT (email_corporativo) DO NOTHING;

-- ── Área Calidad de Datos (4 empleados) ──────────────────────────
INSERT INTO public.empleados
    (nombre, apellido, email_corporativo, cargo, rol,
     fecha_ingreso, tipo_contrato, modalidad_trabajo, estado,
     area_id, nivel, potencial, desempeno)
VALUES
    ('María', 'Fernández', 'maria.fernandez@karstec.com',
     'Data Analyst Senior', 'Senior Data Analyst',
     '2022-05-20', 'efectivo', 'remoto', 'activo',
     (SELECT id FROM public.areas WHERE nombre = 'Calidad de Datos'),
     'senior', 'alto', 'alto'),

    ('Rodrigo', 'Díaz', 'rodrigo.diaz@karstec.com',
     'Data Engineer', 'Data Engineer',
     '2022-10-07', 'efectivo', 'hibrido', 'activo',
     (SELECT id FROM public.areas WHERE nombre = 'Calidad de Datos'),
     'senior', 'alto', 'medio'),

    ('Florencia', 'Ruiz', 'florencia.ruiz@karstec.com',
     'Analista de Datos', 'Data Analyst',
     '2023-08-14', 'plazo_fijo', 'hibrido', 'activo',
     (SELECT id FROM public.areas WHERE nombre = 'Calidad de Datos'),
     'semi_senior', 'medio', 'medio'),

    ('Nicolás', 'Vega', 'nicolas.vega@karstec.com',
     'Junior Analyst', 'Junior Data Analyst',
     '2024-04-08', 'plazo_fijo', 'presencial', 'activo',
     (SELECT id FROM public.areas WHERE nombre = 'Calidad de Datos'),
     'junior', 'bajo', 'bajo')

ON CONFLICT (email_corporativo) DO NOTHING;

-- ── Área Recursos Humanos (Laura y Joaquín; Sofia Zabala ya existe) ──
INSERT INTO public.empleados
    (nombre, apellido, email_corporativo, cargo, rol,
     fecha_ingreso, tipo_contrato, modalidad_trabajo, estado,
     area_id, nivel, potencial, desempeno)
VALUES
    ('Laura', 'Méndez', 'laura.mendez@karstec.com',
     'HRBP Senior', 'HR Business Partner Senior',
     '2022-04-04', 'efectivo', 'hibrido', 'activo',
     (SELECT id FROM public.areas WHERE nombre = 'Recursos Humanos'),
     'senior', 'alto', 'alto'),

    ('Joaquín', 'Pérez', 'joaquin.perez@karstec.com',
     'Recruiter', 'Talent Acquisition Specialist',
     '2023-11-20', 'efectivo', 'presencial', 'activo',
     (SELECT id FROM public.areas WHERE nombre = 'Recursos Humanos'),
     'semi_senior', 'medio', 'medio')

ON CONFLICT (email_corporativo) DO NOTHING;

-- ════════════════════════════════════════════════════════════════
-- 2. JERARQUÍA (manager_id) — solo actualiza si aún no tiene manager
-- ════════════════════════════════════════════════════════════════

UPDATE public.empleados
SET manager_id = (SELECT id FROM public.empleados WHERE email_corporativo = 'martin.rodriguez@karstec.com')
WHERE email_corporativo IN (
    'valentina.castro@karstec.com', 'lucas.pereyra@karstec.com',
    'camila.sanchez@karstec.com',   'tomas.ferreyra@karstec.com',
    'lucia.moreno@karstec.com'
) AND manager_id IS NULL;

UPDATE public.empleados
SET manager_id = (SELECT id FROM public.empleados WHERE email_corporativo = 'diego.torres@karstec.com')
WHERE email_corporativo IN (
    'ana.garcia@karstec.com', 'carlos.lopez@karstec.com',
    'sofia.mendez.gd@karstec.com', 'pablo.herrera@karstec.com'
) AND manager_id IS NULL;

UPDATE public.empleados
SET manager_id = (SELECT id FROM public.empleados WHERE email_corporativo = 'maria.fernandez@karstec.com')
WHERE email_corporativo IN (
    'rodrigo.diaz@karstec.com', 'florencia.ruiz@karstec.com', 'nicolas.vega@karstec.com'
) AND manager_id IS NULL;

UPDATE public.empleados
SET manager_id = (SELECT id FROM public.empleados WHERE email_corporativo = 'laura.mendez@karstec.com')
WHERE email_corporativo = 'joaquin.perez@karstec.com'
  AND manager_id IS NULL;

-- ════════════════════════════════════════════════════════════════
-- 3. RESPONSABLES DE ÁREA
-- ════════════════════════════════════════════════════════════════

UPDATE public.areas
SET responsable_id = (SELECT id FROM public.empleados WHERE email_corporativo = 'martin.rodriguez@karstec.com')
WHERE nombre = 'IT';

UPDATE public.areas
SET responsable_id = (SELECT id FROM public.empleados WHERE email_corporativo = 'diego.torres@karstec.com')
WHERE nombre = 'Gestión de Deuda';

UPDATE public.areas
SET responsable_id = (SELECT id FROM public.empleados WHERE email_corporativo = 'maria.fernandez@karstec.com')
WHERE nombre = 'Calidad de Datos';

UPDATE public.areas
SET responsable_id = (SELECT id FROM public.empleados WHERE email_corporativo = 'laura.mendez@karstec.com')
WHERE nombre = 'Recursos Humanos';

-- ════════════════════════════════════════════════════════════════
-- 4. NÓMINA — Marzo, Abril y Mayo 2026 (solo empleados activos)
-- Carlos López (licencia) y Pablo Herrera (baja) excluidos.
-- ════════════════════════════════════════════════════════════════

WITH empleado_salarios (email, salario) AS (
    VALUES
        ('martin.rodriguez@karstec.com',   8500000::NUMERIC),
        ('valentina.castro@karstec.com',   7200000),
        ('lucas.pereyra@karstec.com',      5800000),
        ('camila.sanchez@karstec.com',     4500000),
        ('tomas.ferreyra@karstec.com',     6300000),
        ('lucia.moreno@karstec.com',       2800000),
        ('diego.torres@karstec.com',       9200000),
        ('ana.garcia@karstec.com',         5400000),
        ('sofia.mendez.gd@karstec.com',    4200000),
        ('maria.fernandez@karstec.com',    6800000),
        ('rodrigo.diaz@karstec.com',       6200000),
        ('florencia.ruiz@karstec.com',     3900000),
        ('nicolas.vega@karstec.com',       2100000),
        ('laura.mendez@karstec.com',       5600000),
        ('joaquin.perez@karstec.com',      3200000)
),
meses (mes) AS (
    VALUES (3::SMALLINT), (4::SMALLINT), (5::SMALLINT)
)
INSERT INTO public.costos_nomina
    (empleado_id, anio, mes, salario_bruto, cargas_sociales, moneda)
SELECT
    e.id,
    2026::SMALLINT,
    m.mes,
    es.salario,
    ROUND(es.salario * 0.17, 2),
    'ARS'
FROM empleado_salarios es
JOIN public.empleados e ON e.email_corporativo = es.email
CROSS JOIN meses m
ON CONFLICT (empleado_id, anio, mes) DO NOTHING;

-- ════════════════════════════════════════════════════════════════
-- 5. VACANTES (3)
-- ════════════════════════════════════════════════════════════════

INSERT INTO public.vacantes
    (titulo, area_id, descripcion, requisitos, tipo_contrato, nivel, estado, fecha_apertura)
SELECT
    'Desarrollador Backend Senior',
    (SELECT id FROM public.areas WHERE nombre = 'IT'),
    'Buscamos un desarrollador backend senior para reforzar el equipo de producto. Trabajarás en arquitectura de microservicios y APIs de alto tráfico con foco en performance y escalabilidad.',
    '["5+ años de experiencia en backend", "Python o Node.js avanzado", "Experiencia con SQL y bases NoSQL", "Conocimientos de arquitectura cloud (AWS/GCP)", "Deseable: experiencia con Kafka o sistemas de mensajería"]'::jsonb,
    'efectivo', 'senior', 'en_proceso', '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM public.vacantes WHERE titulo = 'Desarrollador Backend Senior'
);

INSERT INTO public.vacantes
    (titulo, area_id, descripcion, requisitos, tipo_contrato, nivel, estado, fecha_apertura)
SELECT
    'Analista de Riesgo Senior',
    (SELECT id FROM public.areas WHERE nombre = 'Gestión de Deuda'),
    'Necesitamos un analista senior para fortalecer la gestión de riesgo crediticio, desarrollar modelos de scoring y analizar carteras de deuda de alta complejidad.',
    '["4+ años en análisis de riesgo crediticio", "Modelos de scoring y cobranzas", "Excel y SQL avanzado", "Deseable: Python o R para análisis estadístico", "Experiencia en entidades financieras o fintechs"]'::jsonb,
    'efectivo', 'senior', 'con_candidatos', '2026-01-15'
WHERE NOT EXISTS (
    SELECT 1 FROM public.vacantes WHERE titulo = 'Analista de Riesgo Senior'
);

INSERT INTO public.vacantes
    (titulo, area_id, descripcion, requisitos, tipo_contrato, nivel, estado, fecha_apertura)
SELECT
    'Data Scientist',
    (SELECT id FROM public.areas WHERE nombre = 'Calidad de Datos'),
    'Incorporamos un Data Scientist para desarrollar modelos predictivos, mejorar la calidad de datos de la organización y construir pipelines analíticos de valor para el negocio.',
    '["Sólida experiencia en machine learning y estadística", "Python (pandas, scikit-learn, numpy)", "SQL avanzado", "Visualización de datos (Power BI, Tableau o similar)", "Deseable: experiencia en datos financieros o de cobranzas"]'::jsonb,
    'efectivo', 'senior', 'nueva', '2026-03-10'
WHERE NOT EXISTS (
    SELECT 1 FROM public.vacantes WHERE titulo = 'Data Scientist'
);

-- ════════════════════════════════════════════════════════════════
-- 6. CANDIDATOS (4 para "Analista de Riesgo Senior", pipeline activo)
-- ════════════════════════════════════════════════════════════════

INSERT INTO public.candidatos
    (vacante_id, nombre, apellido, email, fuente, etapa, estado,
     fecha_postulacion, cargo_anterior, empresa_anterior, puntuacion)
SELECT
    (SELECT id FROM public.vacantes WHERE titulo = 'Analista de Riesgo Senior'),
    'Andrés', 'Gómez', 'andres.gomez.candidato@gmail.com',
    'linkedin', 'postulado', 'activo',
    '2026-02-10', 'Analista de Riesgo', 'Banco Macro', 7
WHERE NOT EXISTS (
    SELECT 1 FROM public.candidatos
    WHERE email = 'andres.gomez.candidato@gmail.com'
      AND vacante_id = (SELECT id FROM public.vacantes WHERE titulo = 'Analista de Riesgo Senior')
);

INSERT INTO public.candidatos
    (vacante_id, nombre, apellido, email, fuente, etapa, estado,
     fecha_postulacion, cargo_anterior, empresa_anterior, puntuacion)
SELECT
    (SELECT id FROM public.vacantes WHERE titulo = 'Analista de Riesgo Senior'),
    'Carolina', 'Silva', 'carolina.silva.candidata@outlook.com',
    'referido', 'assessment', 'activo',
    '2026-02-05', 'Analista Senior de Riesgo', 'HSBC Argentina', 8
WHERE NOT EXISTS (
    SELECT 1 FROM public.candidatos
    WHERE email = 'carolina.silva.candidata@outlook.com'
      AND vacante_id = (SELECT id FROM public.vacantes WHERE titulo = 'Analista de Riesgo Senior')
);

INSERT INTO public.candidatos
    (vacante_id, nombre, apellido, email, fuente, etapa, estado,
     fecha_postulacion, cargo_anterior, empresa_anterior, puntuacion)
SELECT
    (SELECT id FROM public.vacantes WHERE titulo = 'Analista de Riesgo Senior'),
    'Federico', 'Martínez', 'fmartinez.riesgo@gmail.com',
    'web', 'entrevista_rrhh', 'activo',
    '2026-01-28', 'Analista de Cobranzas', 'Naranja X', 7
WHERE NOT EXISTS (
    SELECT 1 FROM public.candidatos
    WHERE email = 'fmartinez.riesgo@gmail.com'
      AND vacante_id = (SELECT id FROM public.vacantes WHERE titulo = 'Analista de Riesgo Senior')
);

INSERT INTO public.candidatos
    (vacante_id, nombre, apellido, email, fuente, etapa, estado,
     fecha_postulacion, cargo_anterior, empresa_anterior, puntuacion)
SELECT
    (SELECT id FROM public.vacantes WHERE titulo = 'Analista de Riesgo Senior'),
    'Natalia', 'Romero', 'nataliaromero.cv@yahoo.com',
    'consultora', 'entrevista_tecnica', 'activo',
    '2026-01-20', 'Risk Analyst Senior', 'Banco Galicia', 9
WHERE NOT EXISTS (
    SELECT 1 FROM public.candidatos
    WHERE email = 'nataliaromero.cv@yahoo.com'
      AND vacante_id = (SELECT id FROM public.vacantes WHERE titulo = 'Analista de Riesgo Senior')
);

-- ════════════════════════════════════════════════════════════════
-- 7. ONBOARDING — Lucía Moreno (ingreso noviembre 2024)
-- ════════════════════════════════════════════════════════════════

DO $$
DECLARE
    lucia_id  UUID;
    tmpl_id   UUID;
    inst_id   UUID;
BEGIN
    SELECT id INTO lucia_id
    FROM public.empleados WHERE email_corporativo = 'lucia.moreno@karstec.com';

    SELECT id INTO tmpl_id
    FROM public.onboarding_templates WHERE nombre = 'Template Estándar Karstec' LIMIT 1;

    IF lucia_id IS NULL OR tmpl_id IS NULL THEN RETURN; END IF;

    -- Crear instancia si no existe para este empleado
    INSERT INTO public.onboarding_instancias
        (empleado_id, template_id, fecha_inicio, fecha_fin_esperada, estado)
    SELECT lucia_id, tmpl_id, '2024-11-01', '2024-12-01', 'en_progreso'
    WHERE NOT EXISTS (
        SELECT 1 FROM public.onboarding_instancias WHERE empleado_id = lucia_id
    )
    RETURNING id INTO inst_id;

    IF inst_id IS NULL THEN
        SELECT id INTO inst_id
        FROM public.onboarding_instancias WHERE empleado_id = lucia_id LIMIT 1;
    END IF;

    IF inst_id IS NULL THEN RETURN; END IF;

    -- Poblar progreso con todas las tareas del template (estado inicial: pendiente)
    INSERT INTO public.onboarding_progreso (instancia_id, tarea_id, estado)
    SELECT inst_id, t.id, 'pendiente'
    FROM public.onboarding_tareas t
    WHERE t.template_id = tmpl_id
    ON CONFLICT (instancia_id, tarea_id) DO NOTHING;

    -- Semana 1: todas completadas (primera semana de integración)
    UPDATE public.onboarding_progreso op
    SET estado = 'completado',
        fecha_completada = '2024-11-08 17:00:00+00'
    FROM public.onboarding_tareas ot
    WHERE op.instancia_id = inst_id
      AND op.tarea_id    = ot.id
      AND ot.template_id = tmpl_id
      AND ot.semana      = 1
      AND op.estado      = 'pendiente';

    -- Semana 2 - tarea 1 (capacitación herramientas): completada
    UPDATE public.onboarding_progreso op
    SET estado = 'completado',
        fecha_completada = '2024-11-13 11:00:00+00'
    FROM public.onboarding_tareas ot
    WHERE op.instancia_id = inst_id
      AND op.tarea_id    = ot.id
      AND ot.template_id = tmpl_id
      AND ot.semana      = 2
      AND ot.orden       = 1
      AND op.estado      = 'pendiente';

    -- Semana 2 - tarea 2 (revisión de procesos del área): en progreso
    UPDATE public.onboarding_progreso op
    SET estado = 'en_progreso'
    FROM public.onboarding_tareas ot
    WHERE op.instancia_id = inst_id
      AND op.tarea_id    = ot.id
      AND ot.template_id = tmpl_id
      AND ot.semana      = 2
      AND ot.orden       = 2
      AND op.estado      = 'pendiente';
END $$;

-- ════════════════════════════════════════════════════════════════
-- 8. ASSESSMENT — Campaña Q2 2026 + links + resultados (equipo IT)
-- Resultados alimentan el 9-box: desempeño × potencial.
-- ════════════════════════════════════════════════════════════════

DO $$
DECLARE
    camp_id      UUID;
    martin_id    UUID;
    valentina_id UUID;
    lucas_id     UUID;
    link_id      UUID;
BEGIN
    SELECT id INTO martin_id    FROM public.empleados WHERE email_corporativo = 'martin.rodriguez@karstec.com';
    SELECT id INTO valentina_id FROM public.empleados WHERE email_corporativo = 'valentina.castro@karstec.com';
    SELECT id INTO lucas_id     FROM public.empleados WHERE email_corporativo = 'lucas.pereyra@karstec.com';

    -- Crear campaña si no existe
    INSERT INTO public.assessment_campanas
        (nombre, descripcion, tipo, estado, fecha_inicio, fecha_fin, area_id)
    SELECT
        'Assessment Q2 2026',
        'Evaluación integral (conductual + cognitivo) del equipo IT para el segundo trimestre 2026.',
        'mixto', 'activa',
        '2026-04-01', '2026-06-30',
        (SELECT id FROM public.areas WHERE nombre = 'IT')
    WHERE NOT EXISTS (
        SELECT 1 FROM public.assessment_campanas WHERE nombre = 'Assessment Q2 2026'
    )
    RETURNING id INTO camp_id;

    IF camp_id IS NULL THEN
        SELECT id INTO camp_id FROM public.assessment_campanas WHERE nombre = 'Assessment Q2 2026';
    END IF;

    IF camp_id IS NULL THEN RETURN; END IF;

    -- ── Martín Rodríguez: estrella (alto desempeño + alto potencial) ──────
    IF martin_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.assessment_links
        WHERE campana_id = camp_id AND empleado_id = martin_id
    ) THEN
        INSERT INTO public.assessment_links
            (campana_id, empleado_id, email_destino, nombre_destino, estado, expira_en)
        VALUES (camp_id, martin_id,
                'martin.rodriguez@karstec.com', 'Martín Rodríguez',
                'completado', NOW() + INTERVAL '180 days')
        RETURNING id INTO link_id;

        INSERT INTO public.assessment_resultados
            (link_id, campana_id, empleado_id,
             respuestas, puntuacion, perfil_resultado,
             tiempo_total_segundos, completado_en)
        VALUES (
            link_id, camp_id, martin_id,
            '{"completado": true, "items_conductual": 32, "items_cognitivo": 25}'::jsonb,
            '{"desempeno": 9.2, "potencial": 9.5, "cognitivo": 8.8, "total": 9.2}'::jsonb,
            '{"cuadrante": "estrella", "eje_desempeno": "alto", "eje_potencial": "alto",
              "descripcion": "Alto desempeño y alto potencial. Perfil clave de retención y referente del equipo."}'::jsonb,
            3240, NOW()
        ) ON CONFLICT (link_id) DO NOTHING;
    END IF;

    -- ── Valentina Castro: alto performer (alto desempeño + potencial medio) ──
    IF valentina_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.assessment_links
        WHERE campana_id = camp_id AND empleado_id = valentina_id
    ) THEN
        INSERT INTO public.assessment_links
            (campana_id, empleado_id, email_destino, nombre_destino, estado, expira_en)
        VALUES (camp_id, valentina_id,
                'valentina.castro@karstec.com', 'Valentina Castro',
                'completado', NOW() + INTERVAL '180 days')
        RETURNING id INTO link_id;

        INSERT INTO public.assessment_resultados
            (link_id, campana_id, empleado_id,
             respuestas, puntuacion, perfil_resultado,
             tiempo_total_segundos, completado_en)
        VALUES (
            link_id, camp_id, valentina_id,
            '{"completado": true, "items_conductual": 32, "items_cognitivo": 25}'::jsonb,
            '{"desempeno": 8.7, "potencial": 7.2, "cognitivo": 8.5, "total": 8.1}'::jsonb,
            '{"cuadrante": "alto_performer", "eje_desempeno": "alto", "eje_potencial": "medio",
              "descripcion": "Alto desempeño con potencial de crecimiento medio. Perfil consolidado y confiable."}'::jsonb,
            2880, NOW()
        ) ON CONFLICT (link_id) DO NOTHING;
    END IF;

    -- ── Lucas Pereyra: alto potencial (desempeño medio + alto potencial) ──
    IF lucas_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.assessment_links
        WHERE campana_id = camp_id AND empleado_id = lucas_id
    ) THEN
        INSERT INTO public.assessment_links
            (campana_id, empleado_id, email_destino, nombre_destino, estado, expira_en)
        VALUES (camp_id, lucas_id,
                'lucas.pereyra@karstec.com', 'Lucas Pereyra',
                'completado', NOW() + INTERVAL '180 days')
        RETURNING id INTO link_id;

        INSERT INTO public.assessment_resultados
            (link_id, campana_id, empleado_id,
             respuestas, puntuacion, perfil_resultado,
             tiempo_total_segundos, completado_en)
        VALUES (
            link_id, camp_id, lucas_id,
            '{"completado": true, "items_conductual": 32, "items_cognitivo": 25}'::jsonb,
            '{"desempeno": 7.4, "potencial": 9.1, "cognitivo": 8.2, "total": 8.2}'::jsonb,
            '{"cuadrante": "alto_potencial", "eje_desempeno": "medio", "eje_potencial": "alto",
              "descripcion": "Alto potencial de crecimiento. Candidato ideal para plan de carrera acelerado hacia Tech Lead."}'::jsonb,
            2640, NOW()
        ) ON CONFLICT (link_id) DO NOTHING;
    END IF;
END $$;

-- ════════════════════════════════════════════════════════════════
-- 9. PLAN DE CARRERA — Lucas Pereyra → Tech Lead (readiness 45%)
-- ════════════════════════════════════════════════════════════════

DO $$
DECLARE
    lucas_id  UUID;
    martin_id UUID;
    plan_id   UUID;
BEGIN
    SELECT id INTO lucas_id  FROM public.empleados WHERE email_corporativo = 'lucas.pereyra@karstec.com';
    SELECT id INTO martin_id FROM public.empleados WHERE email_corporativo = 'martin.rodriguez@karstec.com';

    IF lucas_id IS NULL THEN RETURN; END IF;

    INSERT INTO public.planes_carrera
        (empleado_id, cargo_objetivo, descripcion,
         fecha_inicio, fecha_objetivo, estado, progreso, responsable_id)
    SELECT
        lucas_id,
        'Tech Lead',
        'Desarrollo hacia el rol de Tech Lead en el equipo de Producto. Foco en liderazgo técnico, arquitectura de sistemas y gestión de personas.',
        '2025-01-01', '2026-12-31',
        'activo', 45,
        martin_id
    WHERE NOT EXISTS (
        SELECT 1 FROM public.planes_carrera WHERE empleado_id = lucas_id
    )
    RETURNING id INTO plan_id;

    IF plan_id IS NULL THEN RETURN; END IF;

    -- Hito 1: Certificación AWS (completado)
    INSERT INTO public.planes_carrera_hitos
        (plan_id, nombre, descripcion, tipo, fecha_objetivo, fecha_completada, estado)
    VALUES (
        plan_id,
        'Certificación AWS Solutions Architect',
        'Obtener la certificación AWS Solutions Architect Associate para profundizar el dominio de infraestructura cloud.',
        'certificacion', '2025-06-30', '2025-05-28', 'completado'
    );

    -- Hito 2: Liderazgo técnico del proyecto de microservicios (en progreso)
    INSERT INTO public.planes_carrera_hitos
        (plan_id, nombre, descripcion, tipo, fecha_objetivo, estado)
    VALUES (
        plan_id,
        'Liderazgo técnico del proyecto de microservicios',
        'Liderar el diseño e implementación de la migración de arquitectura monolítica a microservicios. Incluye toma de decisiones de arquitectura, coordinación del equipo y presentaciones a management.',
        'proyecto', '2025-12-31', 'en_progreso'
    );

    -- Hito 3: Capacitación en liderazgo y gestión de equipos (pendiente)
    INSERT INTO public.planes_carrera_hitos
        (plan_id, nombre, descripcion, tipo, fecha_objetivo, estado)
    VALUES (
        plan_id,
        'Programa de liderazgo y gestión de equipos técnicos',
        'Completar programa de formación en management técnico, feedback efectivo, resolución de conflictos y conducción de equipos de ingeniería.',
        'capacitacion', '2026-06-30', 'pendiente'
    );
END $$;

COMMIT;


-- ############################################################
-- Migraciones 054-055 (retrofit multiempresa versionado)
-- Deben correr ANTES de 036: las migraciones 036-053 referencian
-- public.empresas y empleados.empresa_id, creados aquí.
-- ############################################################


-- ============================================================
-- 054_create_empresas.sql
-- ============================================================

-- Versiona el retrofit multiempresa que se aplicó A MANO en Supabase y nunca
-- se versionó: crea la tabla `empresas` (raíz del modelo multiempresa) y la
-- siembra con las dos empresas reales de producción.

BEGIN;

CREATE TABLE IF NOT EXISTS public.empresas (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre       VARCHAR      NOT NULL,
    activa       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    razon_social VARCHAR,
    cuit         VARCHAR,
    direccion    TEXT,
    telefono     VARCHAR,
    email        VARCHAR,
    logo_url     TEXT
);

INSERT INTO public.empresas (id, nombre) VALUES
    ('5201b8ec-ac7f-4e83-baee-5e924e420b31', 'HR Karstec'),
    ('0b1dfd2a-ebe3-48b8-990c-4e092ba1595a', 'Servicios y Consultoría')
ON CONFLICT (id) DO NOTHING;

DROP TRIGGER IF EXISTS trg_empresas_updated_at ON public.empresas;
CREATE TRIGGER trg_empresas_updated_at
    BEFORE UPDATE ON public.empresas
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "empresas_select_authenticated" ON public.empresas;
CREATE POLICY "empresas_select_authenticated"
    ON public.empresas FOR SELECT
    USING (auth.uid() IS NOT NULL);

COMMIT;


-- ============================================================
-- 055_retrofit_empresa_id.sql
-- ============================================================

-- Versiona el retrofit de `empresa_id` sobre las tablas históricas (001-035)
-- que el código ya filtra pero cuyo CREATE TABLE original no la incluía.
-- Idempotente: ADD COLUMN IF NOT EXISTS, backfill a HR Karstec, SET NOT NULL,
-- FK con guard sobre pg_constraint (nombres exactos de producción).
-- reportes_generados queda NULLABLE (sin backfill ni NOT NULL).

BEGIN;

DO $$
BEGIN
    ALTER TABLE public.areas ADD COLUMN IF NOT EXISTS empresa_id UUID;
    UPDATE public.areas SET empresa_id = '5201b8ec-ac7f-4e83-baee-5e924e420b31' WHERE empresa_id IS NULL;
    ALTER TABLE public.areas ALTER COLUMN empresa_id SET NOT NULL;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'areas_empresa_fkey' AND conrelid = 'public.areas'::regclass) THEN
        ALTER TABLE public.areas ADD CONSTRAINT areas_empresa_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
    END IF;
END $$;

DO $$
BEGIN
    ALTER TABLE public.vacantes ADD COLUMN IF NOT EXISTS empresa_id UUID;
    UPDATE public.vacantes SET empresa_id = '5201b8ec-ac7f-4e83-baee-5e924e420b31' WHERE empresa_id IS NULL;
    ALTER TABLE public.vacantes ALTER COLUMN empresa_id SET NOT NULL;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vacantes_empresa_fkey' AND conrelid = 'public.vacantes'::regclass) THEN
        ALTER TABLE public.vacantes ADD CONSTRAINT vacantes_empresa_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
    END IF;
END $$;

DO $$
BEGIN
    ALTER TABLE public.candidatos ADD COLUMN IF NOT EXISTS empresa_id UUID;
    UPDATE public.candidatos SET empresa_id = '5201b8ec-ac7f-4e83-baee-5e924e420b31' WHERE empresa_id IS NULL;
    ALTER TABLE public.candidatos ALTER COLUMN empresa_id SET NOT NULL;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'candidatos_empresa_fkey' AND conrelid = 'public.candidatos'::regclass) THEN
        ALTER TABLE public.candidatos ADD CONSTRAINT candidatos_empresa_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
    END IF;
END $$;

DO $$
BEGIN
    ALTER TABLE public.costos_nomina ADD COLUMN IF NOT EXISTS empresa_id UUID;
    UPDATE public.costos_nomina SET empresa_id = '5201b8ec-ac7f-4e83-baee-5e924e420b31' WHERE empresa_id IS NULL;
    ALTER TABLE public.costos_nomina ALTER COLUMN empresa_id SET NOT NULL;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'costos_nomina_empresa_fkey' AND conrelid = 'public.costos_nomina'::regclass) THEN
        ALTER TABLE public.costos_nomina ADD CONSTRAINT costos_nomina_empresa_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
    END IF;
END $$;

DO $$
BEGIN
    ALTER TABLE public.presupuesto_areas ADD COLUMN IF NOT EXISTS empresa_id UUID;
    UPDATE public.presupuesto_areas SET empresa_id = '5201b8ec-ac7f-4e83-baee-5e924e420b31' WHERE empresa_id IS NULL;
    ALTER TABLE public.presupuesto_areas ALTER COLUMN empresa_id SET NOT NULL;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'presupuesto_areas_empresa_fkey' AND conrelid = 'public.presupuesto_areas'::regclass) THEN
        ALTER TABLE public.presupuesto_areas ADD CONSTRAINT presupuesto_areas_empresa_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
    END IF;
END $$;

DO $$
BEGIN
    ALTER TABLE public.sucesion_posiciones ADD COLUMN IF NOT EXISTS empresa_id UUID;
    UPDATE public.sucesion_posiciones SET empresa_id = '5201b8ec-ac7f-4e83-baee-5e924e420b31' WHERE empresa_id IS NULL;
    ALTER TABLE public.sucesion_posiciones ALTER COLUMN empresa_id SET NOT NULL;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sucesion_posiciones_empresa_fkey' AND conrelid = 'public.sucesion_posiciones'::regclass) THEN
        ALTER TABLE public.sucesion_posiciones ADD CONSTRAINT sucesion_posiciones_empresa_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
    END IF;
END $$;

DO $$
BEGIN
    ALTER TABLE public.planes_carrera ADD COLUMN IF NOT EXISTS empresa_id UUID;
    UPDATE public.planes_carrera SET empresa_id = '5201b8ec-ac7f-4e83-baee-5e924e420b31' WHERE empresa_id IS NULL;
    ALTER TABLE public.planes_carrera ALTER COLUMN empresa_id SET NOT NULL;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'planes_carrera_empresa_fkey' AND conrelid = 'public.planes_carrera'::regclass) THEN
        ALTER TABLE public.planes_carrera ADD CONSTRAINT planes_carrera_empresa_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
    END IF;
END $$;

DO $$
BEGIN
    ALTER TABLE public.planes_carrera_hitos ADD COLUMN IF NOT EXISTS empresa_id UUID;
    UPDATE public.planes_carrera_hitos SET empresa_id = '5201b8ec-ac7f-4e83-baee-5e924e420b31' WHERE empresa_id IS NULL;
    ALTER TABLE public.planes_carrera_hitos ALTER COLUMN empresa_id SET NOT NULL;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'planes_carrera_hitos_empresa_fkey' AND conrelid = 'public.planes_carrera_hitos'::regclass) THEN
        ALTER TABLE public.planes_carrera_hitos ADD CONSTRAINT planes_carrera_hitos_empresa_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
    END IF;
END $$;

DO $$
BEGIN
    ALTER TABLE public.assessment_campanas ADD COLUMN IF NOT EXISTS empresa_id UUID;
    UPDATE public.assessment_campanas SET empresa_id = '5201b8ec-ac7f-4e83-baee-5e924e420b31' WHERE empresa_id IS NULL;
    ALTER TABLE public.assessment_campanas ALTER COLUMN empresa_id SET NOT NULL;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assessment_campanas_empresa_fkey' AND conrelid = 'public.assessment_campanas'::regclass) THEN
        ALTER TABLE public.assessment_campanas ADD CONSTRAINT assessment_campanas_empresa_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
    END IF;
END $$;

DO $$
BEGIN
    ALTER TABLE public.assessment_links ADD COLUMN IF NOT EXISTS empresa_id UUID;
    UPDATE public.assessment_links SET empresa_id = '5201b8ec-ac7f-4e83-baee-5e924e420b31' WHERE empresa_id IS NULL;
    ALTER TABLE public.assessment_links ALTER COLUMN empresa_id SET NOT NULL;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assessment_links_empresa_fkey' AND conrelid = 'public.assessment_links'::regclass) THEN
        ALTER TABLE public.assessment_links ADD CONSTRAINT assessment_links_empresa_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
    END IF;
END $$;

DO $$
BEGIN
    ALTER TABLE public.assessment_resultados ADD COLUMN IF NOT EXISTS empresa_id UUID;
    UPDATE public.assessment_resultados SET empresa_id = '5201b8ec-ac7f-4e83-baee-5e924e420b31' WHERE empresa_id IS NULL;
    ALTER TABLE public.assessment_resultados ALTER COLUMN empresa_id SET NOT NULL;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assessment_resultados_empresa_fkey' AND conrelid = 'public.assessment_resultados'::regclass) THEN
        ALTER TABLE public.assessment_resultados ADD CONSTRAINT assessment_resultados_empresa_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
    END IF;
END $$;

DO $$
BEGIN
    ALTER TABLE public.assessment_reportes ADD COLUMN IF NOT EXISTS empresa_id UUID;
    UPDATE public.assessment_reportes SET empresa_id = '5201b8ec-ac7f-4e83-baee-5e924e420b31' WHERE empresa_id IS NULL;
    ALTER TABLE public.assessment_reportes ALTER COLUMN empresa_id SET NOT NULL;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assessment_reportes_empresa_fkey' AND conrelid = 'public.assessment_reportes'::regclass) THEN
        ALTER TABLE public.assessment_reportes ADD CONSTRAINT assessment_reportes_empresa_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
    END IF;
END $$;

DO $$
BEGIN
    ALTER TABLE public.onboarding_templates ADD COLUMN IF NOT EXISTS empresa_id UUID;
    UPDATE public.onboarding_templates SET empresa_id = '5201b8ec-ac7f-4e83-baee-5e924e420b31' WHERE empresa_id IS NULL;
    ALTER TABLE public.onboarding_templates ALTER COLUMN empresa_id SET NOT NULL;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'onboarding_templates_empresa_fkey' AND conrelid = 'public.onboarding_templates'::regclass) THEN
        ALTER TABLE public.onboarding_templates ADD CONSTRAINT onboarding_templates_empresa_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
    END IF;
END $$;

DO $$
BEGIN
    ALTER TABLE public.onboarding_tareas ADD COLUMN IF NOT EXISTS empresa_id UUID;
    UPDATE public.onboarding_tareas SET empresa_id = '5201b8ec-ac7f-4e83-baee-5e924e420b31' WHERE empresa_id IS NULL;
    ALTER TABLE public.onboarding_tareas ALTER COLUMN empresa_id SET NOT NULL;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'onboarding_tareas_empresa_fkey' AND conrelid = 'public.onboarding_tareas'::regclass) THEN
        ALTER TABLE public.onboarding_tareas ADD CONSTRAINT onboarding_tareas_empresa_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
    END IF;
END $$;

DO $$
BEGIN
    ALTER TABLE public.onboarding_instancias ADD COLUMN IF NOT EXISTS empresa_id UUID;
    UPDATE public.onboarding_instancias SET empresa_id = '5201b8ec-ac7f-4e83-baee-5e924e420b31' WHERE empresa_id IS NULL;
    ALTER TABLE public.onboarding_instancias ALTER COLUMN empresa_id SET NOT NULL;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'onboarding_instancias_empresa_fkey' AND conrelid = 'public.onboarding_instancias'::regclass) THEN
        ALTER TABLE public.onboarding_instancias ADD CONSTRAINT onboarding_instancias_empresa_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
    END IF;
END $$;

DO $$
BEGIN
    ALTER TABLE public.onboarding_progreso ADD COLUMN IF NOT EXISTS empresa_id UUID;
    UPDATE public.onboarding_progreso SET empresa_id = '5201b8ec-ac7f-4e83-baee-5e924e420b31' WHERE empresa_id IS NULL;
    ALTER TABLE public.onboarding_progreso ALTER COLUMN empresa_id SET NOT NULL;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'onboarding_progreso_empresa_fkey' AND conrelid = 'public.onboarding_progreso'::regclass) THEN
        ALTER TABLE public.onboarding_progreso ADD CONSTRAINT onboarding_progreso_empresa_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
    END IF;
END $$;

DO $$
BEGIN
    ALTER TABLE public.offboarding_instancias ADD COLUMN IF NOT EXISTS empresa_id UUID;
    UPDATE public.offboarding_instancias SET empresa_id = '5201b8ec-ac7f-4e83-baee-5e924e420b31' WHERE empresa_id IS NULL;
    ALTER TABLE public.offboarding_instancias ALTER COLUMN empresa_id SET NOT NULL;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'offboarding_instancias_empresa_fkey' AND conrelid = 'public.offboarding_instancias'::regclass) THEN
        ALTER TABLE public.offboarding_instancias ADD CONSTRAINT offboarding_instancias_empresa_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
    END IF;
END $$;

DO $$
BEGIN
    ALTER TABLE public.offboarding_activos ADD COLUMN IF NOT EXISTS empresa_id UUID;
    UPDATE public.offboarding_activos SET empresa_id = '5201b8ec-ac7f-4e83-baee-5e924e420b31' WHERE empresa_id IS NULL;
    ALTER TABLE public.offboarding_activos ALTER COLUMN empresa_id SET NOT NULL;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'offboarding_activos_empresa_fkey' AND conrelid = 'public.offboarding_activos'::regclass) THEN
        ALTER TABLE public.offboarding_activos ADD CONSTRAINT offboarding_activos_empresa_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
    END IF;
END $$;

DO $$
BEGIN
    ALTER TABLE public.documentos_empleado ADD COLUMN IF NOT EXISTS empresa_id UUID;
    UPDATE public.documentos_empleado SET empresa_id = '5201b8ec-ac7f-4e83-baee-5e924e420b31' WHERE empresa_id IS NULL;
    ALTER TABLE public.documentos_empleado ALTER COLUMN empresa_id SET NOT NULL;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'documentos_empleado_empresa_fkey' AND conrelid = 'public.documentos_empleado'::regclass) THEN
        ALTER TABLE public.documentos_empleado ADD CONSTRAINT documentos_empleado_empresa_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
    END IF;
END $$;

DO $$
BEGIN
    ALTER TABLE public.configuracion_empresa ADD COLUMN IF NOT EXISTS empresa_id UUID;
    UPDATE public.configuracion_empresa SET empresa_id = '5201b8ec-ac7f-4e83-baee-5e924e420b31' WHERE empresa_id IS NULL;
    ALTER TABLE public.configuracion_empresa ALTER COLUMN empresa_id SET NOT NULL;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'configuracion_empresa_empresa_fkey' AND conrelid = 'public.configuracion_empresa'::regclass) THEN
        ALTER TABLE public.configuracion_empresa ADD CONSTRAINT configuracion_empresa_empresa_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
    END IF;
END $$;

-- reportes_generados: empresa_id NULLABLE (sin backfill ni SET NOT NULL).
DO $$
BEGIN
    ALTER TABLE public.reportes_generados ADD COLUMN IF NOT EXISTS empresa_id UUID;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reportes_generados_empresa_id_fkey' AND conrelid = 'public.reportes_generados'::regclass) THEN
        ALTER TABLE public.reportes_generados ADD CONSTRAINT reportes_generados_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
    END IF;
END $$;

-- Índices empresa_id en las tablas de mayor volumen.
CREATE INDEX IF NOT EXISTS idx_areas_empresa_id                  ON public.areas (empresa_id);
CREATE INDEX IF NOT EXISTS idx_vacantes_empresa_id               ON public.vacantes (empresa_id);
CREATE INDEX IF NOT EXISTS idx_candidatos_empresa_id             ON public.candidatos (empresa_id);
CREATE INDEX IF NOT EXISTS idx_costos_nomina_empresa_id          ON public.costos_nomina (empresa_id);
CREATE INDEX IF NOT EXISTS idx_documentos_empleado_empresa_id    ON public.documentos_empleado (empresa_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_instancias_empresa_id  ON public.onboarding_instancias (empresa_id);
CREATE INDEX IF NOT EXISTS idx_offboarding_instancias_empresa_id ON public.offboarding_instancias (empresa_id);
CREATE INDEX IF NOT EXISTS idx_assessment_resultados_empresa_id  ON public.assessment_resultados (empresa_id);
CREATE INDEX IF NOT EXISTS idx_planes_carrera_empresa_id         ON public.planes_carrera (empresa_id);

COMMIT;


-- ############################################################
-- Migraciones 036-053 (módulos multiempresa)
-- Dependen de empresas + empresa_id creados arriba (054-055).
-- ############################################################


-- ============================================================
-- 036_create_solicitudes_vacaciones.sql
-- ============================================================

-- 036_create_solicitudes_vacaciones.sql
-- Tabla de registros de vacaciones.
-- empresa_id se hereda del empleado al crear (no lo provee el usuario directamente).
-- Estado (planificada/tomada/cancelada) es DERIVADO al leer: solo se persiste la columna `cancelada`.

BEGIN;

-- La FK compuesta (empleado_id, empresa_id) → empleados(id, empresa_id) requiere
-- un UNIQUE constraint explícito en empleados sobre esas dos columnas.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'empleados_id_empresa_uq'
      AND conrelid = 'public.empleados'::regclass
  ) THEN
    ALTER TABLE public.empleados
      ADD CONSTRAINT empleados_id_empresa_uq UNIQUE (id, empresa_id);
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.solicitudes_vacaciones (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id  UUID        NOT NULL REFERENCES public.empresas(id),
    empleado_id UUID        NOT NULL,
    fecha_desde DATE        NOT NULL,
    fecha_hasta DATE        NOT NULL,
    dias        INTEGER     NOT NULL CHECK (dias > 0),
    comentario  TEXT,
    cancelada   BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT sv_fechas_check
        CHECK (fecha_hasta >= fecha_desde),
    CONSTRAINT sv_empleado_empresa_fk
        FOREIGN KEY (empleado_id, empresa_id)
        REFERENCES public.empleados(id, empresa_id)
);

CREATE INDEX IF NOT EXISTS idx_sv_empresa_id
    ON public.solicitudes_vacaciones (empresa_id);

CREATE INDEX IF NOT EXISTS idx_sv_empleado_id
    ON public.solicitudes_vacaciones (empleado_id);

CREATE TRIGGER trg_sv_updated_at
    BEFORE UPDATE ON public.solicitudes_vacaciones
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_auditoria_sv
    AFTER INSERT OR UPDATE OR DELETE ON public.solicitudes_vacaciones
    FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria();

ALTER TABLE public.solicitudes_vacaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sv_select_authenticated"
    ON public.solicitudes_vacaciones FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "sv_write_admin"
    ON public.solicitudes_vacaciones FOR ALL
    USING (public.get_current_user_rol() = 'admin_rrhh');

COMMIT;

NOTIFY pgrst, 'reload schema';


-- ============================================================
-- 037_create_ausencias.sql
-- ============================================================

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


-- ============================================================
-- 038_create_capacitaciones.sql
-- ============================================================

-- 038_create_capacitaciones.sql
-- Catálogo de capacitaciones/cursos por empresa.
-- UNIQUE(id, empresa_id) requerido para la FK compuesta de empleado_capacitacion.

BEGIN;

CREATE TABLE IF NOT EXISTS public.capacitaciones (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id     UUID        NOT NULL REFERENCES public.empresas(id),
    nombre         TEXT        NOT NULL,
    descripcion    TEXT,
    categoria      TEXT,
    duracion_horas NUMERIC,
    obligatoria    BOOLEAN     NOT NULL DEFAULT FALSE,
    activo         BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (id, empresa_id)
);

CREATE INDEX IF NOT EXISTS idx_cap_empresa_id ON public.capacitaciones (empresa_id);

CREATE TRIGGER trg_cap_updated_at
    BEFORE UPDATE ON public.capacitaciones
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_auditoria_cap
    AFTER INSERT OR UPDATE OR DELETE ON public.capacitaciones
    FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria();

NOTIFY pgrst, 'reload schema';

COMMIT;


-- ============================================================
-- 039_create_empleado_capacitacion.sql
-- ============================================================

-- 039_create_empleado_capacitacion.sql
-- Asignación de una capacitación a un empleado con seguimiento de estado y certificado.
-- FK compuesta garantiza que empleado y capacitación son de la misma empresa.
-- UNIQUE(capacitacion_id, empleado_id) impide asignar el mismo curso dos veces al mismo empleado.

BEGIN;

CREATE TABLE IF NOT EXISTS public.empleado_capacitacion (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id        UUID        NOT NULL,
    capacitacion_id   UUID        NOT NULL,
    empleado_id       UUID        NOT NULL,
    estado            TEXT        NOT NULL DEFAULT 'pendiente'
                                  CHECK (estado IN ('pendiente', 'en_curso', 'completado')),
    fecha_asignacion  DATE,
    fecha_limite      DATE,
    fecha_completado  DATE,
    certificado_url   TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (capacitacion_id, empleado_id),

    CONSTRAINT ec_capacitacion_empresa_fk
        FOREIGN KEY (capacitacion_id, empresa_id)
        REFERENCES public.capacitaciones(id, empresa_id),

    CONSTRAINT ec_empleado_empresa_fk
        FOREIGN KEY (empleado_id, empresa_id)
        REFERENCES public.empleados(id, empresa_id)
);

CREATE INDEX IF NOT EXISTS idx_ec_empresa_id      ON public.empleado_capacitacion (empresa_id);
CREATE INDEX IF NOT EXISTS idx_ec_empleado_id     ON public.empleado_capacitacion (empleado_id);
CREATE INDEX IF NOT EXISTS idx_ec_capacitacion_id ON public.empleado_capacitacion (capacitacion_id);

CREATE TRIGGER trg_ec_updated_at
    BEFORE UPDATE ON public.empleado_capacitacion
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_auditoria_ec
    AFTER INSERT OR UPDATE OR DELETE ON public.empleado_capacitacion
    FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria();

NOTIFY pgrst, 'reload schema';

COMMIT;


-- ============================================================
-- 040_create_ev_plantillas.sql
-- ============================================================

-- 040_create_ev_plantillas.sql
-- Plantillas reutilizables de evaluación de desempeño.
-- tipo_escala define si la puntuación es numérica (escala_min/max) o cualitativa (opciones_cualitativas).
-- area_id nullable: NULL = aplica a toda la empresa.
-- UNIQUE(id, empresa_id) requerido para FKs compuestas en tablas hijas.

BEGIN;

CREATE TABLE IF NOT EXISTS public.ev_plantillas (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id              UUID        NOT NULL REFERENCES public.empresas(id),
    nombre                  TEXT        NOT NULL,
    descripcion             TEXT,
    tipo_escala             TEXT        NOT NULL CHECK (tipo_escala IN ('numerica', 'cualitativa')),
    escala_min              INT,
    escala_max              INT,
    opciones_cualitativas   JSONB,
    activa                  BOOLEAN     NOT NULL DEFAULT TRUE,
    area_id                 UUID        REFERENCES public.areas(id),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (id, empresa_id)
);

CREATE INDEX IF NOT EXISTS idx_evp_empresa ON public.ev_plantillas (empresa_id);
CREATE INDEX IF NOT EXISTS idx_evp_area    ON public.ev_plantillas (area_id);
CREATE INDEX IF NOT EXISTS idx_evp_activa  ON public.ev_plantillas (activa);

CREATE TRIGGER trg_evp_updated_at
    BEFORE UPDATE ON public.ev_plantillas
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_auditoria_evp
    AFTER INSERT OR UPDATE OR DELETE ON public.ev_plantillas
    FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria();

NOTIFY pgrst, 'reload schema';

COMMIT;


-- ============================================================
-- 041_create_ev_criterios.sql
-- ============================================================

-- 041_create_ev_criterios.sql
-- Criterios de evaluación que pertenecen a una plantilla.
-- FK compuesta (plantilla_id, empresa_id) garantiza que criterio y plantilla son de la misma empresa.
-- peso > 0 para que el promedio ponderado sea siempre válido.

BEGIN;

CREATE TABLE IF NOT EXISTS public.ev_criterios (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id      UUID        NOT NULL REFERENCES public.empresas(id),
    plantilla_id    UUID        NOT NULL,
    nombre          TEXT        NOT NULL,
    descripcion     TEXT,
    peso            NUMERIC     NOT NULL DEFAULT 1 CHECK (peso > 0),
    orden           INT         NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT ev_criterio_plantilla_fk
        FOREIGN KEY (plantilla_id, empresa_id)
        REFERENCES public.ev_plantillas(id, empresa_id)
);

CREATE INDEX IF NOT EXISTS idx_evcrit_plantilla ON public.ev_criterios (plantilla_id);
CREATE INDEX IF NOT EXISTS idx_evcrit_empresa   ON public.ev_criterios (empresa_id);

CREATE TRIGGER trg_evcrit_updated_at
    BEFORE UPDATE ON public.ev_criterios
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_auditoria_evcrit
    AFTER INSERT OR UPDATE OR DELETE ON public.ev_criterios
    FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria();

NOTIFY pgrst, 'reload schema';

COMMIT;


-- ============================================================
-- 042_create_ev_ciclos.sql
-- ============================================================

-- 042_create_ev_ciclos.sql
-- Ciclos de evaluación: campaña temporal que usa una plantilla (ej. "Evaluación Q2 2026").
-- FK compuesta (plantilla_id, empresa_id) garantiza misma empresa.
-- UNIQUE(id, empresa_id) requerido para FKs compuestas en ev_instancias.

BEGIN;

CREATE TABLE IF NOT EXISTS public.ev_ciclos (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id      UUID        NOT NULL REFERENCES public.empresas(id),
    nombre          TEXT        NOT NULL,
    plantilla_id    UUID        NOT NULL,
    fecha_inicio    DATE        NOT NULL,
    fecha_fin       DATE        NOT NULL,
    estado          TEXT        NOT NULL DEFAULT 'abierto' CHECK (estado IN ('abierto', 'cerrado')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (id, empresa_id),

    CONSTRAINT ev_ciclo_plantilla_fk
        FOREIGN KEY (plantilla_id, empresa_id)
        REFERENCES public.ev_plantillas(id, empresa_id)
);

CREATE INDEX IF NOT EXISTS idx_evcicp_empresa   ON public.ev_ciclos (empresa_id);
CREATE INDEX IF NOT EXISTS idx_evcicp_plantilla ON public.ev_ciclos (plantilla_id);
CREATE INDEX IF NOT EXISTS idx_evcicp_estado    ON public.ev_ciclos (estado);

CREATE TRIGGER trg_evciclo_updated_at
    BEFORE UPDATE ON public.ev_ciclos
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_auditoria_evciclo
    AFTER INSERT OR UPDATE OR DELETE ON public.ev_ciclos
    FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria();

NOTIFY pgrst, 'reload schema';

COMMIT;


-- ============================================================
-- 043_create_ev_instancias.sql
-- ============================================================

-- 043_create_ev_instancias.sql
-- Evaluación de un empleado dentro de un ciclo.
-- UNIQUE(ciclo_id, empleado_id): un empleado se evalúa una sola vez por ciclo.
-- FKs compuestas garantizan empresa_id consistente entre instancia, ciclo y empleado.
-- UNIQUE(id, empresa_id) requerido para FKs compuestas en ev_resultados.

BEGIN;

CREATE TABLE IF NOT EXISTS public.ev_instancias (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id          UUID        NOT NULL REFERENCES public.empresas(id),
    ciclo_id            UUID        NOT NULL,
    empleado_id         UUID        NOT NULL,
    evaluador_id        UUID        REFERENCES public.empleados(id),
    estado              TEXT        NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador', 'finalizada')),
    puntaje_global      NUMERIC,
    comentario_general  TEXT,
    fecha_evaluacion    DATE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (id, empresa_id),
    UNIQUE (ciclo_id, empleado_id),

    CONSTRAINT ev_instancia_ciclo_fk
        FOREIGN KEY (ciclo_id, empresa_id)
        REFERENCES public.ev_ciclos(id, empresa_id),

    CONSTRAINT ev_instancia_empleado_fk
        FOREIGN KEY (empleado_id, empresa_id)
        REFERENCES public.empleados(id, empresa_id)
);

CREATE INDEX IF NOT EXISTS idx_evinst_empresa  ON public.ev_instancias (empresa_id);
CREATE INDEX IF NOT EXISTS idx_evinst_ciclo    ON public.ev_instancias (ciclo_id);
CREATE INDEX IF NOT EXISTS idx_evinst_empleado ON public.ev_instancias (empleado_id);
CREATE INDEX IF NOT EXISTS idx_evinst_estado   ON public.ev_instancias (estado);

CREATE TRIGGER trg_evinst_updated_at
    BEFORE UPDATE ON public.ev_instancias
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_auditoria_evinst
    AFTER INSERT OR UPDATE OR DELETE ON public.ev_instancias
    FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria();

NOTIFY pgrst, 'reload schema';

COMMIT;


-- ============================================================
-- 044_create_ev_resultados.sql
-- ============================================================

-- 044_create_ev_resultados.sql
-- Resultado por criterio dentro de una instancia de evaluación.
-- Las filas se generan vacías automáticamente al crear la instancia (una por criterio de la plantilla).
-- puntaje: para escala numérica. valor: para escala cualitativa. Se usa uno según tipo_escala de la plantilla.
-- UNIQUE(instancia_id, criterio_id): una sola fila por combinación.

BEGIN;

CREATE TABLE IF NOT EXISTS public.ev_resultados (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id      UUID        NOT NULL REFERENCES public.empresas(id),
    instancia_id    UUID        NOT NULL,
    criterio_id     UUID        NOT NULL REFERENCES public.ev_criterios(id),
    puntaje         NUMERIC,
    valor           TEXT,
    comentario      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (instancia_id, criterio_id),

    CONSTRAINT ev_resultado_instancia_fk
        FOREIGN KEY (instancia_id, empresa_id)
        REFERENCES public.ev_instancias(id, empresa_id)
);

CREATE INDEX IF NOT EXISTS idx_evres_instancia ON public.ev_resultados (instancia_id);
CREATE INDEX IF NOT EXISTS idx_evres_empresa   ON public.ev_resultados (empresa_id);

CREATE TRIGGER trg_evres_updated_at
    BEFORE UPDATE ON public.ev_resultados
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_auditoria_evres
    AFTER INSERT OR UPDATE OR DELETE ON public.ev_resultados
    FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria();

NOTIFY pgrst, 'reload schema';

COMMIT;


-- ============================================================
-- 045_vacaciones_tipo.sql
-- ============================================================

-- Agrega columna tipo a solicitudes_vacaciones para distinguir la categoría de evento.
-- Default 'vacaciones' → el registro existente queda válido sin cambios de datos.
-- Solo 'vacaciones' descuenta del saldo anual; los demás tipos son adicionales.

ALTER TABLE solicitudes_vacaciones
  ADD COLUMN tipo varchar NOT NULL DEFAULT 'vacaciones'
    CHECK (tipo IN ('vacaciones', 'semana_free', 'dia_free', 'permiso_especial'));

CREATE INDEX IF NOT EXISTS idx_solicitudes_vacaciones_empresa_tipo
  ON solicitudes_vacaciones (empresa_id, tipo);

NOTIFY pgrst, 'reload schema';


-- ============================================================
-- 046_empleados_dias_vacaciones.sql
-- ============================================================

-- Agrega asignación anual de días de vacaciones pagas por empleado.
-- Solo las solicitudes tipo='vacaciones' descuentan de este saldo.
-- Default 14 días para todos los empleados existentes.

ALTER TABLE empleados
  ADD COLUMN dias_vacaciones_asignados integer NOT NULL DEFAULT 14;

COMMENT ON COLUMN empleados.dias_vacaciones_asignados
  IS 'Asignación anual de días de vacaciones pagas. Solo las solicitudes tipo vacaciones descuentan de este saldo.';

NOTIFY pgrst, 'reload schema';


-- ============================================================
-- 047_create_inventario_items.sql
-- ============================================================

-- 047_create_inventario_items.sql
-- Catálogo de ítems de inventario por empresa.
-- UNIQUE(id, empresa_id) requerido para FK compuesta de inventario_asignaciones.
-- estado: se actualiza automáticamente al asignar/devolver (gestionado por el service).

BEGIN;

CREATE TABLE IF NOT EXISTS public.inventario_items (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id   UUID        NOT NULL REFERENCES public.empresas(id),
    nombre       TEXT        NOT NULL,
    descripcion  TEXT,
    tipo         TEXT        NOT NULL,
    numero_serie TEXT,
    estado       TEXT        NOT NULL DEFAULT 'disponible'
                             CHECK (estado IN ('disponible', 'asignado', 'en_reparacion', 'baja')),
    fecha_alta   DATE        NOT NULL DEFAULT CURRENT_DATE,
    costo        NUMERIC,
    notas        TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (id, empresa_id)
);

CREATE INDEX IF NOT EXISTS idx_inv_items_empresa ON public.inventario_items (empresa_id);
CREATE INDEX IF NOT EXISTS idx_inv_items_estado  ON public.inventario_items (estado);

DROP TRIGGER IF EXISTS trg_inv_items_updated_at ON public.inventario_items;
CREATE TRIGGER trg_inv_items_updated_at
    BEFORE UPDATE ON public.inventario_items
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_auditoria_inv_items ON public.inventario_items;
CREATE TRIGGER trg_auditoria_inv_items
    AFTER INSERT OR UPDATE OR DELETE ON public.inventario_items
    FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria();

COMMIT;

NOTIFY pgrst, 'reload schema';


-- ============================================================
-- 048_create_inventario_asignaciones.sql
-- ============================================================

-- 048_create_inventario_asignaciones.sql
-- Historial de asignaciones de ítems a empleados (una fila por asignación/devolución).
-- FK compuestas garantizan que ítem y empleado pertenecen a la misma empresa.
--
-- CLAVE — índice único PARCIAL (no UNIQUE simple):
--   CREATE UNIQUE INDEX ... WHERE fecha_devolucion IS NULL
--   → un ítem solo puede tener UNA asignación activa a la vez.
--   → el mismo ítem puede tener N asignaciones históricas (fecha_devolucion NOT NULL).
--   Esta semántica no es posible con un UNIQUE constraint simple.

BEGIN;

CREATE TABLE IF NOT EXISTS public.inventario_asignaciones (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id        UUID        NOT NULL,
    item_id           UUID        NOT NULL,
    empleado_id       UUID        NOT NULL,
    fecha_asignacion  DATE        NOT NULL DEFAULT CURRENT_DATE,
    fecha_devolucion  DATE,
    estado_devolucion TEXT        CHECK (
                                    estado_devolucion IN ('ok', 'con_daño')
                                    OR estado_devolucion IS NULL
                                  ),
    notas             TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT inv_asig_item_empresa_fk
        FOREIGN KEY (item_id, empresa_id)
        REFERENCES public.inventario_items(id, empresa_id),

    CONSTRAINT inv_asig_empleado_empresa_fk
        FOREIGN KEY (empleado_id, empresa_id)
        REFERENCES public.empleados(id, empresa_id)
);

-- Un ítem solo puede estar asignado a una persona a la vez.
CREATE UNIQUE INDEX IF NOT EXISTS idx_inv_asig_item_activo
    ON public.inventario_asignaciones (item_id)
    WHERE fecha_devolucion IS NULL;

CREATE INDEX IF NOT EXISTS idx_inv_asig_empresa  ON public.inventario_asignaciones (empresa_id);
CREATE INDEX IF NOT EXISTS idx_inv_asig_item     ON public.inventario_asignaciones (item_id);
CREATE INDEX IF NOT EXISTS idx_inv_asig_empleado ON public.inventario_asignaciones (empleado_id);

DROP TRIGGER IF EXISTS trg_inv_asig_updated_at ON public.inventario_asignaciones;
CREATE TRIGGER trg_inv_asig_updated_at
    BEFORE UPDATE ON public.inventario_asignaciones
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMIT;

NOTIFY pgrst, 'reload schema';


-- ============================================================
-- 049_create_objetivos.sql
-- ============================================================

-- 049_create_objetivos.sql
-- Tablero de objetivos/tareas del equipo de RRHH. Una sola tabla, sin jerarquía.
-- responsable_id → public.users (operadores RRHH), NO empleados.
-- empresa_id NOT NULL: todos los objetivos están ligados a una empresa concreta.
-- estado: CHECK en la tabla; el movimiento kanban es por_hacer → haciendo → terminado.

BEGIN;

CREATE TABLE IF NOT EXISTS public.objetivos (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id      UUID        NOT NULL REFERENCES public.empresas(id),
    responsable_id  UUID        NOT NULL REFERENCES public.users(id),
    titulo          TEXT        NOT NULL,
    descripcion     TEXT,
    prioridad       TEXT        NOT NULL DEFAULT 'media'
                                CHECK (prioridad IN ('baja', 'media', 'alta')),
    estado          TEXT        NOT NULL DEFAULT 'por_hacer'
                                CHECK (estado IN ('por_hacer', 'haciendo', 'terminado')),
    fecha_entrega   DATE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_obj_empresa     ON public.objetivos (empresa_id);
CREATE INDEX IF NOT EXISTS idx_obj_responsable ON public.objetivos (responsable_id);
CREATE INDEX IF NOT EXISTS idx_obj_estado      ON public.objetivos (estado);

DROP TRIGGER IF EXISTS trg_obj_updated_at ON public.objetivos;
CREATE TRIGGER trg_obj_updated_at
    BEFORE UPDATE ON public.objetivos
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_auditoria_obj ON public.objetivos;
CREATE TRIGGER trg_auditoria_obj
    AFTER INSERT OR UPDATE OR DELETE ON public.objetivos
    FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria();

COMMIT;

NOTIFY pgrst, 'reload schema';


-- ============================================================
-- 050_create_proyectos.sql
-- ============================================================

-- 050_create_proyectos.sql
-- Tabla raíz del módulo de proyectos.
-- empresa_id = empresa DUEÑA del proyecto (la que lo patrocina/lidera).
-- Las empresas colaboradoras se derivan de proyecto_asignaciones.empleado_empresa_id.
-- presupuesto: monto total estimado. El costo real se calcula en el service
-- sumando horas_proyecto.horas × horas_proyecto.valor_hora_snapshot.

BEGIN;

CREATE TABLE IF NOT EXISTS public.proyectos (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id      UUID          NOT NULL REFERENCES public.empresas(id),
    nombre          TEXT          NOT NULL,
    descripcion     TEXT,
    estado          TEXT          NOT NULL DEFAULT 'activo'
                                  CHECK (estado IN ('activo', 'pausado', 'cerrado', 'cancelado')),
    fecha_inicio    DATE,
    fecha_fin       DATE,
    presupuesto     NUMERIC(16,2) NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proyectos_empresa ON public.proyectos (empresa_id);
CREATE INDEX IF NOT EXISTS idx_proyectos_estado  ON public.proyectos (estado);

DROP TRIGGER IF EXISTS trg_proyectos_updated_at ON public.proyectos;
CREATE TRIGGER trg_proyectos_updated_at
    BEFORE UPDATE ON public.proyectos
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_auditoria_proyectos ON public.proyectos;
CREATE TRIGGER trg_auditoria_proyectos
    AFTER INSERT OR UPDATE OR DELETE ON public.proyectos
    FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria();

COMMIT;

NOTIFY pgrst, 'reload schema';


-- ============================================================
-- 051_create_proyecto_asignaciones.sql
-- ============================================================

-- 051_create_proyecto_asignaciones.sql
-- Asignación de un empleado a un proyecto.
-- empleado_id: FK SIMPLE a empleados(id) — PK global, no compuesta.
--   El empleado puede pertenecer a una empresa DISTINTA a la dueña del proyecto.
-- empleado_empresa_id: empresa del empleado, poblada por el service al hacer lookup
--   de empleados.empresa_id. No se hereda del proyecto.
-- valor_hora: tarifa acordada para ESTE empleado en ESTE proyecto.
--   Al cargar horas se congela en horas_proyecto.valor_hora_snapshot.
-- UNIQUE(proyecto_id, empleado_id): un empleado no puede asignarse dos veces al mismo proyecto.

BEGIN;

CREATE TABLE IF NOT EXISTS public.proyecto_asignaciones (
    id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    proyecto_id         UUID          NOT NULL REFERENCES public.proyectos(id),
    empleado_id         UUID          NOT NULL REFERENCES public.empleados(id),
    empleado_empresa_id UUID          NOT NULL REFERENCES public.empresas(id),
    rol                 TEXT          NOT NULL,
    valor_hora          NUMERIC(16,2) NOT NULL DEFAULT 0,
    fecha_desde         DATE,
    fecha_hasta         DATE,
    activo              BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_proyecto_empleado UNIQUE (proyecto_id, empleado_id)
);

CREATE INDEX IF NOT EXISTS idx_pa_proyecto    ON public.proyecto_asignaciones (proyecto_id);
CREATE INDEX IF NOT EXISTS idx_pa_empleado    ON public.proyecto_asignaciones (empleado_id);
CREATE INDEX IF NOT EXISTS idx_pa_emp_empresa ON public.proyecto_asignaciones (empleado_empresa_id);

DROP TRIGGER IF EXISTS trg_pa_updated_at ON public.proyecto_asignaciones;
CREATE TRIGGER trg_pa_updated_at
    BEFORE UPDATE ON public.proyecto_asignaciones
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_auditoria_pa ON public.proyecto_asignaciones;
CREATE TRIGGER trg_auditoria_pa
    AFTER INSERT OR UPDATE OR DELETE ON public.proyecto_asignaciones
    FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria();

COMMIT;

NOTIFY pgrst, 'reload schema';


-- ============================================================
-- 052_create_horas_proyecto.sql
-- ============================================================

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


-- ============================================================
-- 053_legajo_unico_por_empresa.sql
-- ============================================================

-- C-6: el legajo deja de ser único global y pasa a ser único por empresa.
-- En un sistema multiempresa, dos empresas distintas pueden tener un
-- empleado con el mismo número de legajo sin que sea un conflicto.
-- El constraint global inline (auto-nombrado por PostgreSQL) se busca y
-- dropea por lookup para no depender del nombre exacto.

DO $$
DECLARE
    v_attnum  smallint;
    v_conname text;
BEGIN
    SELECT attnum INTO v_attnum
    FROM pg_attribute
    WHERE attrelid = 'public.empleados'::regclass AND attname = 'legajo';

    SELECT conname INTO v_conname
    FROM pg_constraint
    WHERE conrelid = 'public.empleados'::regclass
      AND contype = 'u'
      AND conkey  = ARRAY[v_attnum];

    IF v_conname IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.empleados DROP CONSTRAINT %I', v_conname);
    END IF;
END $$;

ALTER TABLE public.empleados
    ADD CONSTRAINT empleados_legajo_empresa_key UNIQUE (legajo, empresa_id);
