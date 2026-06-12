-- C-6: el legajo deja de ser único global y pasa a ser único por empresa.
-- En un sistema multiempresa, dos empresas distintas pueden tener un
-- empleado con el mismo número de legajo sin que sea un conflicto.
-- El constraint global inline (auto-nombrado por PostgreSQL) se busca y
-- dropea por lookup para no depender del nombre exacto.

DO $$
DECLARE
    v_attnum  smallint;
    v_conname text;
BEGIN
    SELECT attnum INTO v_attnum
    FROM pg_attribute
    WHERE attrelid = 'public.empleados'::regclass AND attname = 'legajo';

    SELECT conname INTO v_conname
    FROM pg_constraint
    WHERE conrelid = 'public.empleados'::regclass
      AND contype = 'u'
      AND conkey  = ARRAY[v_attnum];

    IF v_conname IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.empleados DROP CONSTRAINT %I', v_conname);
    END IF;
END $$;

ALTER TABLE public.empleados
    ADD CONSTRAINT empleados_legajo_empresa_key UNIQUE (legajo, empresa_id);
