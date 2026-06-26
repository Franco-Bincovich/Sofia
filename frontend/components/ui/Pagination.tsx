import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"

interface PaginationProps {
  page: number
  total: number
  pageSize: number
  onPageChange: (page: number) => void
}

/** Paginación Prev/Next reutilizable. Deshabilita en los bordes; total=0 → 1 página. */
export function Pagination({ page, total, pageSize, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const isFirst = page <= 1
  const isLast = page >= totalPages

  return (
    <div className="mt-4 flex items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">
        Página {page} de {totalPages}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="min-h-11 min-w-11"
          disabled={isFirst}
          onClick={() => onPageChange(page - 1)}
          aria-label="Página anterior"
        >
          <ChevronLeft className="size-4" />
          Anterior
        </Button>
        <Button
          variant="outline"
          className="min-h-11 min-w-11"
          disabled={isLast}
          onClick={() => onPageChange(page + 1)}
          aria-label="Página siguiente"
        >
          Siguiente
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}
