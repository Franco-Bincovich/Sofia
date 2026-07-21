"use client"

import { useEffect, useState } from "react"

import { fetchLotesEvaluaciones } from "@/services/evaluacionReportes"
import type { LoteEvaluacion } from "@/types/evaluacionReportes"

// Carga los lotes (ciclos) de la empresa activa y mantiene el seleccionado. Con uno solo,
// la página no muestra selector; con cero, muestra vacío (o el import si es admin).
export function useLotesEvaluaciones() {
  const [lotes, setLotes] = useState<LoteEvaluacion[]>([])
  const [loteId, setLoteId] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    fetchLotesEvaluaciones()
      .then((r) => {
        setLotes(r.items)
        setLoteId(r.items[0]?.id ?? null)
      })
      .catch(() => setLotes([]))
      .finally(() => setCargando(false))
  }, [])

  return { lotes, loteId, setLoteId, cargando }
}
