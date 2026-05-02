-- Extiende auth.users de Supabase con el perfil del usuario y el rol en el sistema.
-- Es la tabla central de identidad: todo acceso a la plataforma parte de aquí.
-- También define la función helper get_current_user_rol() usada por las policies de todas las tablas.

CREATE TABLE public.users (
    id            UUID         PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email         VARCHAR(255) NOT NULL UNIQUE,
    nombre        VARCHAR(100) NOT NULL,
    apellido      VARCHAR(100) NOT NULL,
    rol           VARCHAR(20)  NOT NULL CHECK (rol IN ('admin_rrhh', 'management', 'empleado')),
    avatar_url    TEXT,
    activo        BOOLEAN      NOT NULL DEFAULT TRUE,
    ultimo_acceso TIMESTAMPTZ,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Función SECURITY DEFINER: evita referencias circulares en policies de otras tablas.
-- Bypasses RLS al consultar users para que la policy no se llame recursivamente.
CREATE OR REPLACE FUNCTION public.get_current_user_rol()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT rol FROM public.users WHERE id = auth.uid()
$$;

-- Función genérica para mantener updated_at; usada por triggers de múltiples tablas.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS Policies
CREATE POLICY "users_select_own"
    ON public.users FOR SELECT
    USING (id = auth.uid());

CREATE POLICY "users_select_admin_management"
    ON public.users FOR SELECT
    USING (public.get_current_user_rol() IN ('admin_rrhh', 'management'));

CREATE POLICY "users_insert_admin"
    ON public.users FOR INSERT
    WITH CHECK (public.get_current_user_rol() = 'admin_rrhh');

CREATE POLICY "users_update_own"
    ON public.users FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

CREATE POLICY "users_update_admin"
    ON public.users FOR UPDATE
    USING (public.get_current_user_rol() = 'admin_rrhh');

CREATE POLICY "users_delete_admin"
    ON public.users FOR DELETE
    USING (public.get_current_user_rol() = 'admin_rrhh');
