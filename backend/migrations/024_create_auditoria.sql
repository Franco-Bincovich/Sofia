-- Log de auditoría inmutable para trazabilidad de cambios en datos sensibles.
-- INSERT permitido para todos; UPDATE y DELETE bloqueados por política.
-- La función fn_auditoria() se activa automáticamente desde triggers en tablas críticas.

CREATE TABLE public.auditoria (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tabla            VARCHAR(100) NOT NULL,
    registro_id      UUID        NOT NULL,
    accion           VARCHAR(10) NOT NULL CHECK (accion IN ('INSERT', 'UPDATE', 'DELETE')),
    datos_anteriores JSONB,
    datos_nuevos     JSONB,
    usuario_id       UUID        REFERENCES public.users(id) ON DELETE SET NULL,
    ip               INET,
    user_agent       TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_auditoria_tabla    ON public.auditoria(tabla);
CREATE INDEX idx_auditoria_registro ON public.auditoria(tabla, registro_id);
CREATE INDEX idx_auditoria_usuario  ON public.auditoria(usuario_id);
CREATE INDEX idx_auditoria_created  ON public.auditoria(created_at DESC);

-- RLS Policies — solo admin_rrhh puede leer; nadie puede modificar ni borrar
CREATE POLICY "auditoria_select_admin"
    ON public.auditoria FOR SELECT
    USING (public.get_current_user_rol() = 'admin_rrhh');

CREATE POLICY "auditoria_insert_todos"
    ON public.auditoria FOR INSERT
    WITH CHECK (TRUE);

-- Trigger genérico de auditoría. Se instala en cada tabla sensible a continuación.
CREATE OR REPLACE FUNCTION public.fn_auditoria()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.auditoria (tabla, registro_id, accion, datos_nuevos, usuario_id)
        VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW), auth.uid());
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO public.auditoria (tabla, registro_id, accion, datos_anteriores, datos_nuevos, usuario_id)
        VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.auditoria (tabla, registro_id, accion, datos_anteriores, usuario_id)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD), auth.uid());
        RETURN OLD;
    END IF;
END;
$$;

-- Auditoría automática activada en las tablas con datos más sensibles
CREATE TRIGGER trg_auditoria_users
    AFTER INSERT OR UPDATE OR DELETE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria();

CREATE TRIGGER trg_auditoria_empleados
    AFTER INSERT OR UPDATE OR DELETE ON public.empleados
    FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria();

CREATE TRIGGER trg_auditoria_costos_nomina
    AFTER INSERT OR UPDATE OR DELETE ON public.costos_nomina
    FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria();

CREATE TRIGGER trg_auditoria_offboarding
    AFTER INSERT OR UPDATE OR DELETE ON public.offboarding_instancias
    FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria();

CREATE TRIGGER trg_auditoria_assessment_resultados
    AFTER INSERT OR UPDATE OR DELETE ON public.assessment_resultados
    FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria();
