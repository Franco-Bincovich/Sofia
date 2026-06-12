"use client"

import { useCallback, useEffect, useState } from "react"
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, GripVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  addCriterio, createPlantilla, deleteCriterio, deletePlantilla,
  fetchPlantillas, updateCriterio, updatePlantilla,
} from "@/services/evaluacionesService"
import type { Criterio, Plantilla, PlantillaCreate } from "@/types/evaluaciones"

// ── Formulario de plantilla ───────────────────────────────────────────────────

const EMPTY: PlantillaCreate = {
  empresa_id: "", nombre: "", tipo_escala: "numerica",
  escala_min: 1, escala_max: 10,
}

interface PlantillaFormProps {
  initial?: Plantilla | null
  onClose: () => void
  onSaved: () => void
}

function PlantillaForm({ initial, onClose, onSaved }: PlantillaFormProps) {
  const [form, setForm] = useState<PlantillaCreate>(
    initial
      ? {
          empresa_id: initial.empresa_id, nombre: initial.nombre,
          descripcion: initial.descripcion ?? undefined,
          tipo_escala: initial.tipo_escala,
          escala_min: initial.escala_min ?? 1, escala_max: initial.escala_max ?? 10,
          opciones_cualitativas: initial.opciones_cualitativas ?? undefined,
        }
      : EMPTY,
  )
  const [opcionesRaw, setOpcionesRaw] = useState(
    (initial?.opciones_cualitativas ?? []).join(", "),
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const set = (k: keyof PlantillaCreate, v: unknown) =>
    setForm((p) => ({ ...p, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!form.nombre.trim()) { setError("El nombre es requerido"); return }
    if (!form.empresa_id) { setError("Empresa requerida"); return }
    if (form.tipo_escala === "cualitativa") {
      const opts = opcionesRaw.split(",").map((o) => o.trim()).filter(Boolean)
      if (opts.length < 2) { setError("Ingresá al menos 2 opciones separadas por coma"); return }
      form.opciones_cualitativas = opts
    }
    setLoading(true)
    try {
      if (initial) {
        await updatePlantilla(initial.id, form)
      } else {
        await createPlantilla(form)
      }
      onSaved()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al guardar")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="nombre">Nombre *</Label>
          <Input id="nombre" value={form.nombre} onChange={(e) => set("nombre", e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="empresa_id">Empresa ID *</Label>
          <Input id="empresa_id" value={form.empresa_id} onChange={(e) => set("empresa_id", e.target.value)}
            placeholder="UUID de la empresa" />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="descripcion">Descripción</Label>
        <Input id="descripcion" value={form.descripcion ?? ""} onChange={(e) => set("descripcion", e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="tipo_escala">Tipo de escala</Label>
        <select id="tipo_escala" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={form.tipo_escala}
          onChange={(e) => set("tipo_escala", e.target.value as "numerica" | "cualitativa")}>
          <option value="numerica">Numérica</option>
          <option value="cualitativa">Cualitativa</option>
        </select>
      </div>
      {form.tipo_escala === "numerica" && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="escala_min">Mínimo</Label>
            <Input id="escala_min" type="number" value={form.escala_min ?? 1}
              onChange={(e) => set("escala_min", Number(e.target.value))} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="escala_max">Máximo</Label>
            <Input id="escala_max" type="number" value={form.escala_max ?? 10}
              onChange={(e) => set("escala_max", Number(e.target.value))} />
          </div>
        </div>
      )}
      {form.tipo_escala === "cualitativa" && (
        <div className="space-y-1">
          <Label htmlFor="opciones">Opciones (separadas por coma)</Label>
          <Input id="opciones" value={opcionesRaw}
            onChange={(e) => setOpcionesRaw(e.target.value)}
            placeholder="No cumple, Cumple, Supera" />
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={loading}>{loading ? "Guardando…" : "Guardar"}</Button>
      </DialogFooter>
    </form>
  )
}

// ── Panel de criterios ────────────────────────────────────────────────────────

interface CriteriosProps { plantilla: Plantilla; onRefresh: () => void }

function CriteriosPanel({ plantilla, onRefresh }: CriteriosProps) {
  const [nombre, setNombre] = useState("")
  const [peso, setPeso] = useState("1")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) return
    setLoading(true)
    setError("")
    try {
      const maxOrden = plantilla.criterios.length > 0
        ? Math.max(...plantilla.criterios.map((c) => c.orden)) : 0
      await addCriterio(plantilla.id, { nombre: nombre.trim(), peso: Number(peso), orden: maxOrden + 1 })
      setNombre("")
      setPeso("1")
      onRefresh()
    } catch { setError("Error al agregar criterio") }
    finally { setLoading(false) }
  }

  async function handleDelete(criterio: Criterio) {
    if (!confirm(`¿Eliminar "${criterio.nombre}"?`)) return
    await deleteCriterio(plantilla.id, criterio.id)
    onRefresh()
  }

  return (
    <div className="mt-2 rounded-md border border-dashed border-border bg-muted/30 p-3">
      <p className="mb-2 text-xs font-medium text-muted-foreground">Criterios</p>
      {plantilla.criterios.length === 0 && (
        <p className="mb-2 text-xs text-muted-foreground">Sin criterios aún.</p>
      )}
      <ul className="mb-3 space-y-1">
        {[...plantilla.criterios].sort((a, b) => a.orden - b.orden).map((c) => (
          <li key={c.id} className="flex items-center justify-between rounded px-2 py-1 text-sm hover:bg-muted">
            <span className="flex items-center gap-2">
              <GripVertical className="size-3 text-muted-foreground" />
              {c.nombre}
              <span className="text-xs text-muted-foreground">peso: {c.peso}</span>
            </span>
            <button onClick={() => handleDelete(c)} className="text-destructive hover:opacity-70">
              <Trash2 className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={handleAdd} className="flex gap-2">
        <Input placeholder="Nuevo criterio" value={nombre} onChange={(e) => setNombre(e.target.value)} className="h-8 text-sm" />
        <Input placeholder="Peso" type="number" value={peso} onChange={(e) => setPeso(e.target.value)} className="h-8 w-20 text-sm" />
        <Button type="submit" size="sm" disabled={loading || !nombre.trim()}>Agregar</Button>
      </form>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  )
}

// ── Tab principal ─────────────────────────────────────────────────────────────

export function PlantillasTab() {
  const [plantillas, setPlantillas] = useState<Plantilla[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Plantilla | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetchPlantillas(false)
      setPlantillas(res.items)
    } catch { setError("No se pudieron cargar las plantillas") }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])

  async function handleDelete(p: Plantilla) {
    if (!confirm(`¿Eliminar/desactivar "${p.nombre}"?`)) return
    await deletePlantilla(p.id)
    void load()
  }

  if (loading) return <div className="py-12 text-center text-muted-foreground">Cargando plantillas…</div>
  if (error) return <div className="py-12 text-center text-destructive">{error}</div>

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => { setEditing(null); setModalOpen(true) }} size="sm">
          <Plus className="mr-2 size-4" /> Nueva plantilla
        </Button>
      </div>
      {plantillas.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">No hay plantillas aún.</div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Nombre</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Escala</TableHead>
                <TableHead>Criterios</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {plantillas.map((p) => (
                <>
                  <TableRow key={p.id}>
                    <TableCell>
                      <button onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                        className="text-muted-foreground hover:text-foreground">
                        {expanded === p.id ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                      </button>
                    </TableCell>
                    <TableCell className="font-medium">{p.nombre}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.empresa_nombre}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{p.tipo_escala === "numerica"
                        ? `${p.escala_min}–${p.escala_max}` : "Cualitativa"}</Badge>
                    </TableCell>
                    <TableCell>{p.criterios.length}</TableCell>
                    <TableCell>
                      <Badge variant={p.activa ? "default" : "secondary"}>
                        {p.activa ? "Activa" : "Inactiva"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon"
                          onClick={() => { setEditing(p); setModalOpen(true) }}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(p)}>
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {expanded === p.id && (
                    <TableRow key={`${p.id}-criterios`}>
                      <TableCell colSpan={7} className="bg-muted/20 py-0 pl-10 pr-4 pb-3">
                        <CriteriosPanel plantilla={p} onRefresh={load} />
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar plantilla" : "Nueva plantilla"}</DialogTitle>
          </DialogHeader>
          <PlantillaForm
            initial={editing}
            onClose={() => setModalOpen(false)}
            onSaved={() => { setModalOpen(false); void load() }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
