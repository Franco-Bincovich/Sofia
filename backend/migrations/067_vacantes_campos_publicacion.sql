-- 067_vacantes_campos_publicacion.sql
--
-- POR QUÉ:
-- La vacante se amplía para ser una "publicación" completa (post de búsqueda laboral) y,
-- a la vez, servir de insumo estructurado para un futuro screening de CVs con IA. Enfoque:
-- requisitos/descripcion quedan en TEXTO LIBRE (la IA los interpreta en el matching); los
-- datos duros van como campos estructurados (útiles para filtrar candidatos en el matching).
--
-- columnas NUEVAS (todas nullable — dato opcional de la publicación; las vacantes existentes
-- y muchas futuras no las tienen):
--   - copy_publicacion: TEXTO libre. El texto del post para redes, DISTINTO de `descripcion`
--     (que es la descripción interna del puesto). Permite controlar el copy exacto que se
--     publica, en vez de derivarlo de descripcion+requisitos.
--   - hashtags: TEXTO libre (ej. "#BusquedaLaboral #MarDelPlata"). Se guarda como texto plano,
--     no como array: los formatos varían y se pegan tal cual en el post.
--   - ubicacion: TEXTO libre (ej. "Mar del Plata"). Dato duro para el matching (filtro).
--   - jornada: TEXTO libre (ej. "Part time 6hs", "Full time"). Texto libre a propósito: los
--     formatos de jornada varían y un enum cerrado no sirve (mismo criterio que 065).
--
-- NO se agregan (YA EXISTEN, no duplicar):
--   - modalidad -> `vacantes.modalidad` VARCHAR(20) + CHECK ('presencial','remoto','hibrido'),
--     creada en 005. Es el mismo enum que `empleados.modalidad_trabajo`. Se REUSA tal cual
--     (se expone en los schemas Pydantic); no se crea columna nueva ni se toca el CHECK.
--   - email_contacto -> `vacantes.email_contacto` TEXT, creada en 034 (flujo LinkedIn). Se
--     reusa como email donde reciben CVs; solo se expone en Create/Update (ya estaba en Response).
--
-- NO se tocan columnas existentes ni requisitos/descripcion. Solo ADD COLUMN nullable.
-- Idempotente: ADD COLUMN IF NOT EXISTS.
-- NO ejecutar acá: la corre Franco contra Supabase y verifica.

BEGIN;

ALTER TABLE public.vacantes
    ADD COLUMN IF NOT EXISTS copy_publicacion  TEXT,
    ADD COLUMN IF NOT EXISTS hashtags          TEXT,
    ADD COLUMN IF NOT EXISTS ubicacion         TEXT,
    ADD COLUMN IF NOT EXISTS jornada           TEXT;

COMMIT;

NOTIFY pgrst, 'reload schema';
