-- 064_empleados_campos_nomina.sql
--
-- POR QUÉ:
-- La importación de la nómina real trae 27 columnas; el legajo ampliado (059/060) ya
-- cubre la mayoría (sexo, gerencia, sector, seniority, categoria, modalidad_contratacion,
-- ubicacion, turno, horas_contrato, es_lider, organismo, etc.). Faltan estos campos del
-- legajo, que no tenían destino. Se agregan como columnas informativas del empleado para
-- importar la nómina completa sin perder datos (los próximos ingresos también los traerán).
--
-- columnas NUEVAS (todas nullable — dato opcional del legajo; los empleados existentes y
-- muchos futuros no las tienen):
--   - fecha_ingreso_reconocida: DATE. Antigüedad reconocida (distinta de fecha_ingreso real).
--   - equipo: TEXTO informativo. NO es jerarquía nueva — la jerarquía del sistema sigue
--     siendo empresa -> area. Convive con `gerencia`/`sector` (mismo criterio, texto libre).
--   - co_sourcing: BOOLEAN. El CSV trae SI/NO estricto; el parser convierte "SI"/"NO" ->
--     true/false. Nullable sin default: NULL = no informado (distinto de false).
--   - product_owner: BOOLEAN. Mismo criterio que co_sourcing (SI/NO -> true/false).
--   - liderazgo: TEXTO. El CSV trae variantes más allá de SI/NO, así que se guarda el valor
--     textual tal cual. CONVIVE con la columna booleana existente `es_lider` (060, cableada
--     al checkbox de la UI): esta guarda el texto crudo del CSV; el parser decide cómo poblar
--     `es_lider` a partir de él. No se toca `es_lider`.
--   - motivo_baja: TEXTO libre. Para cargar el motivo de las bajas históricas del CSV a nivel
--     legajo. NO reemplaza offboarding_instancias.motivo_egreso (flujo de egreso); la Fecha
--     de Baja del CSV va a la columna existente `fecha_egreso` (003), no se agrega acá.
--
-- NO se agregan (ya existen): cuit -> `cuil` (drift), fecha_nacimiento (003), gerencia (060),
-- categoria (060), ubicacion fisica -> `ubicacion` (060), carga horaria -> `turno` (TEXTO
-- libre, 060), fecha baja -> `fecha_egreso` (003), manager_id (003), es_lider (060).
--
-- NO se tocan columnas existentes. Solo ADD COLUMN. Idempotente: ADD COLUMN IF NOT EXISTS.
-- NO ejecutar acá: la corre Franco contra Supabase y verifica.

BEGIN;

ALTER TABLE public.empleados
    ADD COLUMN IF NOT EXISTS fecha_ingreso_reconocida  DATE,
    ADD COLUMN IF NOT EXISTS equipo                    TEXT,
    ADD COLUMN IF NOT EXISTS co_sourcing               BOOLEAN,
    ADD COLUMN IF NOT EXISTS product_owner             BOOLEAN,
    ADD COLUMN IF NOT EXISTS liderazgo                 TEXT,
    ADD COLUMN IF NOT EXISTS motivo_baja               TEXT;

COMMIT;

NOTIFY pgrst, 'reload schema';
