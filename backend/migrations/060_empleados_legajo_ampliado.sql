-- 060_empleados_legajo_ampliado.sql
--
-- POR QUÉ:
-- El legajo real de Karstec (el que se importa por empleado) trae varios campos que
-- empleados todavía no tiene. Esta migración amplía el legajo con esas columnas para
-- poder reflejar el legajo real e importarlo sin pérdida de datos.
--
-- DECISIÓN (producto): los campos potencialmente conflictivos (seniority, modalidad de
-- contratación, organismo, gerencia, sector, perfil, categoría, ubicación, tipo de
-- documento) van como TEXTO LIBRE, no como enums/CHECK. La importación trae valores
-- arbitrarios ("NO APLICA", "RELACION DE DEPENDENCIA", razones sociales, etc.) que no
-- encajan en ningún CHECK cerrado; texto libre los tolera. Catalogación/normalización
-- queda para una fase posterior si hace falta.
--
-- columnas NUEVAS y separadas (NO se tocan las existentes):
--   - seniority: NUEVA, texto. La columna `nivel` (enum junior..c_level) queda intacta.
--   - modalidad_contratacion: NUEVA, texto. `tipo_contrato` (enum) queda intacto.
--   - es_lider: flag booleano "Líder" Sí/No (default false). `nivel` queda intacto.
--   - horas_contrato (INTEGER, horas diarias, ej. 8) y turno (TEXTO, ej. "8 a 17 hs")
--     son dos campos distintos: uno numérico, otro descriptivo.
--   - organismo: texto informativo (razón social / UT del legajo). NO se relaciona con
--     empresa_id (la empresa de pertenencia sigue siendo empresa_id).
--
-- TODAS nullable: son datos opcionales del legajo; un empleado puede no tenerlas.
-- NO se tocan: nivel, tipo_contrato, cargo, rol, roles, ni ninguna otra columna.
--
-- NOTA (drift de DB): dni, cuil y email_personal ya existen en producción (agregados a
-- mano, fuera del historial versionado). NO se agregan acá.
--
-- NO ejecutar acá: la corre Franco contra Supabase.
-- Idempotente: ADD COLUMN IF NOT EXISTS en todas.

BEGIN;

ALTER TABLE public.empleados
    ADD COLUMN IF NOT EXISTS tipo_documento          TEXT,
    ADD COLUMN IF NOT EXISTS sexo                    TEXT,
    ADD COLUMN IF NOT EXISTS telefono_alternativo    TEXT,
    ADD COLUMN IF NOT EXISTS domicilio               TEXT,
    ADD COLUMN IF NOT EXISTS estudios                TEXT,
    ADD COLUMN IF NOT EXISTS ubicacion               TEXT,
    ADD COLUMN IF NOT EXISTS turno                   TEXT,
    ADD COLUMN IF NOT EXISTS horas_contrato          INTEGER,
    ADD COLUMN IF NOT EXISTS organismo               TEXT,
    ADD COLUMN IF NOT EXISTS gerencia                TEXT,
    ADD COLUMN IF NOT EXISTS sector                  TEXT,
    ADD COLUMN IF NOT EXISTS seniority               TEXT,
    ADD COLUMN IF NOT EXISTS perfil                  TEXT,
    ADD COLUMN IF NOT EXISTS categoria               TEXT,
    ADD COLUMN IF NOT EXISTS modalidad_contratacion  TEXT,
    ADD COLUMN IF NOT EXISTS referido                TEXT,
    ADD COLUMN IF NOT EXISTS es_lider                BOOLEAN DEFAULT FALSE;

COMMIT;

NOTIFY pgrst, 'reload schema';
