"use client"

import type { ElementType } from "react"
import Link from "next/link"

import { cn } from "@/lib/utils"

interface NavItemProps {
  href: string
  label: string
  icon: ElementType
  isActive: boolean
  onClick?: () => void
}

/** Link de navegación individual. Marca el activo con estilo + aria-current="page". */
export function NavItem({ href, label, icon: Icon, isActive, onClick }: NavItemProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" />
      {label}
    </Link>
  )
}
