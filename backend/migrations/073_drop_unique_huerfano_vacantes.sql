-- migrations/073_drop_unique_huerfano_vacantes.sql
-- Dropea vacantes_id_empresa_uq: UNIQUE (id, empresa_id) que era DRIFT
-- (creado a mano en producción, nunca versionado — no aparece en ninguna migración).
--
-- ORIGEN: existía para soportar la FK compuesta candidatos_vacante_emp_fkey, que
-- también era drift y que la 072 dropeó (cascadeaba el borrado de candidatos). Al
-- irse esa FK, este UNIQUE quedó huérfano: nada lo consume.
--
-- VERIFICADO EN PROD antes de dropear: la única FK que referencia vacantes es
-- candidatos_vacante_id_fkey (columna simple, vacante_id → vacantes(id) SET NULL,
-- migración 071). Ninguna FK depende del UNIQUE compuesto.
--
-- SIN CASCADE a propósito: si algún dependiente no detectado existiera, PostgreSQL
-- aborta el DROP con error ruidoso ("cannot drop ... because other objects depend
-- on it") en vez de llevarse objetos por delante en silencio. La base es el
-- verificador final.
--
-- IDEMPOTENTE: IF EXISTS → no-op en una base reconstruida desde las migraciones
-- (que nunca crea este UNIQUE), fix real sobre prod (que lo tiene por drift).
-- Mismo patrón que la 072.

BEGIN;

ALTER TABLE public.vacantes
    DROP CONSTRAINT IF EXISTS vacantes_id_empresa_uq;

COMMIT;

NOTIFY pgrst, 'reload schema';
