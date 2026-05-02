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
