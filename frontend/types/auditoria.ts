/**
 * Tipos del audit log (T18.5). Espejo de los schemas del backend:
 * AuditLogResponse / AuditLogListResponse (backend/schemas/auditoria.py).
 */

/** Entidades de negocio auditadas (espeja la columna `entidad` que escribe el backend). */
export type AuditEntidad =
  | "empleado"
  | "vacacion"
  | "ausencia"
  | "nomina"
  | "presupuesto"
  | "empresa"
  | "offboarding"

/** Un evento de auditoría. Espejo exacto de AuditLogResponse. */
export interface AuditLog {
  id: string
  usuario_id: string | null
  usuario_nombre: string | null
  empresa_id: string | null
  empresa_nombre: string | null
  entidad: string
  evento: string
  accion: string
  registro_id: string
  datos_anteriores: Record<string, unknown> | null
  datos_nuevos: Record<string, unknown> | null
  created_at: string
}

export interface AuditLogListResponse {
  items: AuditLog[]
  total: number
}
