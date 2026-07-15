-- 071_candidatos_sobreviven_vacante.sql
--
-- POR QUÉ:
-- Hoy `candidatos.vacante_id` tiene FK ON DELETE CASCADE (migración 006): al borrar una
-- vacante se borran TODOS sus candidatos (y sus CVs) en cascada. Eso es data loss: un CV
-- recibido es información valiosa que debe SOBREVIVIR aunque la búsqueda se cierre/borre.
-- Decisión: cuando se borra una vacante, sus candidatos NO se eliminan; quedan con
-- `vacante_id = NULL` y el nombre de la búsqueda "congelado" en `busqueda_congelada`, para
-- vivir en una futura sección Candidatos (candidatos de búsquedas cerradas).
--
-- QUÉ HACE:
--   1. FK `candidatos.vacante_id`: CASCADE → SET NULL, y la columna pasa a NULLABLE.
--      - La constraint de 006 es un FK de columna INLINE sin nombre explícito, así que
--        Postgres la auto-nombró `candidatos_vacante_id_fkey` (patrón <tabla>_<col>_fkey).
--        Se dropea con DROP CONSTRAINT IF EXISTS (seguro si el nombre difiere en prod).
--      - `vacante_id` deja de ser NOT NULL para poder quedar huérfano (búsqueda borrada).
--      - Se recrea la FK con ON DELETE SET NULL: borrar la vacante pone vacante_id=NULL
--        en sus candidatos en vez de borrarlos.
--   2. Columna `busqueda_congelada TEXT` (nullable, default NULL).
--
-- ALCANCE: solo la FK de candidatos + la columna nueva. NO se toca el CASCADE de adjuntos,
-- ni nada de vacantes, ni otras tablas. Tabla vacía (0 filas) → sin backfill.
--
-- NOTA (deuda a resolver junto con la futura sección Candidatos, FUERA de esta migración):
-- `candidato_repo._crow` hace `str(r["vacante_id"])` y `CandidatoResponse.vacante_id` es
-- `str` (no Optional) → un candidato huérfano (vacante_id NULL) rompería la serialización.
-- Hoy NO se dispara: ninguna query devuelve huérfanos (todas filtran por vacante_id concreto).
--
-- NO ejecutar acá: la corre Franco contra Supabase y verifica.

BEGIN;

-- 1. FK vacante_id: quitar CASCADE, permitir NULL, recrear como SET NULL
ALTER TABLE public.candidatos DROP CONSTRAINT IF EXISTS candidatos_vacante_id_fkey;

ALTER TABLE public.candidatos ALTER COLUMN vacante_id DROP NOT NULL;

ALTER TABLE public.candidatos
    ADD CONSTRAINT candidatos_vacante_id_fkey
    FOREIGN KEY (vacante_id) REFERENCES public.vacantes(id) ON DELETE SET NULL;

-- 2. Nombre de la búsqueda congelado al borrar la vacante (NULL mientras la vacante viva)
ALTER TABLE public.candidatos
    ADD COLUMN IF NOT EXISTS busqueda_congelada TEXT;

COMMENT ON COLUMN public.candidatos.busqueda_congelada IS
    'Guarda "titulo — area" de la vacante al momento de borrarla; NULL mientras la vacante siga viva.';

COMMIT;

NOTIFY pgrst, 'reload schema';
