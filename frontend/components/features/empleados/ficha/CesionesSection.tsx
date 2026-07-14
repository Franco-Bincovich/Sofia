"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Pencil, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { Section } from "@/components/features/empleados/ficha/_primitives"
import { CesionModal } from "@/components/features/empleados/ficha/CesionModal"
import { eliminarCesion, fetchCesiones } from "@/services/cesiones"
import { useCanWrite } from "@/hooks/useCanWrite"
import type { Cesion } from "@/types/cesion"

/**
 * Sección autoabastecida de cesiones del empleado (legajo). Lista + agregar/editar/borrar.
 * Reusa el patrón de AdjuntosSection: fetch propio, gating por permiso, modal + ConfirmDialog.
 */
export function CesionesSection({ empleadoId }: { empleadoId: string }) {
  const [cesiones, setCesiones] = useState<Cesion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<Cesion | null>(null)
  const [aBorrar, setABorrar] = useState<Cesion | null>(null)
  const [borrando, setBorrando] = useState(false)
  const canWrite = useCanWrite()

  const recargar = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      setCesiones((await fetchCesiones(empleadoId)).items)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [empleadoId])

  useEffect(() => {
    if (empleadoId) void recargar()
  }, [empleadoId, recargar])

  async function confirmarBorrado() {
    if (!aBorrar) return
    setBorrando(true)
    try {
      await eliminarCesion(aBorrar.id)
      toast.success("Cesión eliminada")
      setABorrar(null)
      await recargar()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "No se pudo eliminar la cesión.")
    } finally {
      setBorrando(false)
    }
  }

  return (
    <Section title="Cesiones">
      <div className="col-span-full space-y-3">
        {canWrite && (
          <Button
            variant="outline"
            className="min-h-11 gap-1.5"
            onClick={() => { setEditando(null); setModalOpen(true) }}
          >
            <Plus className="size-4" /> Agregar cesión
          </Button>
        )}

        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : error ? (
          <p className="text-sm text-muted-foreground">No se pudieron cargar las cesiones.</p>
        ) : cesiones.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin cesiones registradas.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {cesiones.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{c.empresa_cesion}</p>
                  <p className="text-xs text-muted-foreground">{c.fecha}</p>
                </div>
                {canWrite && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      className="min-h-11 gap-1.5"
                      onClick={() => { setEditando(c); setModalOpen(true) }}
                    >
                      <Pencil className="size-4" /> Editar
                    </Button>
                    <Button
                      variant="ghost"
                      className="min-h-11 gap-1.5 text-destructive hover:text-destructive"
                      onClick={() => setABorrar(c)}
                      aria-label={`Eliminar cesión ${c.empresa_cesion}`}
                    >
                      <Trash2 className="size-4" /> Eliminar
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        <CesionModal
          open={modalOpen}
          empleadoId={empleadoId}
          cesion={editando}
          onClose={() => setModalOpen(false)}
          onSuccess={() => { setModalOpen(false); void recargar() }}
        />
        <ConfirmDialog
          open={!!aBorrar}
          onClose={() => setABorrar(null)}
          onConfirm={confirmarBorrado}
          title="Eliminar cesión"
          description={aBorrar ? `¿Eliminar la cesión de "${aBorrar.empresa_cesion}"? Esta acción no se puede deshacer.` : ""}
          confirmLabel="Eliminar"
          loading={borrando}
        />
      </div>
    </Section>
  )
}
