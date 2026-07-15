-- 070_vacantes_requisitos_texto.sql
--
-- POR QUÉ:
-- `vacantes.requisitos` es JSONB (array de strings) desde 026. Ahora integra la sección
-- "Información del puesto" del detalle, donde los 5 campos (funciones, requisitos, formacion,
-- experiencia, conocimientos_tecnicos) son TEXTO LIBRE con saltos de línea — insumo para el
-- screening de CVs con IA. Un array JSONB rompe la consistencia (el frontend lo trataba como
-- string[] con .map). Se pasa a TEXT plano. Cambio ACOPLADO: esta migración va junto con la
-- adaptación de repo/schemas/zernio (backend) y types/modal/detalle (frontend) en la misma
-- entrega, para no dejar la app rota.
--
-- CONVERSIÓN (preserva datos existentes):
--   - array JSONB  -> las líneas del array unidas con '\n' (array_to_string). Array vacío -> NULL.
--   - null         -> null.
--   - escalar raro -> su texto plano (#>> '{}') por robustez.
--   Primero se quita el DEFAULT '[]'::jsonb (incompatible con TEXT).
--
-- Idempotente-friendly: si ya es TEXT (re-ejecución), el USING con jsonb_typeof fallaría;
-- por eso se corre UNA vez contra el estado JSONB vivo. NO ejecutar acá: la corre Franco.

BEGIN;

ALTER TABLE public.vacantes ALTER COLUMN requisitos DROP DEFAULT;

ALTER TABLE public.vacantes
    ALTER COLUMN requisitos TYPE TEXT USING (
        CASE
            WHEN requisitos IS NULL THEN NULL
            WHEN jsonb_typeof(requisitos) = 'array' THEN NULLIF(
                array_to_string(ARRAY(SELECT jsonb_array_elements_text(requisitos)), E'\n'),
                ''
            )
            ELSE requisitos #>> '{}'
        END
    );

COMMIT;

NOTIFY pgrst, 'reload schema';
