"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Pencil, LogOut } from "lucide-react"

import { PageHeader } from "@/components/layout/PageHeader"
import { ErrorState } from "@/components/ui/ErrorState"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { EmpleadoModal } from "@/components/features/empleados/EmpleadoModal"
import { fetchEmpleado } from "@/services/empleados"
import { iniciarOffboarding } from "@/services/offboarding"
import type { Empleado } from "@/types/empleado"
import type { MotivoEgreso } from "@/types/offboarding"

const ESTADO_VARIANTS = {
  activo: "default",
  baja: "destructive",
  licencia: "secondary",
} as const

const MOTIVOS_OFFBOARDING: { label: string; value: MotivoEgreso }[] = [
  { label: "Renuncia", value: "renuncia" },
  { label: "Desvinculación", value: "despido" },
  { label: "Fin de contrato", value: "fin_contrato" },
]

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-foreground">{value ?? "—"}</dd>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-4 md:p-6">
      <h2 className="mb-4 text-base font-semibold text-foreground">{title}</h2>
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</dl>
    </section>
  )
}

function LoadingSkeleton() {
  return (
    <div>
      <Skeleton className="mb-6 h-8 w-48" />
      <div className="space-y-4">
        <Skeleton className="h-44 w-full rounded-xl" />
        <Skeleton className="h-44 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    </div>
  )
}

function OffboardingModal({
  open,
  empleadoId,
  onClose,
  onSuccess,
}: {
  open: boolean
  empleadoId: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [motivo, setMotivo] = useState<MotivoEgreso>("renuncia")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirmar() {
    setLoading(true)
    setError(null)
    try {
      await iniciarOffboarding({ empleado_id: empleadoId, motivo })
      onSuccess()
    } catch {
      setError("No se pudo iniciar el offboarding. Verificá si ya tiene uno activo.")
    } finally {
      setLoading(false)
    }
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      setMotivo("renuncia")
      setError(null)
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Iniciar offboarding</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="motivo-egreso">Motivo de egreso</Label>
            <select
              id="motivo-egreso"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value as MotivoEgreso)}
              className="flex min-h-[2.75rem] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              {MOTIVOS_OFFBOARDING.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading} className="min-h-11">
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirmar}
            disabled={loading}
            className="min-h-11"
          >
            {loading ? "Iniciando…" : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function EmpleadoDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [empleado, setEmpleado] = useState<Empleado | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [offboardingOpen, setOffboardingOpen] = useState(false)

  // TODO: leer desde sesión real cuando el auth esté completo
  const isAdmin = true

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setError(false)
    fetchEmpleado(id)
      .then((data) => { if (!cancelled) setEmpleado(data) })
      .catch(() => { if (!cancelled) setError(true) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id])

  async function recargarEmpleado() {
    const updated = await fetchEmpleado(id)
    setEmpleado(updated)
  }

  if (loading) return <LoadingSkeleton />

  if (error || !empleado) {
    return <ErrorState action={() => router.push("/empleados")} />
  }

  return (
    <div>
      <div className="mb-4">
        <Button
          variant="ghost"
          size="sm"
          className="min-h-11 gap-2"
          onClick={() => router.push("/empleados")}
        >
          <ArrowLeft className="size-4" />
          Volver a Empleados
        </Button>
      </div>

      <PageHeader
        title={`${empleado.nombre} ${empleado.apellido}`}
        description={empleado.cargo}
        action={
          isAdmin ? (
            <div className="flex gap-2">
              {empleado.estado === "activo" && (
                <Button
                  variant="outline"
                  className="min-h-11 gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setOffboardingOpen(true)}
                >
                  <LogOut className="size-4" />
                  Iniciar offboarding
                </Button>
              )}
              <Button className="min-h-11" onClick={() => setEditOpen(true)}>
                <Pencil />
                Editar
              </Button>
            </div>
          ) : undefined
        }
      />

      <div className="space-y-4">
        <Section title="Datos personales">
          <Field label="Email corporativo" value={empleado.email_corporativo} />
          <Field label="Teléfono" value={empleado.telefono} />
          <Field label="Fecha de nacimiento" value={empleado.fecha_nacimiento} />
          <Field label="CUIL" value={empleado.cuil} />
        </Section>

        <Section title="Datos laborales">
          <Field label="Cargo" value={empleado.cargo} />
          <Field label="Legajo" value={empleado.legajo} />
          <Field label="Modalidad" value={empleado.modalidad_trabajo} />
          <Field label="Tipo de contrato" value={empleado.tipo_contrato} />
          <Field label="Fecha de ingreso" value={empleado.fecha_ingreso} />
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Estado
            </dt>
            <dd className="mt-1">
              <Badge variant={ESTADO_VARIANTS[empleado.estado] ?? "outline"}>
                {empleado.estado}
              </Badge>
            </dd>
          </div>
        </Section>

        <Section title="Documentos">
          <div className="col-span-full text-sm text-muted-foreground">
            La gestión de documentos estará disponible en una próxima versión.
          </div>
        </Section>
      </div>

      {isAdmin && (
        <>
          <EmpleadoModal
            open={editOpen}
            onClose={() => setEditOpen(false)}
            onSuccess={async () => {
              setEditOpen(false)
              await recargarEmpleado()
            }}
            empleado={empleado}
          />
          <OffboardingModal
            open={offboardingOpen}
            empleadoId={id}
            onClose={() => setOffboardingOpen(false)}
            onSuccess={async () => {
              setOffboardingOpen(false)
              await recargarEmpleado()
            }}
          />
        </>
      )}
    </div>
  )
}
