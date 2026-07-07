/** Miembro del roster "mi equipo" (GET /api/equipo): identidad mínima + empresa legible. */
export interface EquipoMiembro {
  id: string
  nombre: string
  apellido: string
  empresa: string | null
}
