"use client"

import { Briefcase, ExternalLink, Mail, MapPin, X } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import type { OrgEmployee } from "@/types/organigrama"

interface OrgPanelProps {
  employee: OrgEmployee
  onClose: () => void
}

const MODALIDAD_LABELS: Record<string, string> = {
  presencial: "Presencial",
  remoto: "Remoto",
  hibrido: "Híbrido",
}

export function OrgPanel({ employee, onClose }: OrgPanelProps) {
  const router = useRouter()

  return (
    <aside
      className="fixed inset-y-0 right-0 z-40 flex w-full flex-col bg-background shadow-xl ring-1 ring-border sm:w-80"
      role="dialog"
      aria-label={`Perfil de ${employee.nombre} ${employee.apellido}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Perfil</h2>
        <button
          type="button"
          onClick={onClose}
          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Cerrar panel"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Avatar + nombre */}
        <div className="mb-6 flex flex-col items-center gap-3 pt-2 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
            {employee.nombre[0]}{employee.apellido[0]}
          </div>
          <div>
            <p className="text-base font-semibold text-foreground">
              {employee.nombre} {employee.apellido}
            </p>
            <p className="text-sm text-muted-foreground">{employee.cargo}</p>
          </div>
        </div>

        {/* Detalles */}
        <div className="space-y-4">
          <DetailRow icon={<Briefcase className="size-4" />} label="Área" value={employee.areaNombre} />
          <DetailRow icon={<Mail className="size-4" />} label="Email" value={employee.email} />
          <DetailRow
            icon={<MapPin className="size-4" />}
            label="Modalidad"
            value={MODALIDAD_LABELS[employee.modalidad] ?? employee.modalidad}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="border-t p-4">
        <Button
          className="w-full min-h-11"
          onClick={() => router.push(`/empleados/${employee.id}`)}
        >
          <ExternalLink className="size-4" />
          Ver perfil completo
        </Button>
      </div>
    </aside>
  )
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  )
}
