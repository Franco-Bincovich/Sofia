"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { deleteVacante } from "@/services/vacantes"

interface Props {
  vacanteId: string
  titulo: string
}

/** Botón destructivo + confirmación para eliminar la vacante y sus imágenes. Autocontenido. */
export function EliminarVacanteButton({ vacanteId, titulo }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function confirmar() {
    setDeleting(true)
    try {
      await deleteVacante(vacanteId)
      toast.success("Vacante eliminada")
      router.replace("/vacantes")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo eliminar la vacante.")
      setDeleting(false)
    }
  }

  return (
    <>
      <Button variant="destructive" className="min-h-11 gap-2" onClick={() => setOpen(true)}>
        <Trash2 className="size-4" /> Eliminar vacante
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={confirmar}
        title="Eliminar vacante"
        description={`Se eliminarán la vacante "${titulo}" y sus imágenes. Los candidatos que hayan aplicado se conservan en la sección Candidatos bajo el nombre de esta búsqueda. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        loading={deleting}
      />
    </>
  )
}
