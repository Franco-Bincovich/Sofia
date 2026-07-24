"use client"

import { useCallback, useEffect, useState } from "react"

import { fetchLotesEvaluaciones } from "@/services/evaluacionReportes"
import type { LoteEvaluacion } from "@/types/evaluacionReportes"

// Carga los lotes (ciclos) de la empresa activa y mantiene el seleccionado. Con uno solo,
// la página no muestra selector; con cero, muestra vacío (o el import si es admin).
// `recargar` la usa el borrado de una importación: conserva el ciclo elegido si sigue
// existiendo y, si se borró, cae al más reciente (o a null → estado vacío).
export function useLotesEvaluaciones() {
  const [lotes, setLotes] = useState<LoteEvaluacion[]>([])
  const [loteId, setLoteId] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)

  const recargar = useCallback(() => {
    setCargando(true)
    return fetchLotesEvaluaciones()
      .then((r) => {
        setLotes(r.items)
        setLoteId((prev) => (prev && r.items.some((l) => l.id === prev) ? prev : r.items[0]?.id ?? null))
      })
      .catch(() => {
        setLotes([])
        setLoteId(null)
      })
      .finally(() => setCargando(false))
  }, [])

  useEffect(() => {
    void recargar()
  }, [recargar])

  return { lotes, loteId, setLoteId, cargando, recargar }
}
