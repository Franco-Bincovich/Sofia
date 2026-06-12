"use client"

import type { SaldoVacaciones } from "@/types/vacaciones"

interface Props {
  saldo: SaldoVacaciones
  diasSolicitados?: number
  tipo: string
}

const ITEMS = [
  { key: "asignados" as const, label: "Asignados"   },
  { key: "gozados"   as const, label: "Gozados"     },
  { key: "pedidos"   as const, label: "Pedidos"     },
  { key: "disponibles" as const, label: "Disponibles" },
]

export function SaldoResumen({ saldo, diasSolicitados, tipo }: Props) {
  const excede =
    tipo === "vacaciones" &&
    diasSolicitados != null &&
    diasSolicitados > 0 &&
    diasSolicitados > saldo.disponibles

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs text-muted-foreground">Saldo de vacaciones</p>
      <div className="flex gap-2">
        {ITEMS.map(({ key, label }) => (
          <div
            key={key}
            className={`flex flex-1 flex-col items-center rounded-lg border px-2 py-1.5 text-center ${
              key === "disponibles" && saldo[key] < 0
                ? "border-destructive/40 bg-destructive/10"
                : "border-border bg-muted/30"
            }`}
          >
            <span className="text-[10px] text-muted-foreground">{label}</span>
            <span className={`text-base font-semibold tabular-nums ${key === "disponibles" && saldo[key] < 0 ? "text-destructive" : ""}`}>
              {saldo[key]}
            </span>
          </div>
        ))}
      </div>
      {excede && (
        <p className="text-xs text-amber-600 dark:text-amber-400" role="alert">
          Los días solicitados ({diasSolicitados}) superan el saldo disponible ({saldo.disponibles}).
          RRHH puede igualmente registrar la solicitud.
        </p>
      )}
    </div>
  )
}
