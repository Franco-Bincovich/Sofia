"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import type { EtapaPipeline } from "@/types/vacantes"

const ETAPA_LABELS: Record<EtapaPipeline, string> = {
  postulado: "Postulado",
  assessment: "Assessment",
  entrevista_rrhh: "Entrevista RRHH",
  entrevista_tecnica: "Entrevista Técnica",
  oferta: "Oferta",
}

const ETAPA_VARIANTS: Record<EtapaPipeline, "default" | "secondary" | "outline"> = {
  postulado: "outline",
  assessment: "secondary",
  entrevista_rrhh: "default",
  entrevista_tecnica: "default",
  oferta: "secondary",
}

export interface CandidatoCardProps {
  nombre: string
  cargoAnterior: string
  fechaAplicacion: string
  etapa: EtapaPipeline
}

function getInitials(nombre: string): string {
  return nombre
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase()
}

export function CandidatoCard({ nombre, cargoAnterior, fechaAplicacion, etapa }: CandidatoCardProps) {
  return (
    <div className="cursor-pointer rounded-lg border bg-card p-3 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3">
        <Avatar>
          <AvatarFallback>{getInitials(nombre)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{nombre}</p>
          <p className="truncate text-xs text-muted-foreground">{cargoAnterior}</p>
        </div>
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <Badge variant={ETAPA_VARIANTS[etapa]}>{ETAPA_LABELS[etapa]}</Badge>
        <span className="whitespace-nowrap text-xs text-muted-foreground">{fechaAplicacion}</span>
      </div>
    </div>
  )
}
