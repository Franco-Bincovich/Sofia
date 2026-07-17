-- 076 — refresh_tokens: persistencia de los refresh tokens del auth propio.
--
-- Hoy los refresh tokens los emite y rota gotrue (auth_service.py:90,
-- supabase_client.auth.refresh_session). Al salir de Supabase esa rotación hay que hacerla
-- nosotros, y para eso hace falta guardar los tokens emitidos.
--
-- PATRÓN DE ROTACIÓN (one-time use): cada refresh consume el token viejo y emite uno nuevo.
-- token_service.refresh_access_token BORRA la fila del token usado ANTES de emitir el
-- reemplazo. Un refresh token robado sirve una sola vez: si el atacante lo usa, el legítimo
-- falla en su próximo refresh (su token ya no está en la tabla) — la anomalía es detectable.
-- Es la misma semántica que gotrue ya daba, ahora explícita y nuestra.
--
-- SE GUARDA EL HASH, NO EL TOKEN. token_hash es bcrypt del token crudo: un dump de esta
-- tabla no permite hacerse pasar por nadie. Consecuencia de diseño: bcrypt es salteado, así
-- que NO se puede buscar por hash (dos hashes del mismo token difieren). Por eso el refresh
-- token es un JWT que lleva el user_id en `sub`: se decodifica para saber de quién es, se
-- traen sus tokens con find_by_user(user_id) y se compara uno a uno con bcrypt.checkpw.
-- De ahí sale la interfaz del token_repo — no es arbitraria.
--
-- SIN RLS: en RDS la seguridad es app-level (decisión tomada para esta migración). Nota:
-- el backend ya operaba de facto sin RLS — usaba service_key, que la bypassea. La diferencia
-- es que ahora no hay una segunda línea de defensa detrás. Esta tabla no la toca ningún
-- usuario final: solo token_service.

CREATE TABLE public.refresh_tokens (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),  -- gen_random_uuid(): built-in PG13+
    user_id    UUID NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ON DELETE CASCADE: al borrar un usuario se van sus refresh tokens. Sin esto, un usuario
-- eliminado deja tokens vivos hasta su expiración natural — sesiones que sobreviven a la baja.
ALTER TABLE public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- El acceso es SIEMPRE por user_id (find_by_user en cada refresh: es el camino caliente).
CREATE INDEX idx_refresh_tokens_user_id ON public.refresh_tokens (user_id);

-- Para el barrido de expirados (ver nota de retención abajo).
CREATE INDEX idx_refresh_tokens_expires_at ON public.refresh_tokens (expires_at);

COMMENT ON TABLE public.refresh_tokens IS
    'Refresh tokens del auth propio, rotados one-time-use. Guarda hash bcrypt, nunca el token.';
COMMENT ON COLUMN public.refresh_tokens.token_hash IS
    'Hash bcrypt del refresh token crudo. Salteado: no indexable, se compara con checkpw.';

-- RETENCIÓN (pendiente, no bloquea): las filas expiradas no se borran solas. Con
-- refresh_token_expiration_days=30 y ~3 usuarios de RRHH el volumen es irrelevante, pero
-- la tabla crece monótona. Barrido cuando moleste:
--     DELETE FROM public.refresh_tokens WHERE expires_at < now();
-- token_service ya ignora los expirados al validar, así que esto es higiene, no corrección.
