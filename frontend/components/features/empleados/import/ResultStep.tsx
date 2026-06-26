"use client"

import { CheckCircle2, Download, XCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DialogFooter } from "@/components/ui/dialog"
import type { ImportacionResult } from "@/types/importacion"

/** Genera y descarga un CSV (fila, motivo) con los errores de la importación. */
function downloadErrores(errores: ImportacionResult["errores"]): void {
  const filas = errores.map((e) => `${e.fila},"${e.error.replace(/"/g, '""')}"`)
  const csv = ["fila,motivo", ...filas].join("\n")
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "errores_importacion.csv"
  a.click()
  URL.revokeObjectURL(url)
}

export interface ResultStepProps {
  result: ImportacionResult
  onClose: () => void
}

/** Paso final: muestra el resultado de la importación (procesados + errores parciales). */
export function ResultStep({ result, onClose }: ResultStepProps) {
  const { importados, actualizados, errores } = result
  const total = importados + actualizados
  const hayErrores = errores.length > 0

  return (
    <>
      <div className="space-y-4 py-2">
        <div className="flex flex-col items-center text-center">
          <CheckCircle2 className="mb-3 size-12 text-emerald-500" />
          <p className="text-lg font-semibold text-foreground">Importación completada</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Se procesaron {total} empleado{total !== 1 ? "s" : ""}{" "}
            ({importados} alta{importados !== 1 ? "s" : ""}, {actualizados} actualización{actualizados !== 1 ? "es" : ""}).
          </p>
        </div>

        {hayErrores ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
            <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-amber-800 dark:text-amber-200">
              <XCircle className="size-4" />
              {errores.length} fila{errores.length !== 1 ? "s" : ""} no se {errores.length !== 1 ? "importaron" : "importó"}:
            </p>
            <ul className="space-y-1 text-sm text-amber-800 dark:text-amber-200" role="list">
              {errores.map((e, i) => (
                <li key={`${e.fila}-${i}`}>Fila {e.fila}: {e.error}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-center text-sm text-emerald-600 dark:text-emerald-400">
            Todos los registros se importaron correctamente.
          </p>
        )}
      </div>

      <DialogFooter>
        {hayErrores && (
          <Button type="button" variant="outline" className="min-h-11" onClick={() => downloadErrores(errores)}>
            <Download className="size-4" />
            Descargar errores
          </Button>
        )}
        <Button type="button" className="min-h-11" onClick={onClose}>Listo</Button>
      </DialogFooter>
    </>
  )
}
