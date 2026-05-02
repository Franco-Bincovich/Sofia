-- Agrega columna semana a onboarding_tareas e inserta template por defecto.
-- semana 1-4 representa las 4 semanas del proceso de onboarding estándar.

ALTER TABLE public.onboarding_tareas
    ADD COLUMN IF NOT EXISTS semana SMALLINT NOT NULL DEFAULT 1
        CHECK (semana BETWEEN 1 AND 4);

INSERT INTO public.onboarding_templates (nombre, descripcion, duracion_dias, activo)
VALUES ('Template Estándar Karstec', 'Onboarding base para todos los ingresos nuevos', 30, TRUE)
ON CONFLICT DO NOTHING;

DO $$
DECLARE
    tmpl_id UUID;
BEGIN
    SELECT id INTO tmpl_id
    FROM public.onboarding_templates
    WHERE nombre = 'Template Estándar Karstec'
    LIMIT 1;

    IF tmpl_id IS NULL THEN RETURN; END IF;

    -- Semana 1: Bienvenida e integración
    INSERT INTO public.onboarding_tareas
        (template_id, nombre, descripcion, responsable_tipo, semana, orden, dias_limite)
    VALUES
        (tmpl_id, 'Reunión de bienvenida con RRHH',
         'Presentación del equipo, cultura y políticas de la empresa', 'rrhh', 1, 1, 1),
        (tmpl_id, 'Configuración de equipos y accesos',
         'Entrega de laptop, accesos a sistemas y cuentas corporativas', 'ti', 1, 2, 2),
        (tmpl_id, 'Presentación al equipo de trabajo',
         'Conocer al equipo directo y manager', 'manager', 1, 3, 2),
        (tmpl_id, 'Lectura y firma del reglamento interno',
         'Revisar y firmar el reglamento interno de la empresa', 'empleado', 1, 4, 3);

    -- Semana 2: Capacitación técnica
    INSERT INTO public.onboarding_tareas
        (template_id, nombre, descripcion, responsable_tipo, semana, orden, dias_limite)
    VALUES
        (tmpl_id, 'Capacitación en herramientas corporativas',
         'Slack, Jira, Confluence y herramientas de uso diario', 'ti', 2, 1, 3),
        (tmpl_id, 'Revisión de procesos del área',
         'Entender flujos de trabajo y metodologías del equipo', 'manager', 2, 2, 5),
        (tmpl_id, 'Asignación de buddy / mentor',
         'Designar un compañero de referencia para las primeras semanas', 'rrhh', 2, 3, 3),
        (tmpl_id, 'Completar capacitación de seguridad informática',
         'Curso obligatorio de seguridad informática y protección de datos', 'empleado', 2, 4, 5);

    -- Semana 3: Integración operativa
    INSERT INTO public.onboarding_tareas
        (template_id, nombre, descripcion, responsable_tipo, semana, orden, dias_limite)
    VALUES
        (tmpl_id, 'Primera tarea real asignada',
         'Participar activamente en una tarea real del equipo', 'manager', 3, 1, 7),
        (tmpl_id, 'Revisión y definición de objetivos del período',
         'Definir OKRs o metas para el primer trimestre', 'manager', 3, 2, 7),
        (tmpl_id, 'Check-in con RRHH — semana 3',
         'Reunión de seguimiento y consulta de inquietudes con RRHH', 'rrhh', 3, 3, 7),
        (tmpl_id, 'Acceso y revisión de documentación del producto',
         'Leer documentación técnica y de negocio del área', 'empleado', 3, 4, 10);

    -- Semana 4: Cierre del primer mes
    INSERT INTO public.onboarding_tareas
        (template_id, nombre, descripcion, responsable_tipo, semana, orden, dias_limite)
    VALUES
        (tmpl_id, 'Evaluación de integración del primer mes',
         'Assessment informal de adaptación y primeras impresiones', 'rrhh', 4, 1, 14),
        (tmpl_id, 'Feedback 360 del equipo y manager',
         'Recolectar y compartir feedback del equipo y del manager', 'manager', 4, 2, 14),
        (tmpl_id, 'Confirmación del período de prueba',
         'Revisión formal y confirmación de continuidad en la empresa', 'rrhh', 4, 3, 14),
        (tmpl_id, 'Establecer plan de desarrollo inicial',
         'Definir plan de carrera y desarrollo para los próximos 6 meses', 'manager', 4, 4, 14);
END $$;
