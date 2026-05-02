"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createCampana } from "@/services/assessment"
import type { Campana, CampanaCreate, TipoEval } from "@/types/assessment"

interface CampanaModalProps {
  open: boolean
  onClose: () => void
  onCreated: (campana: Campana) => void
}

const TIPOS: { value: TipoEval; label: string }[] = [
  { value: "completo",   label: "Completo (AREAS + Cognitivo + Técnico)" },
  { value: "conductual", label: "Conductual (AREAS)" },
  { value: "cognitivo",  label: "Cognitivo" },
]

export function CampanaModal({ open, onClose, onCreated }: CampanaModalProps) {
  const [nombre, setNombre] = useState("")
  const [tipo, setTipo]     = useState<TipoEval>("completo")
  const [error, setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function handleClose() {
    setNombre("")
    setTipo("completo")
    setError(null)
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) {
      setError("El nombre es obligatorio.")
      return
    }
    setError(null)
    setLoading(true)
    try {
      const data: CampanaCreate = { nombre: nombre.trim(), tipo }
      const campana = await createCampana(data)
      onCreated(campana)
      handleClose()
    } catch {
      setError("No se pudo crear la campaña. Intentá de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva campaña de assessment</DialogTitle>
        </DialogHeader>

        <form id="campana-form" onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="campana-nombre">Nombre</Label>
            <Input
              id="campana-nombre"
              value={nombre}
              onChange={(e) => { setNombre(e.target.value); setError(null) }}
              placeholder="Ej. Assessment Q2 2025"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="campana-tipo">Tipo de evaluación</Label>
            <select
              id="campana-tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoEval)}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {TIPOS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}
        </form>

        <DialogFooter>
          <Button variant="outline" className="min-h-11" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" form="campana-form" className="min-h-11" disabled={loading}>
            {loading ? "Creando…" : "Crear campaña"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
