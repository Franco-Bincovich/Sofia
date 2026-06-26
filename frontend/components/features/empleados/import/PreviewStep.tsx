"use client"

import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DialogFooter } from "@/components/ui/dialog"
import type { ImportacionPreview } from "@/types/importacion"

export interface PreviewStepProps {
  preview: ImportacionPreview
  empresaNombre: string
  onCancel: () => void
  onBack: () => void
  onContinue: () => void
}

/** Paso 2: vista previa con altas/actualizaciones/errores antes de confirmar. */
export function PreviewStep({ preview, empresaNombre, onCancel, onBack, onContinue }: PreviewStepProps) {
  const validCount = preview.filas_validas.length
  const errorCount = preview.errores.length
  const updateCount = preview.filas_validas.filter((f) => f.es_actualizacion).length
  const newCount = validCount - updateCount

  return (
    <>
      <div className="space-y-3 py-2">
        <div className="flex flex-wrap gap-4 text-sm">
          {newCount > 0 && (
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-4" />
              {newCount} alta{newCount !== 1 ? "s" : ""} nueva{newCount !== 1 ? "s" : ""}
            </span>
          )}
          {updateCount > 0 && (
            <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="size-4" />
              {updateCount} actualización{updateCount !== 1 ? "es" : ""} (DNI ya existe)
            </span>
          )}
          {errorCount > 0 && (
            <span className="flex items-center gap-1.5 text-destructive">
              <XCircle className="size-4" />
              {errorCount} error{errorCount !== 1 ? "es" : ""}
            </span>
          )}
        </div>

        {updateCount > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            Las filas marcadas con <strong>Actualizará</strong> tienen un DNI ya registrado en <strong>{empresaNombre}</strong>.
            Al confirmar, los datos del empleado existente se sobrescribirán con los del CSV.
          </div>
        )}

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Fila</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Estado</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Nombre</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">DNI</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Email</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Área</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Cargo</th>
              </tr>
            </thead>
            <tbody>
              {preview.filas_validas.map((fila) => (
                <tr key={`v-${fila.fila}`} className={["border-b last:border-0", fila.es_actualizacion ? "bg-amber-500/5" : "bg-emerald-500/5"].join(" ")}>
                  <td className="px-3 py-2 text-muted-foreground">{fila.fila}</td>
                  <td className="px-3 py-2">
                    {fila.es_actualizacion ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="size-3.5" />Actualizará
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="size-3.5" />Alta nueva
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-medium">{fila.nombre} {fila.apellido}</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{fila.dni}</td>
                  <td className="px-3 py-2 text-muted-foreground">{fila.email_corporativo}</td>
                  <td className="px-3 py-2 text-muted-foreground">{fila.area_nombre}</td>
                  <td className="px-3 py-2 text-muted-foreground">{fila.cargo}</td>
                </tr>
              ))}
              {preview.errores.map((err, idx) => (
                <tr key={`e-${err.fila}-${idx}`} className="border-b bg-destructive/5 last:border-0">
                  <td className="px-3 py-2 text-muted-foreground">{err.fila}</td>
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-1 text-xs font-medium text-destructive">
                      <XCircle className="size-3.5" />Error
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-destructive" colSpan={5}>{err.error}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" className="min-h-11" onClick={onCancel}>Cancelar</Button>
        <Button type="button" variant="outline" className="min-h-11" onClick={onBack}>Volver</Button>
        <Button type="button" className="min-h-11" disabled={validCount === 0} onClick={onContinue}>
          Confirmar {validCount} operación{validCount !== 1 ? "es" : ""}
        </Button>
      </DialogFooter>
    </>
  )
}
