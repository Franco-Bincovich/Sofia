"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { getEmpresaActivaId } from "@/services/empresaStore"
import { deleteLoteEvaluacion, fetchEvaluadosResultados } from "@/services/evaluacionReportes"

interface Props {
  loteId: string
  periodo: string
  onEliminado: () => void
}

// El backend exige empresa concreta (en consolidado devuelve 400): sin empresa activa el
// botón se deshabilita y explica por qué, en vez de dejar que falle al confirmar.
const SIN_EMPRESA = "Seleccioná una empresa para poder eliminar"

/** Botón destructivo + confirmación para eliminar una importación completa de evaluaciones.
 *  El CASCADE se lleva evaluados y resultados; las equivalencias de nombres se conservan. */
export function EliminarLoteButton({ loteId, periodo, onEliminado }: Props) {
  const [empresaActivaId] = useState<string | null>(() => getEmpresaActivaId())
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [evaluados, setEvaluados] = useState(0)

  // Cuántos registros se pierden — el listado del lote es la única fuente del total.
  useEffect(() => {
    fetchEvaluadosResultados(loteId)
      .then((r) => setEvaluados(r.total))
      .catch(() => setEvaluados(0))
  }, [loteId])

  async function confirmar() {
    setDeleting(true)
    try {
      await deleteLoteEvaluacion(loteId)
      toast.success("Importación eliminada")
      setOpen(false)
      onEliminado()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo eliminar la importación.")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <Button
        variant="destructive"
        className="min-h-11 gap-2"
        disabled={!empresaActivaId}
        title={empresaActivaId ? undefined : SIN_EMPRESA}
        onClick={() => setOpen(true)}
      >
        <Trash2 className="size-4" /> Eliminar importación
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={confirmar}
        title="Eliminar importación"
        description={`Vas a eliminar la importación del período ${periodo}: ${evaluados} evaluados y todos sus resultados. Esta acción no se puede deshacer. Las equivalencias de nombres confirmadas se conservan y se van a volver a aplicar si reimportás.`}
        confirmLabel="Sí, eliminar importación"
        cancelLabel="Cancelar"
        loading={deleting}
      />
    </>
  )
}
