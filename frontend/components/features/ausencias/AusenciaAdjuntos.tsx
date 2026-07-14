"use client"

import { Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { FileUpload } from "@/components/features/adjuntos/FileUpload"
import { AdjuntosSection } from "@/components/features/adjuntos/AdjuntosSection"

/** Tamaño legible (bytes → KB/MB). */
function tamanoLegible(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface Props {
  isEditing: boolean
  ausenciaId?: string
  pendientes: File[]
  onPendientesChange: (files: File[]) => void
  disabled?: boolean
}

/**
 * Adjuntos del modal de ausencia. En EDICIÓN el registro ya existe → sube directo
 * reusando <AdjuntosSection>. En ALTA el registro todavía no existe → acumula archivos
 * en memoria (adjuntar diferido); el modal los sube tras crear la ausencia con el id
 * nuevo. Reusa <FileUpload> (mismo picker y validación cliente que el alta directa).
 */
export function AusenciaAdjuntos({
  isEditing, ausenciaId, pendientes, onPendientesChange, disabled = false,
}: Props) {
  if (isEditing && ausenciaId) {
    return <AdjuntosSection entidad="ausencia" entidadId={ausenciaId} />
  }
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-foreground">Documentos</span>
      <FileUpload
        onUpload={async (file) => onPendientesChange([...pendientes, file])}
        label="Agregar documento"
        disabled={disabled}
      />
      {pendientes.length > 0 && (
        <ul className="divide-y rounded-lg border">
          {pendientes.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-2 p-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm text-foreground">{f.name}</p>
                <p className="text-xs text-muted-foreground">{tamanoLegible(f.size)}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => onPendientesChange(pendientes.filter((_, idx) => idx !== i))}
                disabled={disabled}
                aria-label={`Quitar ${f.name}`}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
