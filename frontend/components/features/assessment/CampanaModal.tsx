"use client"

import { useEffect, useState } from "react"

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
import { fetchAreas } from "@/services/areas"
import { createCampana } from "@/services/assessment"
import type { Area } from "@/types/area"
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

const SELECT_CLASS =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none " +
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

export function CampanaModal({ open, onClose, onCreated }: CampanaModalProps) {
  const [nombre, setNombre]               = useState("")
  const [tipo, setTipo]                   = useState<TipoEval>("completo")
  const [areaId, setAreaId]               = useState<string>("")
  const [posicionObjetivo, setPosicion]   = useState("")
  const [areas, setAreas]                 = useState<Area[]>([])
  const [error, setError]                 = useState<string | null>(null)
  const [loading, setLoading]             = useState(false)

  useEffect(() => {
    if (open) {
      fetchAreas()
        .then(setAreas)
        .catch(() => setAreas([]))
    }
  }, [open])

  function handleClose() {
    setNombre("")
    setTipo("completo")
    setAreaId("")
    setPosicion("")
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
      const data: CampanaCreate = {
        nombre: nombre.trim(),
        tipo,
        ...(areaId && { area_id: areaId }),
        ...(posicionObjetivo.trim() && { posicion_objetivo: posicionObjetivo.trim() }),
      }
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
              className={SELECT_CLASS}
            >
              {TIPOS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="campana-area">Área <span className="text-muted-foreground">(opcional)</span></Label>
            <select
              id="campana-area"
              value={areaId}
              onChange={(e) => setAreaId(e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="">Sin área específica</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>{a.nombre}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="campana-posicion">
              Posición objetivo <span className="text-muted-foreground">(opcional)</span>
            </Label>
            <Input
              id="campana-posicion"
              value={posicionObjetivo}
              onChange={(e) => setPosicion(e.target.value)}
              placeholder="Ej. Tech Lead, Product Manager…"
            />
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
