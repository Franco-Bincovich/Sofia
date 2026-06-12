-- 056_rls_tablas_proyectos_inventario.sql
-- Habilita RLS en las 6 tablas de los módulos nuevos (inventario, objetivos,
-- proyectos) que quedaron SIN ENABLE ROW LEVEL SECURITY en sus migraciones
-- originales (047-052). El resto del proyecto sigue el patrón:
--   - SELECT abierto a cualquier usuario autenticado (auth.uid() IS NOT NULL).
--   - Escritura (FOR ALL) restringida a admin_rrhh vía public.get_current_user_rol().
--
-- El aislamiento multiempresa NO se hace en RLS (lo maneja el backend con el
-- header X-Empresa-Id) — por eso ninguna policy filtra por empresa_id.
--
-- Idempotente: ENABLE ... es no-op si ya estaba activo; cada CREATE POLICY se
-- protege con IF NOT EXISTS sobre pg_policies (Postgres no soporta
-- CREATE POLICY IF NOT EXISTS), igual que el patrón de guards de 055.

BEGIN;

-- ── inventario_items (047) ───────────────────────────────────────────────────
ALTER TABLE public.inventario_items ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventario_items' AND policyname = 'inv_items_select_authenticated') THEN
        CREATE POLICY "inv_items_select_authenticated" ON public.inventario_items FOR SELECT USING (auth.uid() IS NOT NULL);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventario_items' AND policyname = 'inv_items_write_admin') THEN
        CREATE POLICY "inv_items_write_admin" ON public.inventario_items FOR ALL USING (public.get_current_user_rol() = 'admin_rrhh');
    END IF;
END $$;

-- ── inventario_asignaciones (048) ────────────────────────────────────────────
ALTER TABLE public.inventario_asignaciones ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventario_asignaciones' AND policyname = 'inv_asignaciones_select_authenticated') THEN
        CREATE POLICY "inv_asignaciones_select_authenticated" ON public.inventario_asignaciones FOR SELECT USING (auth.uid() IS NOT NULL);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventario_asignaciones' AND policyname = 'inv_asignaciones_write_admin') THEN
        CREATE POLICY "inv_asignaciones_write_admin" ON public.inventario_asignaciones FOR ALL USING (public.get_current_user_rol() = 'admin_rrhh');
    END IF;
END $$;

-- ── objetivos (049) ──────────────────────────────────────────────────────────
ALTER TABLE public.objetivos ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objetivos' AND policyname = 'objetivos_select_authenticated') THEN
        CREATE POLICY "objetivos_select_authenticated" ON public.objetivos FOR SELECT USING (auth.uid() IS NOT NULL);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objetivos' AND policyname = 'objetivos_write_admin') THEN
        CREATE POLICY "objetivos_write_admin" ON public.objetivos FOR ALL USING (public.get_current_user_rol() = 'admin_rrhh');
    END IF;
END $$;

-- ── proyectos (050) ──────────────────────────────────────────────────────────
ALTER TABLE public.proyectos ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'proyectos' AND policyname = 'proyectos_select_authenticated') THEN
        CREATE POLICY "proyectos_select_authenticated" ON public.proyectos FOR SELECT USING (auth.uid() IS NOT NULL);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'proyectos' AND policyname = 'proyectos_write_admin') THEN
        CREATE POLICY "proyectos_write_admin" ON public.proyectos FOR ALL USING (public.get_current_user_rol() = 'admin_rrhh');
    END IF;
END $$;

-- ── proyecto_asignaciones (051) ──────────────────────────────────────────────
ALTER TABLE public.proyecto_asignaciones ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'proyecto_asignaciones' AND policyname = 'proy_asignaciones_select_authenticated') THEN
        CREATE POLICY "proy_asignaciones_select_authenticated" ON public.proyecto_asignaciones FOR SELECT USING (auth.uid() IS NOT NULL);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'proyecto_asignaciones' AND policyname = 'proy_asignaciones_write_admin') THEN
        CREATE POLICY "proy_asignaciones_write_admin" ON public.proyecto_asignaciones FOR ALL USING (public.get_current_user_rol() = 'admin_rrhh');
    END IF;
END $$;

-- ── horas_proyecto (052) ─────────────────────────────────────────────────────
ALTER TABLE public.horas_proyecto ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'horas_proyecto' AND policyname = 'horas_proyecto_select_authenticated') THEN
        CREATE POLICY "horas_proyecto_select_authenticated" ON public.horas_proyecto FOR SELECT USING (auth.uid() IS NOT NULL);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'horas_proyecto' AND policyname = 'horas_proyecto_write_admin') THEN
        CREATE POLICY "horas_proyecto_write_admin" ON public.horas_proyecto FOR ALL USING (public.get_current_user_rol() = 'admin_rrhh');
    END IF;
END $$;

COMMIT;

NOTIFY pgrst, 'reload schema';
