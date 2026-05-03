CREATE TABLE usuario_integraciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL, -- 'google', 'anthropic'
  access_token TEXT,
  refresh_token TEXT,
  token_expiry TIMESTAMPTZ,
  email_cuenta TEXT, -- para mostrar qué cuenta está conectada
  api_key TEXT, -- para Anthropic
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tipo)
);
ALTER TABLE usuario_integraciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_integrations" ON usuario_integraciones
  FOR ALL USING (user_id = (SELECT id FROM public.users WHERE id::text = current_setting('request.jwt.claims', true)::json->>'sub'));
