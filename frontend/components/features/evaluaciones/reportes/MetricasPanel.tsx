"use client"

import { useEffect, useState } from "react"

import { ErrorState } from "@/components/ui/ErrorState"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchMetricas } from "@/services/evaluacionReportes"
import type { MetricasResponse } from "@/types/evaluacionReportes"
import { BrechaTable } from "./BrechaTable"
import { CompetenciasTables } from "./CompetenciasTables"
import { ResumenYSectores } from "./ResumenYSectores"

// Contenedor de métricas: una sola fetch a /metricas (los 4 bloques) y las 3 vistas.
export function MetricasPanel({ loteId }: { loteId: string }) {
  const [data, setData] = useState<MetricasResponse | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(false)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    setCargando(true)
    setError(false)
    fetchMetricas(loteId)
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setCargando(false))
  }, [loteId, nonce])

  if (cargando) {
    return <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}</div>
  }
  if (error || !data) return <ErrorState action={() => setNonce((n) => n + 1)} />

  return (
    <div className="space-y-8">
      <ResumenYSectores resumen={data.resumen} sectores={data.sectores} />
      <section>
        <h2 className="mb-1 text-base font-semibold">Brecha de autopercepción</h2>
        <p className="mb-2 text-xs text-muted-foreground">Cuánto se aleja la autoevaluación del promedio de los demás. De mayor a menor.</p>
        <BrechaTable items={data.brecha} />
      </section>
      <CompetenciasTables data={data.competencias} />
    </div>
  )
}
