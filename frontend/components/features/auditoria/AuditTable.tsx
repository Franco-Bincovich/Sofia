import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  ENTIDAD_LABEL, EVENTO_LABEL, formatFechaHora, resumenDiff,
} from "@/components/features/auditoria/auditLabels"
import type { AuditLog } from "@/types/auditoria"

/**
 * Tabla de eventos de auditoría. Asume `logs` no vacío (los estados loading/empty/error
 * los maneja la página). La columna Detalle muestra un resumen legible del cambio + un
 * botón "Ver detalle" que abre el modal vía onVerDetalle.
 */
export function AuditTable({ logs, onVerDetalle }: { logs: AuditLog[]; onVerDetalle: (log: AuditLog) => void }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Usuario</TableHead>
            <TableHead>Empresa</TableHead>
            <TableHead>Entidad</TableHead>
            <TableHead>Evento</TableHead>
            <TableHead>Acción</TableHead>
            <TableHead>Detalle</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="whitespace-nowrap">{formatFechaHora(log.created_at)}</TableCell>
              <TableCell>{log.usuario_nombre ?? "Sistema"}</TableCell>
              <TableCell className="text-muted-foreground">{log.empresa_nombre ?? "—"}</TableCell>
              <TableCell>{ENTIDAD_LABEL[log.entidad] ?? log.entidad}</TableCell>
              <TableCell>{EVENTO_LABEL[log.evento] ?? log.evento}</TableCell>
              <TableCell>
                <Badge variant="outline">{log.accion}</Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-sm">
                    {resumenDiff(log.datos_anteriores, log.datos_nuevos)}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => onVerDetalle(log)}>
                    Ver detalle
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
