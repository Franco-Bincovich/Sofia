-- 078_create_evaluacion_resultados.sql
--
-- POR QUÉ:
-- Las evaluaciones de desempeño se hacen FUERA de la plataforma; acá solo se importan
-- RESULTADOS ya calculados para sacar métricas. El modelo ev_* NO sirve para esto y no
-- se toca: su ev_instancias es UNIQUE(ciclo,empleado) —una evaluación por persona—, su
-- evaluador_id es FK a un empleado concreto (no un TIPO de evaluador), y su puntaje_global
-- es CALCULADO, no cargable. Nuestro dato es lo opuesto: N filas por evaluado (una por tipo
-- de evaluador), competencias que varían por perfil, y una nota final que viene dada.
--
-- MODELO (tres tablas):
--   * evaluacion_lotes    — el período importado (NO viene en el archivo; se elige al
--     importar). UNIQUE(empresa_id, periodo): reimportar el mismo período lo pisa (el
--     borrado del lote CASCADEa a evaluados y resultados). empresa_id vive acá, en la raíz.
--   * evaluacion_evaluados — una fila por (lote × persona evaluada). Ancla del matcheo y de
--     la nota final. empleado_id NULLABLE: los archivos traen solo apellido+nombre (sin DNI
--     ni legajo), así que puede no matchear —mismo patrón "sin asignar" que ya usamos—.
--     nota_final NULLABLE: hay evaluados sin nota. Se conservan los datos CRUDOS del CSV
--     (organismo/gerencia/sector/superior) porque no siempre mapean a entidades del sistema
--     y se necesitan para reporte y para reintentar el matcheo.
--   * evaluacion_resultados — una fila por (evaluado × tipo_evaluador × competencia). La
--     competencia va como TEXTO, no catálogo: el formato del archivo es fijo y un catálogo
--     sería trabajo sin beneficio hoy. `orden` preserva el orden de columnas del archivo.
--
-- Sin empresa_id en las dos tablas hijas: la empresa se alcanza por lote_id -> lote.empresa_id
-- (a diferencia del patrón de otras hijas que lo duplican). Es una decisión de forma del
-- modelo pedido; el aislamiento multiempresa se resuelve app-level filtrando por el lote.
--
-- Sin updated_at ni trigger: estas tablas son append-only de import (reimportar = borrar el
-- lote + CASCADE + reinsertar, nunca UPDATE de fila). No hay estado que mantener.
--
-- RLS: se HABILITA sin policies -> deny-all para anon/authenticated. El backend accede con
-- service_key (supabase_admin, bypasea RLS) y el control real es APP-LEVEL (Seccion.EVALUACIONES).
-- Mismo criterio que 061 (adjuntos) y 066 (cesiones): no se replican policies del modelo viejo.
--
-- Orden: CREATE TABLE (todas) -> PK -> UNIQUE -> CHECK -> FK al final. Espeja la estructura de
-- db/schema.sql. Tablas idempotentes (IF NOT EXISTS); las constraints se agregan una vez (tablas
-- NUEVAS, sin drift en prod). NO se ejecuta acá (la corre Franco).

BEGIN;

-- ── TABLAS ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.evaluacion_lotes (
    id            UUID        DEFAULT gen_random_uuid(),
    empresa_id    UUID        NOT NULL,
    periodo       TEXT        NOT NULL,
    importado_por UUID,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.evaluacion_evaluados (
    id                UUID        DEFAULT gen_random_uuid(),
    lote_id           UUID        NOT NULL,
    empleado_id       UUID,
    nota_final        NUMERIC,
    perfil            TEXT        NOT NULL,
    organismo         TEXT,
    gerencia          TEXT,
    sector            TEXT,
    apellido_evaluado TEXT        NOT NULL,
    nombre_evaluado   TEXT        NOT NULL,
    apellido_superior TEXT,
    nombre_superior   TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.evaluacion_resultados (
    id             UUID        DEFAULT gen_random_uuid(),
    evaluado_id    UUID        NOT NULL,
    tipo_evaluador TEXT        NOT NULL,
    competencia    TEXT        NOT NULL,
    orden          INTEGER     NOT NULL,
    nota           NUMERIC     NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── PK ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.evaluacion_lotes      ADD CONSTRAINT evaluacion_lotes_pkey      PRIMARY KEY (id);
ALTER TABLE public.evaluacion_evaluados  ADD CONSTRAINT evaluacion_evaluados_pkey  PRIMARY KEY (id);
ALTER TABLE public.evaluacion_resultados ADD CONSTRAINT evaluacion_resultados_pkey PRIMARY KEY (id);

-- ── UNIQUE ──────────────────────────────────────────────────────────────────

ALTER TABLE public.evaluacion_lotes      ADD CONSTRAINT evaluacion_lotes_empresa_periodo_key    UNIQUE (empresa_id, periodo);
ALTER TABLE public.evaluacion_evaluados  ADD CONSTRAINT evaluacion_evaluados_lote_nombre_key     UNIQUE (lote_id, apellido_evaluado, nombre_evaluado);
ALTER TABLE public.evaluacion_resultados ADD CONSTRAINT evaluacion_resultados_eval_tipo_comp_key UNIQUE (evaluado_id, tipo_evaluador, competencia);

-- ── CHECK ───────────────────────────────────────────────────────────────────

ALTER TABLE public.evaluacion_evaluados  ADD CONSTRAINT evaluacion_evaluados_perfil_check
    CHECK (perfil = ANY (ARRAY['lider'::text, 'general'::text]));
ALTER TABLE public.evaluacion_resultados ADD CONSTRAINT evaluacion_resultados_tipo_evaluador_check
    CHECK (tipo_evaluador = ANY (ARRAY['AUTOEVALUACION'::text, 'AUTOEVALUACION_LIDER'::text, 'SUPERIOR_INMEDIATO'::text, 'PAR'::text, 'COLABORADOR'::text, 'LIBRES'::text]));

-- ── FK (al final) ───────────────────────────────────────────────────────────

ALTER TABLE public.evaluacion_lotes ADD CONSTRAINT evaluacion_lotes_empresa_id_fkey
    FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
ALTER TABLE public.evaluacion_lotes ADD CONSTRAINT evaluacion_lotes_importado_por_fkey
    FOREIGN KEY (importado_por) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.evaluacion_evaluados ADD CONSTRAINT evaluacion_evaluados_lote_id_fkey
    FOREIGN KEY (lote_id) REFERENCES public.evaluacion_lotes(id) ON DELETE CASCADE;
ALTER TABLE public.evaluacion_evaluados ADD CONSTRAINT evaluacion_evaluados_empleado_id_fkey
    FOREIGN KEY (empleado_id) REFERENCES public.empleados(id) ON DELETE SET NULL;

ALTER TABLE public.evaluacion_resultados ADD CONSTRAINT evaluacion_resultados_evaluado_id_fkey
    FOREIGN KEY (evaluado_id) REFERENCES public.evaluacion_evaluados(id) ON DELETE CASCADE;

-- ── ÍNDICES ─────────────────────────────────────────────────────────────────
-- Solo el no-redundante: empleado_id (métricas "resultados de un empleado"). Las FKs
-- lote_id y evaluado_id ya quedan indexadas por la columna líder de sus UNIQUE.
CREATE INDEX IF NOT EXISTS idx_evaluacion_evaluados_empleado ON public.evaluacion_evaluados(empleado_id);

-- ── RLS (deny-all; acceso app-level vía service_key) ────────────────────────

ALTER TABLE public.evaluacion_lotes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluacion_evaluados  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluacion_resultados ENABLE ROW LEVEL SECURITY;

COMMIT;

NOTIFY pgrst, 'reload schema';
