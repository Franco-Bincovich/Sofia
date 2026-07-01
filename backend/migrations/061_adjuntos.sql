-- 061_adjuntos.sql
--
-- POR QUÉ:
-- La Entrega 2 (ítem 4) necesita adjuntar archivos (PDF, Word, Excel, imágenes) a
-- múltiples entidades del sistema: empleados (legajo), vacaciones, ausencias,
-- evaluaciones, offboarding. Hasta ahora el manejo de archivos era POR-MÓDULO y ad-hoc
-- (empresas.logo_url, asignaciones.certificado_url) y la única tabla de adjuntos —
-- public.documentos_empleado (004)— quedó DORMIDA (sin repo/service/router) y con RLS
-- del modelo de roles viejo ('management' + get_current_user_rol).
--
-- DECISIÓN: tabla POLIMÓRFICA única public.adjuntos (entidad + entidad_id) que reemplaza
-- el enfoque por-módulo con un solo backend (repo/service/router) y un solo patrón de
-- Storage. documentos_empleado queda deprecada (no se toca; se migra/dropea más adelante).
--
--   * Solo se ALMACENA/DESCARGA el archivo; NO se lee su contenido (eso es futuro).
--   * Delete SOFT (estado='eliminado'): el objeto permanece en Storage; solo se oculta.
--   * empresa_id nullable: hereda la empresa activa del request; None = adjunto sin empresa.
--   * bucket privado único 'documentos' (ya existe). storage_path = ruta relativa; la
--     descarga se resuelve con signed URL temporal desde el backend (nunca URL pública).
--
-- RLS: se HABILITA sin policies → deny-all para anon/authenticated (RLS on + 0 policies =
-- sin acceso directo). El backend accede exclusivamente con service_key (supabase_admin),
-- que bypasea RLS. El control de acceso real es APP-LEVEL (require_permission/puede por
-- Seccion, resuelto según la entidad del adjunto en adjunto_service). Se evita a propósito
-- toda policy con get_current_user_rol/'management' (modelo de roles viejo de 004).
--
-- Idempotente: CREATE TABLE / INDEX ... IF NOT EXISTS. NO se ejecuta acá (la corre Franco).

BEGIN;

CREATE TABLE IF NOT EXISTS public.adjuntos (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    entidad        TEXT        NOT NULL,
    entidad_id     UUID        NOT NULL,
    empresa_id     UUID        REFERENCES public.empresas(id),
    bucket         TEXT        NOT NULL DEFAULT 'documentos',
    storage_path   TEXT        NOT NULL,
    nombre_archivo TEXT        NOT NULL,
    mime_type      TEXT,
    tamano_bytes   BIGINT      CHECK (tamano_bytes > 0),
    categoria      TEXT,
    descripcion    TEXT,
    estado         TEXT        NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'eliminado')),
    subido_por     UUID        REFERENCES public.users(id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice del listado por entidad (GET /api/adjuntos?entidad=&entidad_id=).
CREATE INDEX IF NOT EXISTS idx_adjuntos_entidad ON public.adjuntos(entidad, entidad_id);

-- RLS habilitado SIN policies: deny-all directo; el acceso va por backend (service_key
-- bypasea RLS) con gating app-level por Seccion. No se replican policies del modelo viejo.
ALTER TABLE public.adjuntos ENABLE ROW LEVEL SECURITY;

COMMIT;

NOTIFY pgrst, 'reload schema';
