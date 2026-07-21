-- 079_create_evaluacion_equivalencias.sql
--
-- POR QUÉ:
-- Los CSV de evaluaciones no traen DNI ni legajo, solo apellido+nombre, y `empleados` no
-- tiene unicidad por nombre. El matcheo (fase 3) resuelve identidad→empleado por señales
-- (nombre normalizado + superior + gerencia), pero cuando queda ambiguo lo confirma una
-- persona. Esta tabla RECUERDA esa confirmación ("este texto del CSV = este empleado") para
-- que el próximo ciclo no la vuelva a preguntar: el resolutor la consulta ANTES que cualquier
-- señal, y si hay equivalencia es 'resuelto' directo.
--
-- MODELO:
--   * empresa_id: la equivalencia es POR EMPRESA — el matcheo siempre busca dentro de la
--     empresa del lote (las tablas hijas de evaluación no llevan empresa_id, así que esta es
--     la única barandilla; nunca se matchea global). FK a empresas.
--   * apellido_csv / nombre_csv: el texto del archivo YA NORMALIZADO (trim, colapsa espacios,
--     sin acentos, casefold — mismo normalizador del parser). Se guarda normalizado para que
--     el lookup sea una igualdad exacta, sin re-normalizar en la query.
--   * empleado_id: a quién apunta. FK a empleados, ON DELETE CASCADE (si se borra el empleado,
--     la equivalencia deja de tener sentido). NOT NULL: una equivalencia siempre resuelve.
--   * confirmado_por: quién la confirmó (auditoría de la decisión humana). FK a users, SET NULL.
--   * UNIQUE(empresa_id, apellido_csv, nombre_csv): un texto de CSV mapea a un solo empleado
--     dentro de la empresa; reconfirmar pisa (upsert en fase 4).
--
-- Sin updated_at ni trigger: la equivalencia es un hecho puntual (se crea al confirmar; si
-- cambia, se reemplaza). RLS habilitada sin policies (deny-all; acceso app-level con service_key),
-- mismo criterio que 078/066/061. Orden: CREATE TABLE -> PK -> UNIQUE -> FK. Tabla nueva, sin
-- drift; las constraints se agregan una vez. NO se ejecuta acá (la corre Franco).

BEGIN;

-- ── TABLA ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.evaluacion_equivalencias (
    id             UUID        DEFAULT gen_random_uuid(),
    empresa_id     UUID        NOT NULL,
    apellido_csv   TEXT        NOT NULL,
    nombre_csv     TEXT        NOT NULL,
    empleado_id    UUID        NOT NULL,
    confirmado_por UUID,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── PK ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.evaluacion_equivalencias ADD CONSTRAINT evaluacion_equivalencias_pkey PRIMARY KEY (id);

-- ── UNIQUE ──────────────────────────────────────────────────────────────────

ALTER TABLE public.evaluacion_equivalencias ADD CONSTRAINT evaluacion_equivalencias_empresa_nombre_key
    UNIQUE (empresa_id, apellido_csv, nombre_csv);

-- ── FK ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.evaluacion_equivalencias ADD CONSTRAINT evaluacion_equivalencias_empresa_id_fkey
    FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
ALTER TABLE public.evaluacion_equivalencias ADD CONSTRAINT evaluacion_equivalencias_empleado_id_fkey
    FOREIGN KEY (empleado_id) REFERENCES public.empleados(id) ON DELETE CASCADE;
ALTER TABLE public.evaluacion_equivalencias ADD CONSTRAINT evaluacion_equivalencias_confirmado_por_fkey
    FOREIGN KEY (confirmado_por) REFERENCES public.users(id) ON DELETE SET NULL;

-- ── RLS (deny-all; acceso app-level vía service_key) ────────────────────────

ALTER TABLE public.evaluacion_equivalencias ENABLE ROW LEVEL SECURITY;

COMMIT;

NOTIFY pgrst, 'reload schema';
