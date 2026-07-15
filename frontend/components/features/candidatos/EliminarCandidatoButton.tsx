"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { deleteCandidato } from "@/services/candidatos"
import type { CandidatoConGrupo } from "@/types/candidato"

interface Props {
  candidato: CandidatoConGrupo
  onDeleted: () => void
}

/** Botón + confirmación para eliminar un candidato huérfano (y su CV). Autocontenido. */
export function EliminarCandidatoButton({ candidato, onDeleted }: Props) {
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function confirmar() {
    setDeleting(true)
    try {
      await deleteCandidato(candidato.id)
      toast.success("Candidato eliminado")
      setOpen(false)
      onDeleted()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo eliminar el candidato.")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <Button variant="destructive" className="gap-2" onClick={() => setOpen(true)}>
        <Trash2 className="size-4" /> Eliminar candidato
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={confirmar}
        title="Eliminar candidato"
        description={`Se eliminará a ${candidato.nombre} ${candidato.apellido} y su CV de forma permanente. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        loading={deleting}
      />
    </>
  )
}
