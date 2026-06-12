"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/layout/PageHeader"
import { PlantillasTab } from "@/components/features/evaluaciones/PlantillasTab"
import { CiclosTab } from "@/components/features/evaluaciones/CiclosTab"
import { EvaluacionesTab } from "@/components/features/evaluaciones/EvaluacionesTab"

type Tab = "plantillas" | "ciclos" | "evaluaciones"

const TABS: { id: Tab; label: string }[] = [
  { id: "plantillas", label: "Plantillas" },
  { id: "ciclos", label: "Ciclos" },
  { id: "evaluaciones", label: "Evaluaciones" },
]

export default function EvaluacionesPage() {
  const [activeTab, setActiveTab] = useState<Tab>("plantillas")

  return (
    <div>
      <PageHeader
        title="Evaluaciones de Desempeño"
        description="Gestión de plantillas, ciclos y evaluaciones por empleado"
      />

      <div className="mb-6 flex gap-1 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 pb-3 pt-1 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              activeTab === tab.id
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "plantillas" && <PlantillasTab />}
      {activeTab === "ciclos" && <CiclosTab />}
      {activeTab === "evaluaciones" && <EvaluacionesTab />}
    </div>
  )
}
