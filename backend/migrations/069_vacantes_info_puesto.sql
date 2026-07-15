-- 069_vacantes_info_puesto.sql
--
-- POR QUÉ:
-- El modal de creación de vacante se simplifica (empresa, título, área, tipo_contrato) y la
-- carga rica del puesto se mueve a una sección "Información del puesto" en el DETALLE. Esa
-- sección tiene 5 campos de TEXTO LIBRE con saltos de línea, insumo para el futuro screening
-- de CVs con IA (se cruzan contra el CV; por eso texto libre, no estructura rígida):
--   funciones · requisitos · formacion · experiencia · conocimientos_tecnicos
--
-- columnas NUEVAS (todas nullable, TEXT — dato opcional del puesto):
--   - funciones               TEXT
--   - formacion               TEXT
--   - experiencia             TEXT
--   - conocimientos_tecnicos  TEXT
--
-- NO se agregan (ya existen, se REUSAN):
--   - requisitos -> ya existe como JSONB (026). Es el "requisitos" de la nueva sección; se
--     mueve conceptualmente del modal a la sección. Su conversión JSONB->TEXT (para quedar
--     consistente con estos 4 campos) NO se hace acá: es un cambio ACOPLADO al frontend
--     (repo _vrow, schemas, zernio_service, types, modal y detalle lo leen como lista) y
--     hacerlo backend-only rompería el detalle en vivo. Va junto con la pieza frontend.
--   - descripcion -> ya existe TEXT (005). No es uno de los 5 campos de la sección; se deja.
--
-- Solo ADD COLUMN nullable. NO se toca nada existente. Idempotente: ADD COLUMN IF NOT EXISTS.
-- NO ejecutar acá: la corre Franco contra Supabase y verifica.

BEGIN;

ALTER TABLE public.vacantes
    ADD COLUMN IF NOT EXISTS funciones               TEXT,
    ADD COLUMN IF NOT EXISTS formacion               TEXT,
    ADD COLUMN IF NOT EXISTS experiencia             TEXT,
    ADD COLUMN IF NOT EXISTS conocimientos_tecnicos  TEXT;

COMMIT;

NOTIFY pgrst, 'reload schema';
