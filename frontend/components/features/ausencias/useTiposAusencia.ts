import { useEffect, useState } from "react"

import { createTipoAusencia, fetchTiposAusencia } from "@/services/ausencias"
import type { TipoAusencia } from "@/types/ausencias"

/**
 * Estado y alta del catálogo de tipos de ausencia para el modal. Carga los tipos y
 * resetea el borrador al abrir. `crearTipo` inserta el tipo tipeado y lo devuelve
 * (o null si está vacío/falla); el modal decide qué hacer con el resultado.
 */
export function useTiposAusencia(open: boolean) {
  const [tipos, setTipos] = useState<TipoAusencia[]>([])
  const [nuevoTipo, setNuevoTipo] = useState("")
  const [creandoTipo, setCreandoTipo] = useState(false)

  useEffect(() => {
    if (!open) return
    setNuevoTipo("")
    fetchTiposAusencia().then((r) => setTipos(r.items)).catch(() => {})
  }, [open])

  async function crearTipo(): Promise<TipoAusencia | null> {
    if (!nuevoTipo.trim()) return null
    setCreandoTipo(true)
    try {
      const created = await createTipoAusencia(nuevoTipo.trim())
      setTipos((p) => [...p, created].sort((a, b) => a.nombre.localeCompare(b.nombre)))
      setNuevoTipo("")
      return created
    } catch {
      return null
    } finally {
      setCreandoTipo(false)
    }
  }

  return { tipos, nuevoTipo, setNuevoTipo, creandoTipo, crearTipo }
}
