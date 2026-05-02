"use client"

import { useState } from "react"
import { FileDown } from "lucide-react"

import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"
import { OrgNode } from "@/components/features/organigrama/OrgNode"
import { OrgPanel } from "@/components/features/organigrama/OrgPanel"
import { cn } from "@/lib/utils"
import type { OrgEmployee, OrgTreeNode } from "@/types/organigrama"

const MOCK_TREE: OrgTreeNode = {
  employee: {
    id: "1",
    nombre: "Roberto",
    apellido: "Navarro",
    cargo: "Gerente General",
    area: "general",
    areaNombre: "Dirección General",
    email: "r.navarro@karstec.com",
    modalidad: "presencial",
  },
  children: [
    {
      employee: {
        id: "2",
        nombre: "Andrés",
        apellido: "Molina",
        cargo: "Director de Tecnología",
        area: "tecnologia",
        areaNombre: "Tecnología",
        email: "a.molina@karstec.com",
        modalidad: "hibrido",
      },
      children: [
        {
          employee: {
            id: "3",
            nombre: "Ana",
            apellido: "García",
            cargo: "Desarrolladora Senior",
            area: "tecnologia",
            areaNombre: "Tecnología",
            email: "a.garcia@karstec.com",
            modalidad: "hibrido",
          },
        },
        {
          employee: {
            id: "4",
            nombre: "Diego",
            apellido: "Torres",
            cargo: "DevOps Engineer",
            area: "tecnologia",
            areaNombre: "Tecnología",
            email: "d.torres@karstec.com",
            modalidad: "remoto",
          },
        },
        {
          employee: {
            id: "5",
            nombre: "María",
            apellido: "Fernández",
            cargo: "UX Designer",
            area: "tecnologia",
            areaNombre: "Tecnología",
            email: "m.fernandez@karstec.com",
            modalidad: "presencial",
          },
        },
      ],
    },
    {
      employee: {
        id: "6",
        nombre: "Carolina",
        apellido: "Vega",
        cargo: "Directora de Producto",
        area: "producto",
        areaNombre: "Producto",
        email: "c.vega@karstec.com",
        modalidad: "remoto",
      },
      children: [
        {
          employee: {
            id: "7",
            nombre: "Carlos",
            apellido: "López",
            cargo: "Product Manager",
            area: "producto",
            areaNombre: "Producto",
            email: "c.lopez@karstec.com",
            modalidad: "remoto",
          },
        },
        {
          employee: {
            id: "8",
            nombre: "Laura",
            apellido: "Sánchez",
            cargo: "Product Analyst",
            area: "producto",
            areaNombre: "Producto",
            email: "l.sanchez@karstec.com",
            modalidad: "hibrido",
          },
        },
      ],
    },
    {
      employee: {
        id: "9",
        nombre: "Patricia",
        apellido: "Reyes",
        cargo: "Directora de RRHH",
        area: "rrhh",
        areaNombre: "RRHH",
        email: "p.reyes@karstec.com",
        modalidad: "presencial",
      },
      children: [
        {
          employee: {
            id: "10",
            nombre: "Martín",
            apellido: "Díaz",
            cargo: "HR Business Partner",
            area: "rrhh",
            areaNombre: "RRHH",
            email: "m.diaz@karstec.com",
            modalidad: "presencial",
          },
        },
        {
          employee: {
            id: "11",
            nombre: "Valentina",
            apellido: "Herrera",
            cargo: "Talent Acquisition",
            area: "rrhh",
            areaNombre: "RRHH",
            email: "v.herrera@karstec.com",
            modalidad: "hibrido",
          },
        },
      ],
    },
  ],
}

interface OrgBranchProps {
  node: OrgTreeNode
  selectedId: string | null
  onSelect: (employee: OrgEmployee) => void
}

function OrgBranch({ node, selectedId, onSelect }: OrgBranchProps) {
  const children = node.children ?? []
  const isOnly = children.length === 1

  return (
    <div className="flex flex-col items-center">
      <OrgNode
        employee={node.employee}
        isSelected={selectedId === node.employee.id}
        onSelect={onSelect}
      />

      {children.length > 0 && (
        <>
          {/* Vertical stem from node down to T-intersection */}
          <div className="h-8 w-px bg-border" />

          {/* Children row */}
          <div className="flex items-start">
            {children.map((child, i) => {
              const isFirst = i === 0
              const isLast = i === children.length - 1

              return (
                <div
                  key={child.employee.id}
                  className="relative flex flex-col items-center px-4"
                >
                  {/* Horizontal connector at T-intersection */}
                  {!isOnly && (
                    <div
                      className={cn(
                        "absolute top-0 h-px bg-border",
                        isFirst && "left-1/2 right-0",
                        isLast && "left-0 right-1/2",
                        !isFirst && !isLast && "inset-x-0",
                      )}
                    />
                  )}

                  {/* Vertical drop from T-intersection to child */}
                  <div className="h-8 w-px bg-border" />

                  <OrgBranch
                    node={child}
                    selectedId={selectedId}
                    onSelect={onSelect}
                  />
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

export default function OrganigramaPage() {
  const [selected, setSelected] = useState<OrgEmployee | null>(null)

  function handleSelect(employee: OrgEmployee) {
    setSelected((prev) => (prev?.id === employee.id ? null : employee))
  }

  return (
    <div>
      <PageHeader
        title="Organigrama"
        description="Estructura jerárquica de la empresa"
        action={
          <Button
            variant="outline"
            className="min-h-11"
            onClick={() => console.log("Exportar PDF")}
          >
            <FileDown className="size-4" />
            Exportar PDF
          </Button>
        }
      />

      {/* Tree — scrollable horizontally on mobile */}
      <div className="overflow-x-auto pb-8">
        <div className="inline-flex min-w-full justify-center pt-4">
          <OrgBranch
            node={MOCK_TREE}
            selectedId={selected?.id ?? null}
            onSelect={handleSelect}
          />
        </div>
      </div>

      {/* Backdrop */}
      {selected && (
        <div
          className="fixed inset-0 z-30 bg-black/20 dark:bg-black/40"
          aria-hidden="true"
          onClick={() => setSelected(null)}
        />
      )}

      {/* Side panel */}
      {selected && (
        <OrgPanel employee={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
