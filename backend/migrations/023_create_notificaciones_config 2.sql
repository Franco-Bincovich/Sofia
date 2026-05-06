-- Preferencias de notificación por usuario y tipo de evento.
-- UNIQUE en (user_id, tipo_evento): una fila de configuración por evento por usuario.
-- canal 'ninguno' desactiva completamente ese tipo de notificación para el usuario.

CREATE TABLE public.notificaciones_config (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    tipo_evento VARCHAR(30) NOT NULL CHECK (tipo_evento IN (
        'onboarding_tarea', 'offboarding_inicio', 'assessment_enviado',
        'assessment_completado', 'vacante_nueva', 'candidato_nuevo',
        'documento_vencimiento', 'plan_carrera_hito', 'sucesion_alerta',
        'sistema', 'otro'
    )),
    canal       VARCHAR(10) NOT NULL CHECK (canal IN ('email', 'in_app', 'ambos', 'ninguno')),
    activo      BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, tipo_evento)
);

ALTER TABLE public.notificaciones_config ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_notificaciones_config_updated_at
    BEFORE UPDATE ON public.notificaciones_config
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_notif_config_user ON public.notificaciones_config(user_id);

-- RLS Policies — cada usuario gestiona su propia configuración
CREATE POLICY "notif_config_select_own"
    ON public.notificaciones_config FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "notif_config_write_own"
    ON public.notificaciones_config FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "notif_config_admin"
    ON public.notificaciones_config FOR ALL
    USING (public.get_current_user_rol() = 'admin_rrhh');
