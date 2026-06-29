import { Badge } from "@/components/ui/badge"
import { Field, Section } from "@/components/features/empleados/ficha/_primitives"
import type { Empleado } from "@/types/empleado"

const ESTADO_VARIANTS = {
  activo: "default",
  baja: "destructive",
  licencia: "secondary",
} as const

/**
 * Bloque estático de la ficha: datos personales + laborales + documentos (placeholder).
 * Presentación pura a partir del empleado ya cargado (sin fetch propio).
 * Mantiene el fallback de roles roles[0] ?? cargo hasta la limpieza S6.
 */
export function DatosEmpleadoSection({ empleado }: { empleado: Empleado }) {
  return (
    <>
      <Section title="Datos personales">
        <Field label="Email corporativo" value={empleado.email_corporativo} />
        <Field label="Teléfono" value={empleado.telefono} />
        <Field label="Fecha de nacimiento" value={empleado.fecha_nacimiento} />
        <Field label="CUIL" value={empleado.cuil} />
      </Section>

      <Section title="Datos laborales">
        <Field label="Empresa" value={empleado.empresa_nombre} />
        <Field label="Área" value={empleado.area_nombre} />
        <Field label="Roles" value={(empleado.roles ?? []).join(", ") || empleado.cargo} />
        <Field label="Legajo" value={empleado.legajo} />
        <Field label="Modalidad" value={empleado.modalidad_trabajo} />
        <Field label="Tipo de contrato" value={empleado.tipo_contrato} />
        <Field label="Fecha de ingreso" value={empleado.fecha_ingreso} />
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Estado
          </dt>
          <dd className="mt-1">
            <Badge variant={ESTADO_VARIANTS[empleado.estado] ?? "outline"}>
              {empleado.estado}
            </Badge>
          </dd>
        </div>
      </Section>

      <Section title="Documentos">
        <div className="col-span-full text-sm text-muted-foreground">
          La gestión de documentos estará disponible en una próxima versión.
        </div>
      </Section>
    </>
  )
}
