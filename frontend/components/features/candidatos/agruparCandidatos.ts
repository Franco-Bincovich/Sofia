import type { CandidatoConGrupo, GrupoCandidatos } from "@/types/candidato"

/**
 * Agrupa candidatos por grupo_nombre. Un grupo es "activo" si alguno de sus candidatos
 * pertenece a una búsqueda viva. Orden: grupos activos primero, cerrados después.
 */
export function agruparCandidatos(items: CandidatoConGrupo[]): GrupoCandidatos[] {
  const mapa = new Map<string, GrupoCandidatos>()
  for (const c of items) {
    const nombre = c.grupo_nombre ?? "Sin búsqueda"
    let grupo = mapa.get(nombre)
    if (!grupo) {
      grupo = { nombre, activa: false, candidatos: [] }
      mapa.set(nombre, grupo)
    }
    grupo.candidatos.push(c)
    if (c.busqueda_activa) grupo.activa = true
  }
  return [...mapa.values()].sort((a, b) => Number(b.activa) - Number(a.activa))
}
