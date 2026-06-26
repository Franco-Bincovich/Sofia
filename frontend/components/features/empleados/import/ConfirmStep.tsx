"use client"

import { CheckCircle2, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DialogFooter } from "@/components/ui/dialog"

export interface ConfirmStepProps {
  newCount: number
  updateCount: number
  empresaNombre: string
  confirming: boolean
  error: string
  onCancel: () => void
  onBack: () => void
  onConfirm: () => void
}

/** Pantalla de confirmación previa: resumen de lo que se aplicará al confirmar. */
export function ConfirmStep({
  newCount, updateCount, empresaNombre, confirming, error, onCancel, onBack, onConfirm,
}: ConfirmStepProps) {
  return (
    <>
      <div className="py-8 text-center">
        <CheckCircle2 className="mx-auto mb-4 size-12 text-emerald-500" />
        <p className="text-lg font-semibold text-foreground">
          {newCount > 0 && `${newCount} alta${newCount !== 1 ? "s" : ""} nueva${newCount !== 1 ? "s" : ""}`}
          {newCount > 0 && updateCount > 0 && " · "}
          {updateCount > 0 && `${updateCount} actualización${updateCount !== 1 ? "es" : ""}`}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">Empresa: <strong>{empresaNombre}</strong></p>
        <p className="mt-1 text-sm text-muted-foreground">
          Los empleados nuevos se crearán con estado "activo". Los existentes (identificados por DNI)
          se actualizarán con los datos del CSV.
        </p>
      </div>

      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

      <DialogFooter>
        <Button type="button" variant="outline" className="min-h-11" onClick={onCancel} disabled={confirming}>
          Cancelar
        </Button>
        <Button type="button" variant="outline" className="min-h-11" onClick={onBack} disabled={confirming}>
          Volver
        </Button>
        <Button type="button" className="min-h-11" disabled={confirming} onClick={onConfirm}>
          {confirming ? (<><Loader2 className="size-4 animate-spin" />Importando...</>) : "Sí, importar"}
        </Button>
      </DialogFooter>
    </>
  )
}
