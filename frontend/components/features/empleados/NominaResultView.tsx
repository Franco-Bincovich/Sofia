import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react"

import type { ImportacionNominaEmpleadosResult } from "@/types/importacion"

/** Reporte del import de nómina en 3 grupos: OK · con faltantes · no cargados. */
export function NominaResultView({ result }: { result: ImportacionNominaEmpleadosResult }) {
  const { creados, actualizados, con_faltantes, no_cargados } = result
  return (
    <div className="space-y-4 py-2">
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
        <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-4" />
          {creados} nuevo{creados !== 1 ? "s" : ""}, {actualizados} actualizado{actualizados !== 1 ? "s" : ""}
        </span>
        {con_faltantes.length > 0 && (
          <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="size-4" />
            {con_faltantes.length} con faltantes
          </span>
        )}
        {no_cargados.length > 0 && (
          <span className="flex items-center gap-1.5 text-destructive">
            <XCircle className="size-4" />
            {no_cargados.length} no cargado{no_cargados.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {con_faltantes.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
          <p className="mb-1.5 text-sm font-medium text-amber-800 dark:text-amber-200">Cargados con faltantes</p>
          <ul className="space-y-1 text-sm text-amber-800 dark:text-amber-200" role="list">
            {con_faltantes.map((r, i) => (
              <li key={`f-${r.fila}-${i}`}>Fila {r.fila}: {r.empleado} — cargado, falta {r.faltan.join(", ")}</li>
            ))}
          </ul>
        </div>
      )}

      {no_cargados.length > 0 && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
          <p className="mb-1.5 text-sm font-medium text-destructive">No cargados</p>
          <ul className="space-y-1 text-sm text-destructive" role="list">
            {no_cargados.map((r, i) => (
              <li key={`n-${r.fila}-${i}`}>Fila {r.fila}: {r.empleado} — {r.motivo}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
