-- 062_periodos_cerrados.sql
--
-- POR QUÉ:
-- La Entrega 2 (ítem 1) necesita que RRHH pueda "congelar" un período (ej. un mes ya
-- liquidado o reportado) para que no se puedan crear/editar/borrar registros con fecha
-- dentro de ese período. Sin esto, un mes cerrado en nómina o ya reportado puede alterarse
-- por atrás (una ausencia o vacación retroactiva) y descuadrar lo informado.
--
-- DECISIÓN:
--   * POR MÓDULO y EMPRESA: `modulo` nullable (NULL = aplica a TODOS los módulos de la
--     empresa; valor = solo ese módulo, ej. 'ausencias'|'vacaciones'|'costos'). `empresa_id`
--     obligatorio (multiempresa: un cierre es siempre de una empresa).
--   * RANGO [desde, hasta] (fechas date). Cerrar "marzo 2026" = desde 2026-03-01 a 2026-03-31.
--   * REVERSIBLE con `estado` ('cerrado'|'abierto'): reabrir NO borra la fila, conserva el
--     historial de quién/cuándo cerró y reabrió (cerrado_por/at, reabierto_por/at).
--   * El check de bloqueo (solapamiento de rangos) es APP-LEVEL en los services de escritura
--     (B3.2); esta migración solo crea el almacén. El congelamiento es total (create+update+delete).
--
-- RLS: se HABILITA sin policies → deny-all para anon/authenticated. El backend accede solo
-- con service_key (supabase_admin), que bypasea RLS. El control de acceso real es app-level
-- (require_permission con Seccion.PERIODOS, solo admin_rrhh), mismo criterio que auditoria (058)
-- y adjuntos (061). Se evita toda policy con get_current_user_rol/'management' (modelo viejo).
--
-- Idempotente: CREATE TABLE / INDEX ... IF NOT EXISTS. NO se ejecuta acá (la corre Franco).

BEGIN;

CREATE TABLE IF NOT EXISTS public.periodos_cerrados (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id    UUID        NOT NULL REFERENCES public.empresas(id),
    modulo        TEXT,
    desde         DATE        NOT NULL,
    hasta         DATE        NOT NULL,
    estado        TEXT        NOT NULL DEFAULT 'cerrado' CHECK (estado IN ('cerrado', 'abierto')),
    cerrado_por   UUID        REFERENCES public.users(id) ON DELETE SET NULL,
    cerrado_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reabierto_por UUID        REFERENCES public.users(id) ON DELETE SET NULL,
    reabierto_at  TIMESTAMPTZ,
    CHECK (hasta >= desde)
);

-- Índice del check de escritura: buscar cierres 'cerrado' de una empresa que apliquen a un módulo.
CREATE INDEX IF NOT EXISTS idx_periodos_check
    ON public.periodos_cerrados(empresa_id, modulo, estado);

-- RLS habilitado SIN policies: deny-all directo; el acceso va por backend (service_key
-- bypasea RLS) con gating app-level por Seccion.PERIODOS.
ALTER TABLE public.periodos_cerrados ENABLE ROW LEVEL SECURITY;

COMMIT;

NOTIFY pgrst, 'reload schema';
