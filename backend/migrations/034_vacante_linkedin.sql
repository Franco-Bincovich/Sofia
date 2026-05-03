-- 034_vacante_linkedin.sql
-- Agrega campos de publicación LinkedIn y email de contacto a vacantes
ALTER TABLE vacantes ADD COLUMN IF NOT EXISTS linkedin_post_id TEXT;
ALTER TABLE vacantes ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE vacantes ADD COLUMN IF NOT EXISTS email_contacto TEXT;
