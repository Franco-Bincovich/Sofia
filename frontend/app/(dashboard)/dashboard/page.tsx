"use client"

import { getRol } from "@/services/permisos"
import { DashboardAdmin } from "@/components/features/dashboard/DashboardAdmin"
import { DashboardMando } from "@/components/features/dashboard/DashboardMando"

// mandos_medios ve su propio dashboard (GET /api/dashboard-equipo, no le da 403);
// admin/gerencia mantienen el dashboard ejecutivo actual intacto.
export default function DashboardPage() {
  const isMando = getRol() === "mandos_medios"
  return isMando ? <DashboardMando /> : <DashboardAdmin />
}
