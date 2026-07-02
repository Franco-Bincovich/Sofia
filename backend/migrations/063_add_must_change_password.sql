-- 063_add_must_change_password.sql
--
-- POR QUÉ:
-- Los usuarios del sistema se crean con una contraseña temporal (ver alta de
-- usuarios, rol mandos_medios). Esta bandera marca que el usuario debe cambiar
-- esa contraseña en el primer login. La baja el endpoint de cambio de contraseña
-- (self-service) una vez que el usuario define su clave definitiva.
--
-- NOT NULL DEFAULT FALSE: los usuarios existentes no arrastran obligación de
-- cambio; solo los creados con contraseña temporal la setean en TRUE al alta.
--
-- YA APLICADA en producción — se versiona acá para no driftear. NO ejecutar.
-- Idempotente: ADD COLUMN IF NOT EXISTS.

BEGIN;

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

COMMIT;

NOTIFY pgrst, 'reload schema';
