-- 068_adjuntos_es_principal.sql
--
-- POR QUÉ:
-- Las imágenes de una vacante (placas de búsqueda laboral) se guardan como adjuntos
-- polimórficos (entidad='vacante'). Una de ellas es la PRINCIPAL — la placa que irá a
-- LinkedIn. La tabla `adjuntos` (061) no tenía forma de destacar un adjunto por sobre los
-- demás; se agrega un flag para marcarlo.
--
-- columna NUEVA:
--   - es_principal: BOOLEAN DEFAULT FALSE (nullable). TRUE = adjunto destacado de su entidad.
--     Genérico a nivel tabla, pero hoy solo lo usan las imágenes de vacante.
--
-- REGLA "una sola principal por entidad": se resuelve a nivel APLICACIÓN (endpoint
-- PUT /api/adjuntos/{id}/principal desmarca los hermanos de la misma entidad+entidad_id
-- antes de marcar el elegido). NO se agrega índice único parcial acá para respetar el
-- alcance (solo ADD COLUMN); el enforcement app-level es suficiente para el flujo actual.
--
-- Idempotente: ADD COLUMN IF NOT EXISTS. Solo ADD COLUMN, no se toca nada existente.
-- NO ejecutar acá: la corre Franco contra Supabase y verifica.

BEGIN;

ALTER TABLE public.adjuntos
    ADD COLUMN IF NOT EXISTS es_principal BOOLEAN DEFAULT FALSE;

COMMIT;

NOTIFY pgrst, 'reload schema';
