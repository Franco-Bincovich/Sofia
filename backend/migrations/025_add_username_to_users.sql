-- Agrega la columna username a public.users para soportar login por nombre de usuario.
-- Se pobla con la parte local del email como valor inicial.
-- Índice funcional sobre LOWER(username) para búsquedas case-insensitive eficientes.

ALTER TABLE public.users
    ADD COLUMN username VARCHAR(50);

-- Valor inicial: parte local del email en minúsculas.
-- Reemplazar con usernames reales antes de poner en producción.
UPDATE public.users
    SET username = LOWER(SPLIT_PART(email, '@', 1));

-- Forzar NOT NULL y unicidad una vez que todos los registros tienen valor.
ALTER TABLE public.users
    ALTER COLUMN username SET NOT NULL;

ALTER TABLE public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);

-- Índice funcional para ilike case-insensitive sin full-scan.
CREATE UNIQUE INDEX idx_users_username_lower
    ON public.users (LOWER(username));
