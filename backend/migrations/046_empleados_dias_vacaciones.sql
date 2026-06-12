-- Agrega asignación anual de días de vacaciones pagas por empleado.
-- Solo las solicitudes tipo='vacaciones' descuentan de este saldo.
-- Default 14 días para todos los empleados existentes.

ALTER TABLE empleados
  ADD COLUMN dias_vacaciones_asignados integer NOT NULL DEFAULT 14;

COMMENT ON COLUMN empleados.dias_vacaciones_asignados
  IS 'Asignación anual de días de vacaciones pagas. Solo las solicitudes tipo vacaciones descuentan de este saldo.';

NOTIFY pgrst, 'reload schema';
