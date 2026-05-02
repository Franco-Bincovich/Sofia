-- Agrega columna rol a empleados para registrar el rol funcional o título interno.
-- Opcional: no rompe registros existentes ni requiere backfill.

ALTER TABLE public.empleados ADD COLUMN IF NOT EXISTS rol VARCHAR(100);
