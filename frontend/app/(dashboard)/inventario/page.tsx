"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/layout/PageHeader"
import { ItemsTab } from "@/components/features/inventario/ItemsTab"
import { AsignacionesTab } from "@/components/features/inventario/AsignacionesTab"
import { useCanWrite } from "@/hooks/useCanWrite"

type Tab = "items" | "asignaciones"

const TABS: { id: Tab; label: string }[] = [
  { id: "items",        label: "Ítems"        },
  { id: "asignaciones", label: "Asignaciones" },
]

export default function InventarioPage() {
  const [activeTab, setActiveTab] = useState<Tab>("items")
  const canWrite = useCanWrite()

  return (
    <div>
      <PageHeader
        title="Inventario"
        description="Gestión de ítems asignados a empleados"
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
      {activeTab === "items"        && <ItemsTab canWrite={canWrite} />}
      {activeTab === "asignaciones" && <AsignacionesTab canWrite={canWrite} />}
    </div>
  )
}
