/**
 * Etiquetas y formateo legibles para la UI de auditoría (T18.5c).
 * Traduce entidades/eventos/campos técnicos a lenguaje sin jerga y formatea valores.
 */

export const ENTIDAD_LABEL: Record<string, string> = {
  empleado: "Empleado",
  vacacion: "Vacación",
  ausencia: "Ausencia",
  nomina: "Nómina",
  presupuesto: "Presupuesto",
  empresa: "Empresa",
  offboarding: "Offboarding",
}

export const EVENTO_LABEL: Record<string, string> = {
  alta_empleado: "Alta de empleado",
  update_empleado: "Modificación de empleado",
  baja_empleado: "Baja de empleado",
  cancelacion_vacacion: "Cancelación de vacación",
  alta_ausencia: "Alta de ausencia",
  update_ausencia: "Modificación de ausencia",
  baja_ausencia: "Baja de ausencia",
  inicio_offboarding: "Inicio de offboarding",
  devolucion_activo: "Devolución de activo",
  carga_nomina: "Carga de nómina",
  set_presupuesto: "Configuración de presupuesto",
  alta_empresa: "Alta de empresa",
  toggle_empresa_activa: "Activación/desactivación de empresa",
}

const CAMPO_LABEL: Record<string, string> = {
  nombre: "Nombre",
  apellido: "Apellido",
  legajo: "Legajo",
  cargo: "Cargo",
  area_id: "Área",
  estado: "Estado",
  activa: "Activa",
  fecha_desde: "Desde",
  fecha_hasta: "Hasta",
  dias: "Días",
  justificada: "Justificada",
  motivo: "Motivo",
  tipo_id: "Tipo",
  empleado_id: "Empleado",
  mes: "Mes",
  anio: "Año",
  monto_bruto: "Monto bruto",
  monto_neto: "Monto neto",
  presupuesto: "Presupuesto",
  cuit: "CUIT",
  motivo_egreso: "Motivo de egreso",
  devuelto: "Devuelto",
  activo_id: "Activo",
}

/** Etiqueta legible de un campo; fallback al nombre crudo si no está mapeado. */
export function campoLabel(campo: string): string {
  return CAMPO_LABEL[campo] ?? campo
}

/** Formatea un valor de payload: bool→Sí/No, fecha ISO→dd/mm/yyyy, vacío→"—", resto→texto. */
export function formatValor(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—"
  if (typeof v === "boolean") return v ? "Sí" : "No"
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) {
    const [y, m, d] = v.slice(0, 10).split("-")
    return `${d}/${m}/${y}`
  }
  return String(v)
}

/** Formatea un ISO datetime a "dd/mm/yyyy hh:mm". Si no parsea, devuelve el crudo. */
export function formatFechaHora(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * Texto compacto para la columna resumen. Muestra el cambio real (no un verbo genérico):
 *  - UPDATE con diff (ambos lados): 1 campo → "Etiqueta: antes → después"; varios → "N cambios".
 *  - Un solo lado (alta/baja/toggle/carga): 1 campo → "Etiqueta: valor"; varios → "N campos".
 */
export function resumenDiff(
  antes: Record<string, unknown> | null,
  nuevos: Record<string, unknown> | null,
): string {
  const aKeys = antes ? Object.keys(antes) : []
  const nKeys = nuevos ? Object.keys(nuevos) : []
  if (aKeys.length && nKeys.length) {
    const keys = Array.from(new Set([...aKeys, ...nKeys]))
    if (keys.length === 1) {
      const k = keys[0]
      return `${campoLabel(k)}: ${formatValor(antes?.[k])} → ${formatValor(nuevos?.[k])}`
    }
    return `${keys.length} cambios`
  }
  const side = nKeys.length ? nuevos : antes
  const keys = nKeys.length ? nKeys : aKeys
  if (keys.length === 1 && side) return `${campoLabel(keys[0])}: ${formatValor(side[keys[0]])}`
  if (keys.length > 1) return `${keys.length} campos`
  return "—"
}
