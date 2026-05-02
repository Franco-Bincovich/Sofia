-- Agrega potencial y desempeno a empleados para el mapa 9-Box.
-- Ambas columnas son requeridas con valor por defecto 'medio' para no romper filas existentes.

ALTER TABLE public.empleados
    ADD COLUMN potencial VARCHAR(10) NOT NULL DEFAULT 'medio'
        CHECK (potencial IN ('alto', 'medio', 'bajo')),
    ADD COLUMN desempeno VARCHAR(10) NOT NULL DEFAULT 'medio'
        CHECK (desempeno IN ('alto', 'medio', 'bajo'));

CREATE INDEX idx_empleados_potencial ON public.empleados(potencial);
CREATE INDEX idx_empleados_desempeno ON public.empleados(desempeno);
