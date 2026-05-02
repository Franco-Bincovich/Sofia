-- Documentos adjuntos a cada empleado almacenados en Supabase Storage.
-- storage_path es la ruta relativa dentro del bucket; la URL pública se construye en el backend.
-- tipos: contrato, recibo_sueldo, certificado, dni, curriculum, evaluacion, otro.

CREATE TABLE public.documentos_empleado (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    empleado_id    UUID         NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
    tipo           VARCHAR(30)  NOT NULL CHECK (tipo IN ('contrato', 'recibo_sueldo', 'certificado', 'dni', 'curriculum', 'evaluacion', 'otro')),
    nombre_archivo VARCHAR(255) NOT NULL,
    descripcion    VARCHAR(500),
    bucket         VARCHAR(50)  NOT NULL DEFAULT 'documentos',
    storage_path   TEXT         NOT NULL,
    tamano_bytes   BIGINT       CHECK (tamano_bytes > 0),
    mime_type      VARCHAR(100),
    estado         VARCHAR(20)  NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'archivado', 'eliminado')),
    subido_por     UUID         REFERENCES public.users(id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE public.documentos_empleado ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_documentos_empleado ON public.documentos_empleado(empleado_id);
CREATE INDEX idx_documentos_tipo     ON public.documentos_empleado(tipo);
CREATE INDEX idx_documentos_estado   ON public.documentos_empleado(estado);

-- RLS Policies
CREATE POLICY "documentos_select_admin_management"
    ON public.documentos_empleado FOR SELECT
    USING (public.get_current_user_rol() IN ('admin_rrhh', 'management'));

CREATE POLICY "documentos_select_own"
    ON public.documentos_empleado FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.empleados e
            WHERE e.id = empleado_id AND e.user_id = auth.uid()
        )
    );

CREATE POLICY "documentos_write_admin"
    ON public.documentos_empleado FOR ALL
    USING (public.get_current_user_rol() = 'admin_rrhh');
