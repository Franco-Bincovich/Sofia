-- Agrega columna tipo a solicitudes_vacaciones para distinguir la categoría de evento.
-- Default 'vacaciones' → el registro existente queda válido sin cambios de datos.
-- Solo 'vacaciones' descuenta del saldo anual; los demás tipos son adicionales.

ALTER TABLE solicitudes_vacaciones
  ADD COLUMN tipo varchar NOT NULL DEFAULT 'vacaciones'
    CHECK (tipo IN ('vacaciones', 'semana_free', 'dia_free', 'permiso_especial'));

CREATE INDEX IF NOT EXISTS idx_solicitudes_vacaciones_empresa_tipo
  ON solicitudes_vacaciones (empresa_id, tipo);

NOTIFY pgrst, 'reload schema';
