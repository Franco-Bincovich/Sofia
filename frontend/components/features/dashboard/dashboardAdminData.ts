import { Briefcase, DollarSign, UserMinus, UserPlus, Users } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import type { AlertaDashboard, DashboardData } from "@/services/dashboard"

/** Constantes, tipos y helpers puros del dashboard de admin (sin JSX). */
export interface KpiCardData {
  title: string
  value: string
  icon: LucideIcon
  description: string
}

export const NIVEL_VARIANT: Record<AlertaDashboard["nivel"], "default" | "secondary" | "destructive"> = {
  info:    "secondary",
  warning: "default",
  error:   "destructive",
}

export const NIVEL_LABEL: Record<AlertaDashboard["nivel"], string> = {
  info:    "Info",
  warning: "Aviso",
  error:   "Urgente",
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency", currency: "ARS", maximumFractionDigits: 0,
  }).format(value)
}

export function buildKpis(data: DashboardData): KpiCardData[] {
  return [
    { title: "Empleados activos", value: String(data.kpis.empleados_activos), icon: Users, description: "Colaboradores vigentes" },
    { title: "Ingresos este mes", value: String(data.kpis.ingresos_mes), icon: UserPlus, description: "Nuevos ingresos del período" },
    { title: "Bajas este mes", value: String(data.kpis.bajas_mes), icon: UserMinus, description: "Egresos del período" },
    { title: "Costo total nómina", value: formatCurrency(data.kpis.costo_nomina), icon: DollarSign, description: "Mensual bruto" },
    { title: "Onboardings activos", value: String(data.kpis.onboardings_activos), icon: UserPlus, description: "Procesos en curso" },
    { title: "Vacantes activas", value: String(data.kpis.vacantes_activas), icon: Briefcase, description: "Posiciones abiertas" },
  ]
}
