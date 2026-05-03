-- Tabla de configuración global de la empresa (singleton — una sola fila).
-- El nombre se usa en el organigrama y otros módulos como identidad de la organización.

CREATE TABLE IF NOT EXISTS configuracion_empresa (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre     VARCHAR(200) NOT NULL DEFAULT 'Mi Empresa',
  logo_url   TEXT,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_configuracion_empresa_updated_at
    BEFORE UPDATE ON configuracion_empresa
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE configuracion_empresa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "empresa_select_authenticated"
    ON configuracion_empresa FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "empresa_write_admin"
    ON configuracion_empresa FOR ALL
    USING (public.get_current_user_rol() = 'admin_rrhh');

INSERT INTO configuracion_empresa (nombre) VALUES ('Karstec') ON CONFLICT DO NOTHING;
