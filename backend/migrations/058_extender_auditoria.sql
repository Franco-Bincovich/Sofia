-- 058_extender_auditoria.sql
--
-- POR QUÉ:
-- La Entrega 2 (T18) reactiva el audit log, que hasta ahora era un esqueleto roto.
-- La tabla public.auditoria (024) capturaba cambios vía triggers fn_auditoria() que
-- registraban el autor con auth.uid(). Pero el backend escribe con la service_key
-- (supabase_admin), y bajo el rol service_role auth.uid() es NULL: TODOS los registros
-- generados por la API quedaron con usuario_id NULL — es decir, sin el "quién", que es
-- justamente lo que un audit log necesita. Los triggers, además, sólo guardan el diff
-- crudo del row (sin empresa_id ni semántica de negocio) y no son filtrables por empresa.
--
-- DECISIÓN: se pasa a CAPTURA APP-LEVEL (T18.2+), donde el service recibe usuario_id y
-- empresa_id desde request.state (igual que el resto del proyecto) y registra el evento
-- con semántica de negocio. En consecuencia, esta migración:
--   1. DROPEA todos los triggers que dependen de fn_auditoria() y la función — sólo
--      generaban ruido con usuario_id NULL y serían redundantes con la captura app-level.
--   2. EXTIENDE public.auditoria con empresa_id (multiempresa), entidad y evento
--      (semántica de negocio legible), preservando las columnas existentes (incluido el
--      diff datos_anteriores/datos_nuevos, que el service seguirá poblando).
--   3. ABRE la lectura del audit a gerencia_lectura además de admin_rrhh (la RLS efectiva
--      la decide el backend con require_permission en T18.3; acá se mantiene el schema
--      coherente con ese acceso de lectura).
--
-- NOTA: el diagnóstico inicial contó 7 triggers (024/036/037), pero fn_auditoria() está
-- instalada en más tablas vía migraciones posteriores. Por eso el bloque 1 dropea
-- programáticamente TODOS los triggers que referencian la función (sin CASCADE), en vez
-- de nombrarlos uno por uno y arriesgar dejar dependientes.
--
-- NO se crean audit_service/repo/router todavía (T18.2+), ni se toca permisos.py (T18.3).
-- La tabla se mantiene INMUTABLE: no se agregan policies de UPDATE/DELETE. La policy de
-- INSERT (auditoria_insert_todos) NO se toca: el sistema sigue insertando.
--
-- Idempotente: el loop usa DROP TRIGGER IF EXISTS; ADD COLUMN / CREATE INDEX ... IF NOT EXISTS.

BEGIN;

-- ============================================================================
-- 1. Dropear TODOS los triggers que dependen de fn_auditoria() y luego la función.
-- Se recorren programáticamente todos los triggers cuya función sea fn_auditoria
-- y se dropea cada uno con su nombre real. Sin CASCADE: al terminar el loop no
-- quedan dependientes, así que DROP FUNCTION funciona sin eliminar nada a ciegas.
-- ============================================================================

DO $$
DECLARE
    trg RECORD;
BEGIN
    FOR trg IN
        SELECT tgname, tgrelid::regclass AS tabla
        FROM pg_trigger
        WHERE tgfoid = 'public.fn_auditoria'::regproc
          AND NOT tgisinternal
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON %s;', trg.tgname, trg.tabla);
    END LOOP;
END $$;

DROP FUNCTION IF EXISTS public.fn_auditoria();

-- ============================================================================
-- 2. Extender public.auditoria para captura app-level multiempresa.
-- empresa_id nullable: hay eventos sin empresa (p. ej. alta de usuario global).
-- entidad/evento: semántica de negocio legible (ej. 'empleado'/'baja_empleado').
-- ============================================================================

ALTER TABLE public.auditoria
    ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id),
    ADD COLUMN IF NOT EXISTS entidad    VARCHAR(50),
    ADD COLUMN IF NOT EXISTS evento     VARCHAR(60);

-- ============================================================================
-- 3. Índices para los filtros de la UI de auditoría (T18.5): por empresa activa
-- y por entidad concreta (historial embebido por registro).
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_auditoria_empresa ON public.auditoria(empresa_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_entidad ON public.auditoria(entidad, registro_id);

-- ============================================================================
-- 4. RLS — abrir la lectura a gerencia_lectura además de admin_rrhh.
-- La policy original (024) era admin-only. Se recrea con ambos roles de lectura,
-- consistente con el modelo funcional de T16. La inmutabilidad se mantiene: no se
-- agregan policies de UPDATE/DELETE. La policy de INSERT no se toca.
-- ============================================================================

DROP POLICY IF EXISTS "auditoria_select_admin" ON public.auditoria;
CREATE POLICY "auditoria_select_admin_gerencia"
    ON public.auditoria FOR SELECT
    USING (public.get_current_user_rol() IN ('admin_rrhh', 'gerencia_lectura'));

COMMIT;

NOTIFY pgrst, 'reload schema';