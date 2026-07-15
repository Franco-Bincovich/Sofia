-- migrations/072_drop_fk_compuesta_candidatos_vacante.sql
-- PROBLEMA: candidatos tenía DOS FK sobre vacante_id:
--   1. candidatos_vacante_id_fkey     → vacantes(id)              ON DELETE SET NULL  (correcta, de la 071)
--   2. candidatos_vacante_emp_fkey    → vacantes(id, empresa_id)  ON DELETE CASCADE   (drift, sin versionar)
-- La FK compuesta (2) fue creada a mano en producción (nunca versionada) siguiendo
-- el patrón multiempresa del repo (UNIQUE(id,empresa_id) + FK compuesta). Su ON DELETE
-- CASCADE hacía que borrar una vacante borrara sus candidatos en cascada, anulando el
-- SET NULL de la 071 — los CVs no sobrevivían.
--
-- No se puede convertir a SET NULL: candidatos.empresa_id es NOT NULL, y un SET NULL
-- sobre una FK compuesta nularía TODAS sus columnas (vacante_id Y empresa_id),
-- violando el NOT NULL de empresa_id.
--
-- SOLUCIÓN: dropear la FK compuesta. La integridad vacante↔candidato queda cubierta por
-- candidatos_vacante_id_fkey (SET NULL). La pertenencia del candidato a su empresa queda
-- cubierta por candidatos_empresa_fkey (empresa_id → empresas ON DELETE RESTRICT).
-- La coincidencia empresa_candidato = empresa_vacante mientras la vacante vive pasa a
-- garantizarla la app (save_candidato hereda empresa_id de la vacante). Trade-off
-- necesario para que los candidatos sobrevivan al borrado de su vacante.

BEGIN;

ALTER TABLE public.candidatos
    DROP CONSTRAINT IF EXISTS candidatos_vacante_emp_fkey;

COMMIT;

NOTIFY pgrst, 'reload schema';
