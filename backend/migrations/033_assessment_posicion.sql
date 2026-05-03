-- Agrega área y posición objetivo a campañas de assessment
ALTER TABLE assessment_campanas
  ADD COLUMN IF NOT EXISTS area_id UUID REFERENCES areas(id),
  ADD COLUMN IF NOT EXISTS posicion_objetivo VARCHAR(200);

-- Vincula links de evaluación a empleados del sistema para actualizar 9-Box automáticamente
ALTER TABLE assessment_links
  ADD COLUMN IF NOT EXISTS empleado_id UUID REFERENCES empleados(id);
