import { apiFetch } from "@/services/api"
import type { EquipoMiembro } from "@/types/equipo"

/**
 * Roster de empleados visibles por ownership (cross-empresa). Para admin_rrhh/gerencia
 * son todos; para mandos_medios, su gente. Sin paginación (lista corta).
 */
export async function fetchEquipo(): Promise<EquipoMiembro[]> {
  return apiFetch<EquipoMiembro[]>("/api/equipo")
}
