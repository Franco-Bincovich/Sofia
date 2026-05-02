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
