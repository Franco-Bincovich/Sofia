-- 065_tipo_contrato_texto_libre.sql
--
-- POR QUÉ:
-- La importación de la nómina real trae el tipo de contrato en la columna "Modalidad
-- Contratacion" con valores libres (ej. "RELACION DE DEPENDENCIA", 23 chars). El campo
-- `empleados.tipo_contrato` era VARCHAR(20) con CHECK cerrado a 4 literales
-- ('efectivo','plazo_fijo','contratado','pasantia'). Eso rompe el import por dos motivos:
--   1) el valor no está en la lista del CHECK → viola la constraint;
--   2) "RELACION DE DEPENDENCIA" (23) excede VARCHAR(20).
-- Decisión de producto: `tipo_contrato` pasa a TEXTO LIBRE (pueden llegar valores futuros
-- desconocidos; un enum cerrado no sirve). Se guarda el valor tal cual, sin traducir.
--
-- QUÉ HACE:
--   - Quita el CHECK constraint de tipo_contrato (nombre auto-generado por Postgres para
--     un CHECK de columna inline: <tabla>_<columna>_check).
--   - Cambia el tipo de VARCHAR(20) a TEXT. El cambio de tipo PRESERVA los valores
--     existentes ('efectivo', 'plazo_fijo', etc. quedan intactos como texto).
--
-- NO se toca `modalidad_trabajo`: sigue siendo VARCHAR(20) + CHECK
-- ('presencial','remoto','hibrido'). El import completa 'presencial' por default cuando
-- el CSV no trae el dato (lógica de aplicación, no de schema).
--
-- Idempotente: DROP CONSTRAINT IF EXISTS + ALTER TYPE (reejecutable sin error).
-- NOTA: `000_run_all.sql` recrea empleados con el CHECK viejo (línea del CREATE TABLE);
-- si se re-bootstrapea desde cero hay que replicar este cambio allí. Misma clase de deuda
-- que 057/058/064.
-- NO ejecutar acá: la corre Franco contra Supabase y verifica.

BEGIN;

ALTER TABLE public.empleados
    DROP CONSTRAINT IF EXISTS empleados_tipo_contrato_check;

ALTER TABLE public.empleados
    ALTER COLUMN tipo_contrato TYPE TEXT;

COMMIT;

NOTIFY pgrst, 'reload schema';
