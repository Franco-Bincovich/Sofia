"use client"

import { useCallback, useEffect, useState } from "react"
import { Plus, Lock, Users } from "lucide-react"
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
  cerrarCiclo, createCiclo, createInstancia, fetchCiclos, fetchPlantillas,
} from "@/services/evaluacionesService"
import { apiFetch } from "@/services/api"
import type { Ciclo, CicloCreate } from "@/types/evaluaciones"
import type { Empleado } from "@/types/empleado"

// ── Formulario de ciclo ───────────────────────────────────────────────────────

interface CicloFormProps { onClose: () => void; onSaved: () => void }

function CicloForm({ onClose, onSaved }: CicloFormProps) {
  const [form, setForm] = useState<CicloCreate>({
    plantilla_id: "", nombre: "", fecha_inicio: "", fecha_fin: "",
  })
  const [plantillas, setPlantillas] = useState<{ id: string; nombre: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchPlantillas().then((r) => setPlantillas(r.items)).catch(() => {})
  }, [])

  const set = (k: keyof CicloCreate, v: string) => setForm((p) => ({ ...p, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!form.nombre.trim() || !form.plantilla_id || !form.fecha_inicio || !form.fecha_fin) {
      setError("Todos los campos son requeridos")
      return
    }
    setLoading(true)
    try {
      await createCiclo(form)
      onSaved()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al guardar")
    } finally { setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="nombre_ciclo">Nombre del ciclo *</Label>
        <Input id="nombre_ciclo" value={form.nombre} onChange={(e) => set("nombre", e.target.value)}
          placeholder="Ej. Evaluación Q2 2026" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="plantilla_id">Plantilla *</Label>
        <select id="plantilla_id"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={form.plantilla_id} onChange={(e) => set("plantilla_id", e.target.value)}>
          <option value="">Seleccioná una plantilla</option>
          {plantillas.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="fecha_inicio">Fecha inicio *</Label>
          <Input id="fecha_inicio" type="date" value={form.fecha_inicio}
            onChange={(e) => set("fecha_inicio", e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="fecha_fin">Fecha fin *</Label>
          <Input id="fecha_fin" type="date" value={form.fecha_fin}
            onChange={(e) => set("fecha_fin", e.target.value)} />
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={loading}>{loading ? "Guardando…" : "Crear ciclo"}</Button>
      </DialogFooter>
    </form>
  )
}

// ── Modal asignar empleados ───────────────────────────────────────────────────

interface AsignarProps { ciclo: Ciclo; onClose: () => void; onSaved: () => void }

function AsignarEmpleadosModal({ ciclo, onClose, onSaved }: AsignarProps) {
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [busqueda, setBusqueda] = useState("")
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    setLoading(true)
    apiFetch<{ items: Empleado[] }>("/api/empleados?page_size=100&estado=activo")
      .then((r) => setEmpleados(r.items))
      .catch(() => setError("No se pudieron cargar los empleados"))
      .finally(() => setLoading(false))
  }, [])

  const filtered = empleados.filter((e) =>
    `${e.nombre} ${e.apellido}`.toLowerCase().includes(busqueda.toLowerCase()),
  )

  const toggle = (id: string) =>
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])

  async function handleAsignar() {
    setSaving(true)
    setError("")
    const errors: string[] = []
    for (const empleado_id of selected) {
      try {
        await createInstancia({ ciclo_id: ciclo.id, empleado_id })
      } catch (err: unknown) {
        if (err instanceof Error && !err.message.includes("INSTANCIA_DUPLICADA")) {
          errors.push(err.message)
        }
      }
    }
    setSaving(false)
    if (errors.length > 0) {
      setError(`Algunos errores: ${errors.join("; ")}`)
    } else {
      onSaved()
    }
  }

  return (
    <div className="space-y-4">
      <Input placeholder="Buscar empleado…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
      {loading ? (
        <p className="py-4 text-center text-sm text-muted-foreground">Cargando empleados…</p>
      ) : (
        <div className="max-h-64 overflow-y-auto rounded-md border">
          {filtered.map((e) => (
            <label key={e.id}
              className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-muted">
              <input type="checkbox" className="size-4"
                checked={selected.includes(e.id)} onChange={() => toggle(e.id)} />
              <span className="text-sm">{e.nombre} {e.apellido}</span>
              <span className="ml-auto text-xs text-muted-foreground">{e.area_nombre}</span>
            </label>
          ))}
          {filtered.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">Sin resultados</p>
          )}
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={handleAsignar} disabled={saving || selected.length === 0}>
          {saving ? "Asignando…" : `Asignar ${selected.length} empleado${selected.length !== 1 ? "s" : ""}`}
        </Button>
      </DialogFooter>
    </div>
  )
}

// ── Tab principal ─────────────────────────────────────────────────────────────

export function CiclosTab() {
  const [ciclos, setCiclos] = useState<Ciclo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [modalNuevo, setModalNuevo] = useState(false)
  const [asignandoCiclo, setAsignandoCiclo] = useState<Ciclo | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetchCiclos()
      setCiclos(res.items)
    } catch { setError("No se pudieron cargar los ciclos") }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])

  async function handleCerrar(ciclo: Ciclo) {
    if (!confirm(`¿Cerrar el ciclo "${ciclo.nombre}"? Esta acción es irreversible.`)) return
    await cerrarCiclo(ciclo.id)
    void load()
  }

  if (loading) return <div className="py-12 text-center text-muted-foreground">Cargando ciclos…</div>
  if (error) return <div className="py-12 text-center text-destructive">{error}</div>

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setModalNuevo(true)} size="sm">
          <Plus className="mr-2 size-4" /> Nuevo ciclo
        </Button>
      </div>
      {ciclos.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">No hay ciclos aún.</div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Plantilla</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Instancias</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-32" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {ciclos.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nombre}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.plantilla_nombre}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.empresa_nombre}</TableCell>
                  <TableCell className="text-sm">{c.fecha_inicio} → {c.fecha_fin}</TableCell>
                  <TableCell>{c.total_instancias}</TableCell>
                  <TableCell>
                    <Badge variant={c.estado === "abierto" ? "default" : "secondary"}>
                      {c.estado === "abierto" ? "Abierto" : "Cerrado"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {c.estado === "abierto" && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => setAsignandoCiclo(c)}>
                            <Users className="mr-1 size-3.5" /> Asignar
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleCerrar(c)}
                            title="Cerrar ciclo">
                            <Lock className="size-4 text-muted-foreground" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={modalNuevo} onOpenChange={setModalNuevo}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Nuevo ciclo de evaluación</DialogTitle></DialogHeader>
          <CicloForm onClose={() => setModalNuevo(false)} onSaved={() => { setModalNuevo(false); void load() }} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!asignandoCiclo} onOpenChange={(o) => !o && setAsignandoCiclo(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Asignar empleados — {asignandoCiclo?.nombre}</DialogTitle>
          </DialogHeader>
          {asignandoCiclo && (
            <AsignarEmpleadosModal
              ciclo={asignandoCiclo}
              onClose={() => setAsignandoCiclo(null)}
              onSaved={() => { setAsignandoCiclo(null); void load() }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
