"use client"

import { Trash2 } from "lucide-react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ROL_LABEL, type UserRol } from "@/types/auth"
import type { UsuarioOption } from "@/services/usuarios"

interface UsuariosTableProps {
  usuarios: UsuarioOption[]
  onDelete: (usuario: UsuarioOption) => void
  deletingId: string | null
}

function rolLabel(rol: string): string {
  return ROL_LABEL[rol as UserRol] ?? rol
}

/** Tabla de usuarios del sistema con acción de eliminar por fila (solo admin_rrhh). */
export function UsuariosTable({ usuarios, onDelete, deletingId }: UsuariosTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Apellido</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Usuario</TableHead>
          <TableHead>Rol</TableHead>
          <TableHead className="w-20 text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {usuarios.map((u) => (
          <TableRow key={u.id}>
            <TableCell className="font-medium">{u.nombre}</TableCell>
            <TableCell>{u.apellido}</TableCell>
            <TableCell className="text-muted-foreground">{u.email}</TableCell>
            <TableCell className="font-mono text-sm">{u.username}</TableCell>
            <TableCell><Badge variant="secondary">{rolLabel(u.rol)}</Badge></TableCell>
            <TableCell className="text-right">
              <Button
                variant="ghost"
                size="icon"
                className="size-9 text-destructive hover:text-destructive"
                aria-label={`Eliminar ${u.nombre} ${u.apellido}`}
                onClick={() => onDelete(u)}
                disabled={deletingId === u.id}
              >
                <Trash2 className="size-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
