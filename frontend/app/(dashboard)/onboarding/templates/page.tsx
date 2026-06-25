"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronRight, ClipboardList, Plus, X } from "lucide-react"

import { PageHeader } from "@/components/layout/PageHeader"
import { EmptyState } from "@/components/ui/EmptyState"
import { ErrorState } from "@/components/ui/ErrorState"
import { createTemplate, deleteTemplate, fetchTemplates } from "@/services/onboarding"
import { fetchEmpresas } from "@/services/empresas"
import { getEmpresaActivaId } from "@/services/empresaStore"
import { useCanWrite } from "@/hooks/useCanWrite"
import type { OnboardingTemplate } from "@/types/onboarding"
import type { Empresa } from "@/types/empresa"

// ─── NuevoTemplateModal ────────────────────────────────────────────────────────

interface NuevoModalProps {
  empresas: Empresa[]
  empresaActivaId: string | null
  onClose: () => void
  onSuccess: (t: OnboardingTemplate) => void
}

function NuevoTemplateModal({ empresas, empresaActivaId, onClose, onSuccess }: NuevoModalProps) {
  const [nombre, setNombre] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [empresaId, setEmpresaId] = useState<string>(empresaActivaId ?? empresas[0]?.id ?? "")
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGuardar() {
    if (!nombre.trim() || !empresaId || guardando) return
    setGuardando(true)
    setError(null)
    try {
      const t = await createTemplate({
        nombre: nombre.trim(),
        empresa_id: empresaId,
        descripcion: descripcion.trim() || undefined,
      })
      onSuccess(t)
    } catch {
      setError("No se pudo crear el template. Intentá de nuevo.")
      setGuardando(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40" aria-hidden="true" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-nuevo-tmpl"
        className="fixed inset-x-4 top-1/2 z-50 -translate-y-1/2 rounded-2xl bg-background p-6 shadow-2xl ring-1 ring-border sm:inset-auto sm:left-1/2 sm:w-[28rem] sm:-translate-x-1/2"
      >
        <div className="mb-5 flex items-center justify-between gap-2">
          <h2 id="modal-nuevo-tmpl" className="text-base font-semibold text-foreground">
            Nuevo template
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex min-h-9 min-w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Selector de empresa — solo visible cuando topbar = "Todas" */}
          {!empresaActivaId && empresas.length > 0 && (
            <div>
              <label htmlFor="tmpl-empresa" className="mb-1.5 block text-sm font-medium text-foreground">
                Empresa
              </label>
              <select
                id="tmpl-empresa"
                value={empresaId}
                onChange={(e) => setEmpresaId(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {empresas.map((e) => (
                  <option key={e.id} value={e.id}>{e.nombre}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label htmlFor="tmpl-nombre" className="mb-1.5 block text-sm font-medium text-foreground">
              Nombre
            </label>
            <input
              id="tmpl-nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="ej. Onboarding Técnico"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label htmlFor="tmpl-desc" className="mb-1.5 block text-sm font-medium text-foreground">
              Descripción <span className="text-muted-foreground font-normal">(opcional)</span>
            </label>
            <textarea
              id="tmpl-desc"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              placeholder="Descripción del template..."
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleGuardar}
            disabled={!nombre.trim() || !empresaId || guardando}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            {guardando ? "Creando…" : "Crear template"}
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function TemplatesPage() {
  const router = useRouter()
  const canWrite = useCanWrite()
  const [empresaActivaId] = useState<string | null>(() => getEmpresaActivaId())
  const [templates, setTemplates] = useState<OnboardingTemplate[]>([])
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    const tasks: Promise<unknown>[] = [
      fetchTemplates().then(setTemplates),
    ]
    if (!empresaActivaId) {
      tasks.push(
        fetchEmpresas().then((res) => setEmpresas(res.items.filter((e) => e.activa))).catch(() => {}),
      )
    }
    Promise.all(tasks)
      .catch(() => setError("No se pudieron cargar los templates"))
      .finally(() => setLoading(false))
  }, [empresaActivaId])

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    if (!confirm("¿Eliminar este template? Si tiene onboardings activos se desactivará.")) return
    setDeletingId(id)
    try {
      await deleteTemplate(id)
      setTemplates((prev) => prev.filter((t) => t.id !== id))
    } catch {
      alert("No se pudo eliminar el template.")
    } finally {
      setDeletingId(null)
    }
  }

  const mostrarEmpresa = !empresaActivaId

  if (loading) {
    return (
      <div>
        <PageHeader title="Templates de onboarding" description="Cargando..." />
        <ul className="space-y-3">
          {[1, 2, 3].map((i) => (
            <li key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
          ))}
        </ul>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Templates de onboarding" />
        <ErrorState description={error} />
      </div>
    )
  }

  return (
    <div>
      <div className="relative">
        <PageHeader
          title="Templates de onboarding"
          description={`${templates.length} template${templates.length !== 1 ? "s" : ""} configurado${templates.length !== 1 ? "s" : ""}`}
        />
        {canWrite && (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="absolute right-0 top-0 flex min-h-10 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">Nuevo template</span>
          </button>
        )}
      </div>

      {templates.length === 0 ? (
        <EmptyState
          icon={<ClipboardList />}
          title="Sin templates"
          description="Creá un template para definir el proceso de onboarding de tu empresa."
        />
      ) : (
        <ul className="space-y-3" role="list">
          {templates.map((t) => (
            <li key={t.id} className="flex items-stretch gap-2">
              <button
                type="button"
                onClick={() => router.push(`/onboarding/templates/${t.id}`)}
                className="min-w-0 flex-1 rounded-xl border bg-card p-4 text-left transition-all hover:border-primary/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{t.nombre}</p>
                    {t.descripcion && (
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">{t.descripcion}</p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t.tareas_total} tarea{t.tareas_total !== 1 ? "s" : ""}
                      {mostrarEmpresa && t.empresa_nombre && (
                        <span className="ml-2 text-muted-foreground/70">· {t.empresa_nombre}</span>
                      )}
                    </p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </div>
              </button>
              {canWrite && (
                <button
                  type="button"
                  onClick={(e) => handleDelete(e, t.id)}
                  disabled={deletingId === t.id}
                  className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl border bg-card text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  aria-label="Eliminar template"
                >
                  <X className="size-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {modalOpen && (
        <NuevoTemplateModal
          empresas={empresas}
          empresaActivaId={empresaActivaId}
          onClose={() => setModalOpen(false)}
          onSuccess={(t) => {
            setTemplates((prev) => [t, ...prev])
            setModalOpen(false)
            router.push(`/onboarding/templates/${t.id}`)
          }}
        />
      )}
    </div>
  )
}
