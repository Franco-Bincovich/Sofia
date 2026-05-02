-- Notificaciones in-app para usuarios del sistema.
-- Se crean por triggers o por la capa de servicios del backend ante eventos relevantes.
-- referencia_tipo + referencia_id apuntan al registro que originó la notificación.

CREATE TABLE public.notificaciones (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    tipo            VARCHAR(30) NOT NULL CHECK (tipo IN (
        'onboarding_tarea', 'offboarding_inicio', 'assessment_enviado',
        'assessment_completado', 'vacante_nueva', 'candidato_nuevo',
        'documento_vencimiento', 'plan_carrera_hito', 'sucesion_alerta',
        'sistema', 'otro'
    )),
    titulo          VARCHAR(200) NOT NULL,
    mensaje         TEXT        NOT NULL,
    referencia_tipo VARCHAR(50),
    referencia_id   UUID,
    leida           BOOLEAN     NOT NULL DEFAULT FALSE,
    leida_en        TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_notificaciones_user    ON public.notificaciones(user_id);
CREATE INDEX idx_notificaciones_leida   ON public.notificaciones(user_id, leida);
CREATE INDEX idx_notificaciones_created ON public.notificaciones(created_at DESC);

-- RLS Policies — cada usuario accede únicamente a sus propias notificaciones
CREATE POLICY "notificaciones_select_own"
    ON public.notificaciones FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "notificaciones_update_own"
    ON public.notificaciones FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Inserción permitida desde el sistema (service role o backend con service key)
CREATE POLICY "notificaciones_insert_sistema"
    ON public.notificaciones FOR INSERT
    WITH CHECK (TRUE);

CREATE POLICY "notificaciones_admin"
    ON public.notificaciones FOR ALL
    USING (public.get_current_user_rol() = 'admin_rrhh');
