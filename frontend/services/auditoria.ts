import { apiFetch } from "@/services/api"
import type { AuditLogListResponse } from "@/types/auditoria"

export interface AuditoriaFiltros {
  usuario_id?: string
  entidad?: string
  evento?: string
  registro_id?: string
  fecha_desde?: string
  fecha_hasta?: string
  page?: number
  page_size?: number
}

/**
 * Lista eventos de auditoría paginados y filtrados.
 * empresa_id NO va como query param: apiFetch ya inyecta X-Empresa-Id del empresaStore
 * (consolidado o empresa activa), igual que todos los listados.
 */
export async function fetchAuditoria(filtros: AuditoriaFiltros = {}): Promise<AuditLogListResponse> {
  const params = new URLSearchParams()
  if (filtros.usuario_id) params.set("usuario_id", filtros.usuario_id)
  if (filtros.entidad) params.set("entidad", filtros.entidad)
  if (filtros.evento) params.set("evento", filtros.evento)
  if (filtros.registro_id) params.set("registro_id", filtros.registro_id)
  if (filtros.fecha_desde) params.set("fecha_desde", filtros.fecha_desde)
  if (filtros.fecha_hasta) params.set("fecha_hasta", filtros.fecha_hasta)
  if (filtros.page) params.set("page", String(filtros.page))
  if (filtros.page_size) params.set("page_size", String(filtros.page_size))
  const query = params.size ? `?${params}` : ""
  return apiFetch<AuditLogListResponse>(`/api/auditoria${query}`)
}
