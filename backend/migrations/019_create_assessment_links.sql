-- Links únicos para completar un assessment. Pueden enviarse a empleados internos o candidatos externos.
-- El token es un hex de 32 bytes generado por pgcrypto; único y no guessable.
-- La ruta pública /assessment/[token] no requiere autenticación para soportar candidatos externos.

CREATE TABLE public.assessment_links (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    campana_id     UUID         NOT NULL REFERENCES public.assessment_campanas(id) ON DELETE CASCADE,
    empleado_id    UUID         REFERENCES public.empleados(id) ON DELETE SET NULL,
    candidato_id   UUID         REFERENCES public.candidatos(id) ON DELETE SET NULL,
    token          VARCHAR(100) NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
    email_destino  VARCHAR(255) NOT NULL,
    nombre_destino VARCHAR(200),
    estado         VARCHAR(20)  NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'enviado', 'abierto', 'completado', 'expirado', 'cancelado')),
    expira_en      TIMESTAMPTZ  NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    enviado_en     TIMESTAMPTZ,
    abierto_en     TIMESTAMPTZ,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    -- Un link apunta a un empleado o a un candidato, o a ninguno (link libre), pero nunca a ambos.
    CONSTRAINT chk_link_destino_exclusivo CHECK (
        NOT (empleado_id IS NOT NULL AND candidato_id IS NOT NULL)
    )
);

ALTER TABLE public.assessment_links ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_links_campana  ON public.assessment_links(campana_id);
CREATE INDEX idx_links_token    ON public.assessment_links(token);
CREATE INDEX idx_links_estado   ON public.assessment_links(estado);
CREATE INDEX idx_links_empleado ON public.assessment_links(empleado_id);

-- RLS Policies
CREATE POLICY "links_select_admin_management"
    ON public.assessment_links FOR SELECT
    USING (public.get_current_user_rol() IN ('admin_rrhh', 'management'));

-- Permite acceso público por token para que candidatos externos accedan al assessment
CREATE POLICY "links_select_by_token"
    ON public.assessment_links FOR SELECT
    USING (estado NOT IN ('cancelado'));

CREATE POLICY "links_write_admin"
    ON public.assessment_links FOR ALL
    USING (public.get_current_user_rol() = 'admin_rrhh');

CREATE POLICY "links_update_sistema"
    ON public.assessment_links FOR UPDATE
    USING (TRUE)
    WITH CHECK (TRUE);
