-- 059_empleados_roles.sql
--
-- POR QUÉ:
-- empleados arrastraba DOS columnas para lo mismo: cargo (003, el título/puesto que toda
-- la app realmente usa) y rol (029, "rol funcional o título interno", que se escribía pero
-- casi no se leía). Producto decidió unificarlas en UN único campo multi-valor "roles":
-- un empleado puede tener varios roles, el primero es el principal. Es texto libre con
-- autocompletado que crece con el uso (pool compartido entre empresas).
--
-- DECISIÓN: columna roles TEXT[] en empleados. Principal = roles[1] (SQL, 1-indexed) /
-- roles[0] (app). El array preserva el orden de carga, así que no hace falta columna de
-- orden ni tabla 1:N (los roles no tienen atributos por elemento). El patrón de repos del
-- proyecto (select * → dict, update por patch) sobrevive sin reestructurarse.
--
-- MIGRACIÓN ADITIVA (S1): se agrega y puebla roles; cargo y rol quedan DEPRECADAS pero
-- presentes para no romper lo que aún las lee (organigrama, sucesión, onboarding, audit,
-- import). El drop de cargo/rol es S6, al final, tras adaptar todo el código y probar.
--
-- BACKFILL: roles = [cargo, rol] descartando el rol si es igual al cargo (NULLIF) y los
-- nulos (array_remove). Verificado que 0 empleados tienen cargo IS NULL AND rol IS NULL,
-- por lo que ninguno queda con array vacío y no hace falta placeholder.
--
-- CHECK a nivel datos (no solo schema): el backend escribe con la service_key
-- (supabase_admin), que BYPASSA RLS — el CHECK es la única garantía real de "al menos un
-- rol por empleado".
--
-- NO ejecutar acá: la corre Franco contra Supabase.
-- Idempotente: ADD COLUMN IF NOT EXISTS; el backfill sólo toca filas con roles IS NULL;
-- SET NOT NULL y el ADD CONSTRAINT se protegen para poder re-correrse sin fallar.

BEGIN;

-- 1. Columna nueva (aditiva, nullable durante el backfill).
ALTER TABLE public.empleados
    ADD COLUMN IF NOT EXISTS roles TEXT[];

-- 2. Backfill: lista inicial = [cargo] + [rol] (si rol no es null y != cargo).
--    Sólo filas aún sin poblar, para que la migración sea re-ejecutable.
UPDATE public.empleados
SET roles = array_remove(ARRAY[cargo, NULLIF(rol, cargo)], NULL)
WHERE roles IS NULL;

-- 3. Garantías post-backfill: NOT NULL + al menos un rol (CHECK a nivel datos).
ALTER TABLE public.empleados
    ALTER COLUMN roles SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'empleados_roles_no_vacio'
    ) THEN
        ALTER TABLE public.empleados
            ADD CONSTRAINT empleados_roles_no_vacio
            CHECK (array_length(roles, 1) >= 1);
    END IF;
END $$;

-- 4. cargo y rol NO se dropean: quedan deprecadas hasta S6.

COMMIT;

NOTIFY pgrst, 'reload schema';
