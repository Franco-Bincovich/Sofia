-- 035_demo_data.sql
-- Datos de demostración completos para HR Karstec.
-- Idempotente: ON CONFLICT DO NOTHING / WHERE NOT EXISTS en todos los INSERT.
-- Los area_id y empleado_id se resuelven con subqueries dinámicos (sin UUIDs hardcodeados).

BEGIN;

-- ════════════════════════════════════════════════════════════════
-- 1. EMPLEADOS
-- ════════════════════════════════════════════════════════════════

-- ── Área IT (6 empleados) ─────────────────────────────────────────
INSERT INTO public.empleados
    (nombre, apellido, email_corporativo, cargo, rol,
     fecha_ingreso, tipo_contrato, modalidad_trabajo, estado,
     area_id, nivel, potencial, desempeno)
VALUES
    ('Martín', 'Rodríguez', 'martin.rodriguez@karstec.com',
     'Tech Lead', 'Líder Técnico IT',
     '2022-03-15', 'efectivo', 'hibrido', 'activo',
     (SELECT id FROM public.areas WHERE nombre = 'IT'),
     'lider', 'alto', 'alto'),

    ('Valentina', 'Castro', 'valentina.castro@karstec.com',
     'Desarrolladora Senior', 'Software Engineer Senior',
     '2022-08-01', 'efectivo', 'remoto', 'activo',
     (SELECT id FROM public.areas WHERE nombre = 'IT'),
     'senior', 'medio', 'alto'),

    ('Lucas', 'Pereyra', 'lucas.pereyra@karstec.com',
     'Desarrollador Full Stack', 'Software Engineer',
     '2023-06-12', 'efectivo', 'hibrido', 'activo',
     (SELECT id FROM public.areas WHERE nombre = 'IT'),
     'semi_senior', 'alto', 'medio'),

    ('Camila', 'Sánchez', 'camila.sanchez@karstec.com',
     'QA Engineer', 'Quality Assurance Engineer',
     '2023-09-05', 'efectivo', 'presencial', 'activo',
     (SELECT id FROM public.areas WHERE nombre = 'IT'),
     'semi_senior', 'medio', 'medio'),

    ('Tomás', 'Ferreyra', 'tomas.ferreyra@karstec.com',
     'DevOps', 'DevOps Engineer',
     '2022-11-28', 'efectivo', 'remoto', 'activo',
     (SELECT id FROM public.areas WHERE nombre = 'IT'),
     'senior', 'alto', 'alto'),

    ('Lucía', 'Moreno', 'lucia.moreno@karstec.com',
     'Desarrolladora Junior', 'Software Engineer Junior',
     '2024-11-01', 'plazo_fijo', 'presencial', 'activo',
     (SELECT id FROM public.areas WHERE nombre = 'IT'),
     'junior', 'medio', 'medio')

ON CONFLICT (email_corporativo) DO NOTHING;

-- ── Área Gestión de Deuda (5 empleados) ──────────────────────────
INSERT INTO public.empleados
    (nombre, apellido, email_corporativo, cargo, rol,
     fecha_ingreso, tipo_contrato, modalidad_trabajo, estado,
     area_id, nivel, potencial, desempeno)
VALUES
    ('Diego', 'Torres', 'diego.torres@karstec.com',
     'Gerente de Cobranzas', 'Gerente de Gestión de Deuda',
     '2022-01-10', 'efectivo', 'presencial', 'activo',
     (SELECT id FROM public.areas WHERE nombre = 'Gestión de Deuda'),
     'manager', 'alto', 'alto'),

    ('Ana', 'García', 'ana.garcia@karstec.com',
     'Analista Senior', 'Analista de Cobranzas Senior',
     '2022-07-18', 'efectivo', 'hibrido', 'activo',
     (SELECT id FROM public.areas WHERE nombre = 'Gestión de Deuda'),
     'senior', 'medio', 'alto'),

    ('Carlos', 'López', 'carlos.lopez@karstec.com',
     'Analista de Riesgo', 'Risk Analyst',
     '2023-04-03', 'efectivo', 'presencial', 'licencia',
     (SELECT id FROM public.areas WHERE nombre = 'Gestión de Deuda'),
     'semi_senior', 'bajo', 'medio'),

    ('Sofía', 'Méndez', 'sofia.mendez.gd@karstec.com',
     'Coordinadora', 'Coordinadora de Cobranzas',
     '2023-02-14', 'efectivo', 'hibrido', 'activo',
     (SELECT id FROM public.areas WHERE nombre = 'Gestión de Deuda'),
     'senior', 'medio', 'medio'),

    ('Pablo', 'Herrera', 'pablo.herrera@karstec.com',
     'Analista Junior', 'Analista de Cobranzas Junior',
     '2024-03-25', 'plazo_fijo', 'presencial', 'baja',
     (SELECT id FROM public.areas WHERE nombre = 'Gestión de Deuda'),
     'junior', 'bajo', 'bajo')

ON CONFLICT (email_corporativo) DO NOTHING;

-- ── Área Calidad de Datos (4 empleados) ──────────────────────────
INSERT INTO public.empleados
    (nombre, apellido, email_corporativo, cargo, rol,
     fecha_ingreso, tipo_contrato, modalidad_trabajo, estado,
     area_id, nivel, potencial, desempeno)
VALUES
    ('María', 'Fernández', 'maria.fernandez@karstec.com',
     'Data Analyst Senior', 'Senior Data Analyst',
     '2022-05-20', 'efectivo', 'remoto', 'activo',
     (SELECT id FROM public.areas WHERE nombre = 'Calidad de Datos'),
     'senior', 'alto', 'alto'),

    ('Rodrigo', 'Díaz', 'rodrigo.diaz@karstec.com',
     'Data Engineer', 'Data Engineer',
     '2022-10-07', 'efectivo', 'hibrido', 'activo',
     (SELECT id FROM public.areas WHERE nombre = 'Calidad de Datos'),
     'senior', 'alto', 'medio'),

    ('Florencia', 'Ruiz', 'florencia.ruiz@karstec.com',
     'Analista de Datos', 'Data Analyst',
     '2023-08-14', 'plazo_fijo', 'hibrido', 'activo',
     (SELECT id FROM public.areas WHERE nombre = 'Calidad de Datos'),
     'semi_senior', 'medio', 'medio'),

    ('Nicolás', 'Vega', 'nicolas.vega@karstec.com',
     'Junior Analyst', 'Junior Data Analyst',
     '2024-04-08', 'plazo_fijo', 'presencial', 'activo',
     (SELECT id FROM public.areas WHERE nombre = 'Calidad de Datos'),
     'junior', 'bajo', 'bajo')

ON CONFLICT (email_corporativo) DO NOTHING;

-- ── Área Recursos Humanos (Laura y Joaquín; Sofia Zabala ya existe) ──
INSERT INTO public.empleados
    (nombre, apellido, email_corporativo, cargo, rol,
     fecha_ingreso, tipo_contrato, modalidad_trabajo, estado,
     area_id, nivel, potencial, desempeno)
VALUES
    ('Laura', 'Méndez', 'laura.mendez@karstec.com',
     'HRBP Senior', 'HR Business Partner Senior',
     '2022-04-04', 'efectivo', 'hibrido', 'activo',
     (SELECT id FROM public.areas WHERE nombre = 'Recursos Humanos'),
     'senior', 'alto', 'alto'),

    ('Joaquín', 'Pérez', 'joaquin.perez@karstec.com',
     'Recruiter', 'Talent Acquisition Specialist',
     '2023-11-20', 'efectivo', 'presencial', 'activo',
     (SELECT id FROM public.areas WHERE nombre = 'Recursos Humanos'),
     'semi_senior', 'medio', 'medio')

ON CONFLICT (email_corporativo) DO NOTHING;

-- ════════════════════════════════════════════════════════════════
-- 2. JERARQUÍA (manager_id) — solo actualiza si aún no tiene manager
-- ════════════════════════════════════════════════════════════════

UPDATE public.empleados
SET manager_id = (SELECT id FROM public.empleados WHERE email_corporativo = 'martin.rodriguez@karstec.com')
WHERE email_corporativo IN (
    'valentina.castro@karstec.com', 'lucas.pereyra@karstec.com',
    'camila.sanchez@karstec.com',   'tomas.ferreyra@karstec.com',
    'lucia.moreno@karstec.com'
) AND manager_id IS NULL;

UPDATE public.empleados
SET manager_id = (SELECT id FROM public.empleados WHERE email_corporativo = 'diego.torres@karstec.com')
WHERE email_corporativo IN (
    'ana.garcia@karstec.com', 'carlos.lopez@karstec.com',
    'sofia.mendez.gd@karstec.com', 'pablo.herrera@karstec.com'
) AND manager_id IS NULL;

UPDATE public.empleados
SET manager_id = (SELECT id FROM public.empleados WHERE email_corporativo = 'maria.fernandez@karstec.com')
WHERE email_corporativo IN (
    'rodrigo.diaz@karstec.com', 'florencia.ruiz@karstec.com', 'nicolas.vega@karstec.com'
) AND manager_id IS NULL;

UPDATE public.empleados
SET manager_id = (SELECT id FROM public.empleados WHERE email_corporativo = 'laura.mendez@karstec.com')
WHERE email_corporativo = 'joaquin.perez@karstec.com'
  AND manager_id IS NULL;

-- ════════════════════════════════════════════════════════════════
-- 3. RESPONSABLES DE ÁREA
-- ════════════════════════════════════════════════════════════════

UPDATE public.areas
SET responsable_id = (SELECT id FROM public.empleados WHERE email_corporativo = 'martin.rodriguez@karstec.com')
WHERE nombre = 'IT';

UPDATE public.areas
SET responsable_id = (SELECT id FROM public.empleados WHERE email_corporativo = 'diego.torres@karstec.com')
WHERE nombre = 'Gestión de Deuda';

UPDATE public.areas
SET responsable_id = (SELECT id FROM public.empleados WHERE email_corporativo = 'maria.fernandez@karstec.com')
WHERE nombre = 'Calidad de Datos';

UPDATE public.areas
SET responsable_id = (SELECT id FROM public.empleados WHERE email_corporativo = 'laura.mendez@karstec.com')
WHERE nombre = 'Recursos Humanos';

-- ════════════════════════════════════════════════════════════════
-- 4. NÓMINA — Marzo, Abril y Mayo 2026 (solo empleados activos)
-- Carlos López (licencia) y Pablo Herrera (baja) excluidos.
-- ════════════════════════════════════════════════════════════════

WITH empleado_salarios (email, salario) AS (
    VALUES
        ('martin.rodriguez@karstec.com',   8500000::NUMERIC),
        ('valentina.castro@karstec.com',   7200000),
        ('lucas.pereyra@karstec.com',      5800000),
        ('camila.sanchez@karstec.com',     4500000),
        ('tomas.ferreyra@karstec.com',     6300000),
        ('lucia.moreno@karstec.com',       2800000),
        ('diego.torres@karstec.com',       9200000),
        ('ana.garcia@karstec.com',         5400000),
        ('sofia.mendez.gd@karstec.com',    4200000),
        ('maria.fernandez@karstec.com',    6800000),
        ('rodrigo.diaz@karstec.com',       6200000),
        ('florencia.ruiz@karstec.com',     3900000),
        ('nicolas.vega@karstec.com',       2100000),
        ('laura.mendez@karstec.com',       5600000),
        ('joaquin.perez@karstec.com',      3200000)
),
meses (mes) AS (
    VALUES (3::SMALLINT), (4::SMALLINT), (5::SMALLINT)
)
INSERT INTO public.costos_nomina
    (empleado_id, anio, mes, salario_bruto, cargas_sociales, moneda)
SELECT
    e.id,
    2026::SMALLINT,
    m.mes,
    es.salario,
    ROUND(es.salario * 0.17, 2),
    'ARS'
FROM empleado_salarios es
JOIN public.empleados e ON e.email_corporativo = es.email
CROSS JOIN meses m
ON CONFLICT (empleado_id, anio, mes) DO NOTHING;

-- ════════════════════════════════════════════════════════════════
-- 5. VACANTES (3)
-- ════════════════════════════════════════════════════════════════

INSERT INTO public.vacantes
    (titulo, area_id, descripcion, requisitos, tipo_contrato, nivel, estado, fecha_apertura)
SELECT
    'Desarrollador Backend Senior',
    (SELECT id FROM public.areas WHERE nombre = 'IT'),
    'Buscamos un desarrollador backend senior para reforzar el equipo de producto. Trabajarás en arquitectura de microservicios y APIs de alto tráfico con foco en performance y escalabilidad.',
    '["5+ años de experiencia en backend", "Python o Node.js avanzado", "Experiencia con SQL y bases NoSQL", "Conocimientos de arquitectura cloud (AWS/GCP)", "Deseable: experiencia con Kafka o sistemas de mensajería"]'::jsonb,
    'efectivo', 'senior', 'en_proceso', '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM public.vacantes WHERE titulo = 'Desarrollador Backend Senior'
);

INSERT INTO public.vacantes
    (titulo, area_id, descripcion, requisitos, tipo_contrato, nivel, estado, fecha_apertura)
SELECT
    'Analista de Riesgo Senior',
    (SELECT id FROM public.areas WHERE nombre = 'Gestión de Deuda'),
    'Necesitamos un analista senior para fortalecer la gestión de riesgo crediticio, desarrollar modelos de scoring y analizar carteras de deuda de alta complejidad.',
    '["4+ años en análisis de riesgo crediticio", "Modelos de scoring y cobranzas", "Excel y SQL avanzado", "Deseable: Python o R para análisis estadístico", "Experiencia en entidades financieras o fintechs"]'::jsonb,
    'efectivo', 'senior', 'con_candidatos', '2026-01-15'
WHERE NOT EXISTS (
    SELECT 1 FROM public.vacantes WHERE titulo = 'Analista de Riesgo Senior'
);

INSERT INTO public.vacantes
    (titulo, area_id, descripcion, requisitos, tipo_contrato, nivel, estado, fecha_apertura)
SELECT
    'Data Scientist',
    (SELECT id FROM public.areas WHERE nombre = 'Calidad de Datos'),
    'Incorporamos un Data Scientist para desarrollar modelos predictivos, mejorar la calidad de datos de la organización y construir pipelines analíticos de valor para el negocio.',
    '["Sólida experiencia en machine learning y estadística", "Python (pandas, scikit-learn, numpy)", "SQL avanzado", "Visualización de datos (Power BI, Tableau o similar)", "Deseable: experiencia en datos financieros o de cobranzas"]'::jsonb,
    'efectivo', 'senior', 'nueva', '2026-03-10'
WHERE NOT EXISTS (
    SELECT 1 FROM public.vacantes WHERE titulo = 'Data Scientist'
);

-- ════════════════════════════════════════════════════════════════
-- 6. CANDIDATOS (4 para "Analista de Riesgo Senior", pipeline activo)
-- ════════════════════════════════════════════════════════════════

INSERT INTO public.candidatos
    (vacante_id, nombre, apellido, email, fuente, etapa, estado,
     fecha_postulacion, cargo_anterior, empresa_anterior, puntuacion)
SELECT
    (SELECT id FROM public.vacantes WHERE titulo = 'Analista de Riesgo Senior'),
    'Andrés', 'Gómez', 'andres.gomez.candidato@gmail.com',
    'linkedin', 'postulado', 'activo',
    '2026-02-10', 'Analista de Riesgo', 'Banco Macro', 7
WHERE NOT EXISTS (
    SELECT 1 FROM public.candidatos
    WHERE email = 'andres.gomez.candidato@gmail.com'
      AND vacante_id = (SELECT id FROM public.vacantes WHERE titulo = 'Analista de Riesgo Senior')
);

INSERT INTO public.candidatos
    (vacante_id, nombre, apellido, email, fuente, etapa, estado,
     fecha_postulacion, cargo_anterior, empresa_anterior, puntuacion)
SELECT
    (SELECT id FROM public.vacantes WHERE titulo = 'Analista de Riesgo Senior'),
    'Carolina', 'Silva', 'carolina.silva.candidata@outlook.com',
    'referido', 'assessment', 'activo',
    '2026-02-05', 'Analista Senior de Riesgo', 'HSBC Argentina', 8
WHERE NOT EXISTS (
    SELECT 1 FROM public.candidatos
    WHERE email = 'carolina.silva.candidata@outlook.com'
      AND vacante_id = (SELECT id FROM public.vacantes WHERE titulo = 'Analista de Riesgo Senior')
);

INSERT INTO public.candidatos
    (vacante_id, nombre, apellido, email, fuente, etapa, estado,
     fecha_postulacion, cargo_anterior, empresa_anterior, puntuacion)
SELECT
    (SELECT id FROM public.vacantes WHERE titulo = 'Analista de Riesgo Senior'),
    'Federico', 'Martínez', 'fmartinez.riesgo@gmail.com',
    'web', 'entrevista_rrhh', 'activo',
    '2026-01-28', 'Analista de Cobranzas', 'Naranja X', 7
WHERE NOT EXISTS (
    SELECT 1 FROM public.candidatos
    WHERE email = 'fmartinez.riesgo@gmail.com'
      AND vacante_id = (SELECT id FROM public.vacantes WHERE titulo = 'Analista de Riesgo Senior')
);

INSERT INTO public.candidatos
    (vacante_id, nombre, apellido, email, fuente, etapa, estado,
     fecha_postulacion, cargo_anterior, empresa_anterior, puntuacion)
SELECT
    (SELECT id FROM public.vacantes WHERE titulo = 'Analista de Riesgo Senior'),
    'Natalia', 'Romero', 'nataliaromero.cv@yahoo.com',
    'consultora', 'entrevista_tecnica', 'activo',
    '2026-01-20', 'Risk Analyst Senior', 'Banco Galicia', 9
WHERE NOT EXISTS (
    SELECT 1 FROM public.candidatos
    WHERE email = 'nataliaromero.cv@yahoo.com'
      AND vacante_id = (SELECT id FROM public.vacantes WHERE titulo = 'Analista de Riesgo Senior')
);

-- ════════════════════════════════════════════════════════════════
-- 7. ONBOARDING — Lucía Moreno (ingreso noviembre 2024)
-- ════════════════════════════════════════════════════════════════

DO $$
DECLARE
    lucia_id  UUID;
    tmpl_id   UUID;
    inst_id   UUID;
BEGIN
    SELECT id INTO lucia_id
    FROM public.empleados WHERE email_corporativo = 'lucia.moreno@karstec.com';

    SELECT id INTO tmpl_id
    FROM public.onboarding_templates WHERE nombre = 'Template Estándar Karstec' LIMIT 1;

    IF lucia_id IS NULL OR tmpl_id IS NULL THEN RETURN; END IF;

    -- Crear instancia si no existe para este empleado
    INSERT INTO public.onboarding_instancias
        (empleado_id, template_id, fecha_inicio, fecha_fin_esperada, estado)
    SELECT lucia_id, tmpl_id, '2024-11-01', '2024-12-01', 'en_progreso'
    WHERE NOT EXISTS (
        SELECT 1 FROM public.onboarding_instancias WHERE empleado_id = lucia_id
    )
    RETURNING id INTO inst_id;

    IF inst_id IS NULL THEN
        SELECT id INTO inst_id
        FROM public.onboarding_instancias WHERE empleado_id = lucia_id LIMIT 1;
    END IF;

    IF inst_id IS NULL THEN RETURN; END IF;

    -- Poblar progreso con todas las tareas del template (estado inicial: pendiente)
    INSERT INTO public.onboarding_progreso (instancia_id, tarea_id, estado)
    SELECT inst_id, t.id, 'pendiente'
    FROM public.onboarding_tareas t
    WHERE t.template_id = tmpl_id
    ON CONFLICT (instancia_id, tarea_id) DO NOTHING;

    -- Semana 1: todas completadas (primera semana de integración)
    UPDATE public.onboarding_progreso op
    SET estado = 'completado',
        fecha_completada = '2024-11-08 17:00:00+00'
    FROM public.onboarding_tareas ot
    WHERE op.instancia_id = inst_id
      AND op.tarea_id    = ot.id
      AND ot.template_id = tmpl_id
      AND ot.semana      = 1
      AND op.estado      = 'pendiente';

    -- Semana 2 - tarea 1 (capacitación herramientas): completada
    UPDATE public.onboarding_progreso op
    SET estado = 'completado',
        fecha_completada = '2024-11-13 11:00:00+00'
    FROM public.onboarding_tareas ot
    WHERE op.instancia_id = inst_id
      AND op.tarea_id    = ot.id
      AND ot.template_id = tmpl_id
      AND ot.semana      = 2
      AND ot.orden       = 1
      AND op.estado      = 'pendiente';

    -- Semana 2 - tarea 2 (revisión de procesos del área): en progreso
    UPDATE public.onboarding_progreso op
    SET estado = 'en_progreso'
    FROM public.onboarding_tareas ot
    WHERE op.instancia_id = inst_id
      AND op.tarea_id    = ot.id
      AND ot.template_id = tmpl_id
      AND ot.semana      = 2
      AND ot.orden       = 2
      AND op.estado      = 'pendiente';
END $$;

-- ════════════════════════════════════════════════════════════════
-- 8. ASSESSMENT — Campaña Q2 2026 + links + resultados (equipo IT)
-- Resultados alimentan el 9-box: desempeño × potencial.
-- ════════════════════════════════════════════════════════════════

DO $$
DECLARE
    camp_id      UUID;
    martin_id    UUID;
    valentina_id UUID;
    lucas_id     UUID;
    link_id      UUID;
BEGIN
    SELECT id INTO martin_id    FROM public.empleados WHERE email_corporativo = 'martin.rodriguez@karstec.com';
    SELECT id INTO valentina_id FROM public.empleados WHERE email_corporativo = 'valentina.castro@karstec.com';
    SELECT id INTO lucas_id     FROM public.empleados WHERE email_corporativo = 'lucas.pereyra@karstec.com';

    -- Crear campaña si no existe
    INSERT INTO public.assessment_campanas
        (nombre, descripcion, tipo, estado, fecha_inicio, fecha_fin, area_id)
    SELECT
        'Assessment Q2 2026',
        'Evaluación integral (conductual + cognitivo) del equipo IT para el segundo trimestre 2026.',
        'mixto', 'activa',
        '2026-04-01', '2026-06-30',
        (SELECT id FROM public.areas WHERE nombre = 'IT')
    WHERE NOT EXISTS (
        SELECT 1 FROM public.assessment_campanas WHERE nombre = 'Assessment Q2 2026'
    )
    RETURNING id INTO camp_id;

    IF camp_id IS NULL THEN
        SELECT id INTO camp_id FROM public.assessment_campanas WHERE nombre = 'Assessment Q2 2026';
    END IF;

    IF camp_id IS NULL THEN RETURN; END IF;

    -- ── Martín Rodríguez: estrella (alto desempeño + alto potencial) ──────
    IF martin_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.assessment_links
        WHERE campana_id = camp_id AND empleado_id = martin_id
    ) THEN
        INSERT INTO public.assessment_links
            (campana_id, empleado_id, email_destino, nombre_destino, estado, expira_en)
        VALUES (camp_id, martin_id,
                'martin.rodriguez@karstec.com', 'Martín Rodríguez',
                'completado', NOW() + INTERVAL '180 days')
        RETURNING id INTO link_id;

        INSERT INTO public.assessment_resultados
            (link_id, campana_id, empleado_id,
             respuestas, puntuacion, perfil_resultado,
             tiempo_total_segundos, completado_en)
        VALUES (
            link_id, camp_id, martin_id,
            '{"completado": true, "items_conductual": 32, "items_cognitivo": 25}'::jsonb,
            '{"desempeno": 9.2, "potencial": 9.5, "cognitivo": 8.8, "total": 9.2}'::jsonb,
            '{"cuadrante": "estrella", "eje_desempeno": "alto", "eje_potencial": "alto",
              "descripcion": "Alto desempeño y alto potencial. Perfil clave de retención y referente del equipo."}'::jsonb,
            3240, NOW()
        ) ON CONFLICT (link_id) DO NOTHING;
    END IF;

    -- ── Valentina Castro: alto performer (alto desempeño + potencial medio) ──
    IF valentina_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.assessment_links
        WHERE campana_id = camp_id AND empleado_id = valentina_id
    ) THEN
        INSERT INTO public.assessment_links
            (campana_id, empleado_id, email_destino, nombre_destino, estado, expira_en)
        VALUES (camp_id, valentina_id,
                'valentina.castro@karstec.com', 'Valentina Castro',
                'completado', NOW() + INTERVAL '180 days')
        RETURNING id INTO link_id;

        INSERT INTO public.assessment_resultados
            (link_id, campana_id, empleado_id,
             respuestas, puntuacion, perfil_resultado,
             tiempo_total_segundos, completado_en)
        VALUES (
            link_id, camp_id, valentina_id,
            '{"completado": true, "items_conductual": 32, "items_cognitivo": 25}'::jsonb,
            '{"desempeno": 8.7, "potencial": 7.2, "cognitivo": 8.5, "total": 8.1}'::jsonb,
            '{"cuadrante": "alto_performer", "eje_desempeno": "alto", "eje_potencial": "medio",
              "descripcion": "Alto desempeño con potencial de crecimiento medio. Perfil consolidado y confiable."}'::jsonb,
            2880, NOW()
        ) ON CONFLICT (link_id) DO NOTHING;
    END IF;

    -- ── Lucas Pereyra: alto potencial (desempeño medio + alto potencial) ──
    IF lucas_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.assessment_links
        WHERE campana_id = camp_id AND empleado_id = lucas_id
    ) THEN
        INSERT INTO public.assessment_links
            (campana_id, empleado_id, email_destino, nombre_destino, estado, expira_en)
        VALUES (camp_id, lucas_id,
                'lucas.pereyra@karstec.com', 'Lucas Pereyra',
                'completado', NOW() + INTERVAL '180 days')
        RETURNING id INTO link_id;

        INSERT INTO public.assessment_resultados
            (link_id, campana_id, empleado_id,
             respuestas, puntuacion, perfil_resultado,
             tiempo_total_segundos, completado_en)
        VALUES (
            link_id, camp_id, lucas_id,
            '{"completado": true, "items_conductual": 32, "items_cognitivo": 25}'::jsonb,
            '{"desempeno": 7.4, "potencial": 9.1, "cognitivo": 8.2, "total": 8.2}'::jsonb,
            '{"cuadrante": "alto_potencial", "eje_desempeno": "medio", "eje_potencial": "alto",
              "descripcion": "Alto potencial de crecimiento. Candidato ideal para plan de carrera acelerado hacia Tech Lead."}'::jsonb,
            2640, NOW()
        ) ON CONFLICT (link_id) DO NOTHING;
    END IF;
END $$;

-- ════════════════════════════════════════════════════════════════
-- 9. PLAN DE CARRERA — Lucas Pereyra → Tech Lead (readiness 45%)
-- ════════════════════════════════════════════════════════════════

DO $$
DECLARE
    lucas_id  UUID;
    martin_id UUID;
    plan_id   UUID;
BEGIN
    SELECT id INTO lucas_id  FROM public.empleados WHERE email_corporativo = 'lucas.pereyra@karstec.com';
    SELECT id INTO martin_id FROM public.empleados WHERE email_corporativo = 'martin.rodriguez@karstec.com';

    IF lucas_id IS NULL THEN RETURN; END IF;

    INSERT INTO public.planes_carrera
        (empleado_id, cargo_objetivo, descripcion,
         fecha_inicio, fecha_objetivo, estado, progreso, responsable_id)
    SELECT
        lucas_id,
        'Tech Lead',
        'Desarrollo hacia el rol de Tech Lead en el equipo de Producto. Foco en liderazgo técnico, arquitectura de sistemas y gestión de personas.',
        '2025-01-01', '2026-12-31',
        'activo', 45,
        martin_id
    WHERE NOT EXISTS (
        SELECT 1 FROM public.planes_carrera WHERE empleado_id = lucas_id
    )
    RETURNING id INTO plan_id;

    IF plan_id IS NULL THEN RETURN; END IF;

    -- Hito 1: Certificación AWS (completado)
    INSERT INTO public.planes_carrera_hitos
        (plan_id, nombre, descripcion, tipo, fecha_objetivo, fecha_completada, estado)
    VALUES (
        plan_id,
        'Certificación AWS Solutions Architect',
        'Obtener la certificación AWS Solutions Architect Associate para profundizar el dominio de infraestructura cloud.',
        'certificacion', '2025-06-30', '2025-05-28', 'completado'
    );

    -- Hito 2: Liderazgo técnico del proyecto de microservicios (en progreso)
    INSERT INTO public.planes_carrera_hitos
        (plan_id, nombre, descripcion, tipo, fecha_objetivo, estado)
    VALUES (
        plan_id,
        'Liderazgo técnico del proyecto de microservicios',
        'Liderar el diseño e implementación de la migración de arquitectura monolítica a microservicios. Incluye toma de decisiones de arquitectura, coordinación del equipo y presentaciones a management.',
        'proyecto', '2025-12-31', 'en_progreso'
    );

    -- Hito 3: Capacitación en liderazgo y gestión de equipos (pendiente)
    INSERT INTO public.planes_carrera_hitos
        (plan_id, nombre, descripcion, tipo, fecha_objetivo, estado)
    VALUES (
        plan_id,
        'Programa de liderazgo y gestión de equipos técnicos',
        'Completar programa de formación en management técnico, feedback efectivo, resolución de conflictos y conducción de equipos de ingeniería.',
        'capacitacion', '2026-06-30', 'pendiente'
    );
END $$;

COMMIT;
