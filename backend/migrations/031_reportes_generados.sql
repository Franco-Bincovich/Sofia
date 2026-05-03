-- Historial de reportes generados. Almacena los datos completos en JSONB
-- para permitir descarga posterior sin recalcular.

CREATE TABLE IF NOT EXISTS reportes_generados (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre       VARCHAR(200) NOT NULL,
  tipo         VARCHAR(50)  NOT NULL,
  parametros   JSONB,
  datos        JSONB        NOT NULL DEFAULT '{}',
  generado_por VARCHAR(200) NOT NULL DEFAULT 'Sistema',
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reportes_tipo       ON reportes_generados(tipo);
CREATE INDEX idx_reportes_created_at ON reportes_generados(created_at DESC);

ALTER TABLE reportes_generados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reportes_select_admin_management"
    ON reportes_generados FOR SELECT
    USING (public.get_current_user_rol() IN ('admin_rrhh', 'management'));

CREATE POLICY "reportes_write_admin_management"
    ON reportes_generados FOR INSERT
    USING (public.get_current_user_rol() IN ('admin_rrhh', 'management'));
