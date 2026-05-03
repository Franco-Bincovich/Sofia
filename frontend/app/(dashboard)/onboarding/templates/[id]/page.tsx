"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Check, Pencil, Plus, Trash2, X } from "lucide-react"

import { ErrorState } from "@/components/ui/ErrorState"
import {
  addTarea,
  deleteTarea,
  fetchTemplate,
  updateTarea,
  updateTemplate,
} from "@/services/onboarding"
import type { OnboardingTemplate, TemplateTarea } from "@/types/onboarding"

const SEMANAS = [1, 2, 3, 4] as const
type Semana = 1 | 2 | 3 | 4

// ─── InlineEdit ────────────────────────────────────────────────────────────────

interface InlineEditProps {
  value: string
  onSave: (v: string) => Promise<void>
  className?: string
  multiline?: boolean
  placeholder?: string
}

function InlineEdit({ value, onSave, className = "", multiline = false, placeholder }: InlineEditProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  async function handleSave() {
    if (saving || draft === value) { setEditing(false); return }
    setSaving(true)
    try {
      await onSave(draft)
    } finally {
      setSaving(false)
      setEditing(false)
    }
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => { setDraft(value); setEditing(true) }}
        className={`group flex items-start gap-1.5 text-left ${className}`}
        title="Clic para editar"
      >
        <span>{value || <span className="text-muted-foreground italic">{placeholder}</span>}</span>
        <Pencil className="mt-0.5 size-3.5 shrink-0 opacity-0 group-hover:opacity-60 transition-opacity" />
      </button>
    )
  }

  const sharedClass =
    "w-full rounded-lg border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"

  return (
    <div className="flex items-start gap-2">
      {multiline ? (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          className={`${sharedClass} ${className}`}
          onKeyDown={(e) => { if (e.key === "Escape") setEditing(false) }}
        />
      ) : (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className={`${sharedClass} ${className}`}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave()
            if (e.key === "Escape") setEditing(false)
          }}
        />
      )}
      <div className="mt-1 flex shrink-0 gap-1">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          aria-label="Guardar"
          className="flex min-h-8 min-w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Check className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          aria-label="Cancelar"
          className="flex min-h-8 min-w-8 items-center justify-center rounded-lg border hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  )
}

// ─── AddTareaForm ──────────────────────────────────────────────────────────────

interface AddTareaFormProps {
  templateId: string
  semana: Semana
  nextOrden: number
  onAdded: (t: TemplateTarea) => void
  onCancel: () => void
}

function AddTareaForm({ templateId, semana, nextOrden, onAdded, onCancel }: AddTareaFormProps) {
  const [titulo, setTitulo] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAdd() {
    if (!titulo.trim() || saving) return
    setSaving(true)
    setError(null)
    try {
      const t = await addTarea(templateId, {
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || undefined,
        semana,
        orden: nextOrden,
      })
      onAdded(t)
    } catch {
      setError("No se pudo agregar la tarea.")
      setSaving(false)
    }
  }

  return (
    <div className="mt-2 rounded-lg border bg-muted/30 p-3 space-y-2">
      <input
        type="text"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        placeholder="Título de la tarea"
        autoFocus
        className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") onCancel() }}
      />
      <textarea
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        placeholder="Descripción (opcional)"
        rows={2}
        className="w-full rounded-lg border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleAdd}
          disabled={!titulo.trim() || saving}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {saving ? "Agregando…" : "Agregar tarea"}
        </button>
      </div>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function TemplateDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [template, setTemplate] = useState<OnboardingTemplate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addingSemana, setAddingSemana] = useState<Semana | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    fetchTemplate(id)
      .then(setTemplate)
      .catch(() => setError("No se pudo cargar el template"))
      .finally(() => setLoading(false))
  }, [id])

  async function handleSaveNombre(nombre: string) {
    const updated = await updateTemplate(id, { nombre })
    setTemplate((prev) => prev ? { ...prev, nombre: updated.nombre } : prev)
  }

  async function handleSaveDescripcion(descripcion: string) {
    const updated = await updateTemplate(id, { descripcion })
    setTemplate((prev) => prev ? { ...prev, descripcion: updated.descripcion } : prev)
  }

  async function handleSaveTareaTitulo(tareaId: string, titulo: string) {
    const updated = await updateTarea(id, tareaId, { titulo })
    setTemplate((prev) =>
      prev ? { ...prev, tareas: prev.tareas.map((t) => t.id === tareaId ? { ...t, titulo: updated.titulo } : t) } : prev
    )
  }

  async function handleSaveTareaDesc(tareaId: string, descripcion: string) {
    const updated = await updateTarea(id, tareaId, { descripcion })
    setTemplate((prev) =>
      prev ? { ...prev, tareas: prev.tareas.map((t) => t.id === tareaId ? { ...t, descripcion: updated.descripcion } : t) } : prev
    )
  }

  async function handleDeleteTarea(tareaId: string) {
    if (!confirm("¿Eliminar esta tarea del template?")) return
    setDeletingId(tareaId)
    try {
      await deleteTarea(id, tareaId)
      setTemplate((prev) =>
        prev
          ? { ...prev, tareas: prev.tareas.filter((t) => t.id !== tareaId), tareas_total: prev.tareas_total - 1 }
          : prev
      )
    } catch {
      alert("No se pudo eliminar la tarea.")
    } finally {
      setDeletingId(null)
    }
  }

  function handleTareaAdded(semana: Semana, tarea: TemplateTarea) {
    setTemplate((prev) =>
      prev
        ? { ...prev, tareas: [...prev.tareas, tarea], tareas_total: prev.tareas_total + 1 }
        : prev
    )
    setAddingSemana(null)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="h-4 w-72 animate-pulse rounded-lg bg-muted" />
        {[1, 2].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    )
  }

  if (error || !template) {
    return <ErrorState message={error ?? "Template no encontrado"} />
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => router.push("/onboarding/templates")}
          className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        >
          <ArrowLeft className="size-4" />
          Volver a templates
        </button>

        <InlineEdit
          value={template.nombre}
          onSave={handleSaveNombre}
          className="text-2xl font-semibold tracking-tight text-foreground"
          placeholder="Nombre del template"
        />
        <div className="mt-1">
          <InlineEdit
            value={template.descripcion ?? ""}
            onSave={handleSaveDescripcion}
            className="text-sm text-muted-foreground"
            multiline
            placeholder="Agregar descripción…"
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {template.tareas_total} tarea{template.tareas_total !== 1 ? "s" : ""} en total
        </p>
      </div>

      {/* Semanas */}
      <div className="space-y-6">
        {SEMANAS.map((semana) => {
          const tareas = template.tareas
            .filter((t) => t.semana === semana)
            .sort((a, b) => a.orden - b.orden)
          const nextOrden = tareas.length > 0 ? Math.max(...tareas.map((t) => t.orden)) + 1 : 1

          return (
            <section key={semana} aria-labelledby={`semana-${semana}-title`}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 id={`semana-${semana}-title`} className="text-sm font-semibold text-foreground">
                  Semana {semana}
                </h2>
                <button
                  type="button"
                  onClick={() => setAddingSemana(addingSemana === semana ? null : semana)}
                  className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Plus className="size-3.5" />
                  Agregar tarea
                </button>
              </div>

              {tareas.length === 0 && addingSemana !== semana && (
                <p className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
                  Sin tareas en esta semana.
                </p>
              )}

              <ul className="space-y-2" role="list">
                {tareas.map((tarea) => (
                  <li
                    key={tarea.id}
                    className="rounded-xl border bg-card p-3"
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                        {tarea.orden}
                      </span>
                      <div className="min-w-0 flex-1 space-y-1">
                        <InlineEdit
                          value={tarea.titulo}
                          onSave={(v) => handleSaveTareaTitulo(tarea.id, v)}
                          className="text-sm font-medium text-foreground"
                          placeholder="Título de la tarea"
                        />
                        <InlineEdit
                          value={tarea.descripcion ?? ""}
                          onSave={(v) => handleSaveTareaDesc(tarea.id, v)}
                          className="text-xs text-muted-foreground"
                          multiline
                          placeholder="Agregar descripción…"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteTarea(tarea.id)}
                        disabled={deletingId === tarea.id}
                        aria-label="Eliminar tarea"
                        className="flex min-h-8 min-w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              {addingSemana === semana && (
                <AddTareaForm
                  templateId={id}
                  semana={semana}
                  nextOrden={nextOrden}
                  onAdded={(t) => handleTareaAdded(semana, t)}
                  onCancel={() => setAddingSemana(null)}
                />
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}
