"use client"

import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { NavItem } from "@/components/layout/NavItem"
import type { NavLink } from "@/components/layout/nav-config"

interface NavGroupProps {
  label: string
  items: NavLink[] // ya filtrados por permiso (el grupo se renderiza solo si hay ≥1)
  open: boolean
  onToggle: () => void
  pathname: string
  onNavigate: () => void
}

function esActivo(href: string, pathname: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}

/** Grupo colapsable del sidebar: header-botón accesible (aria-expanded + chevron) + items. */
export function NavGroup({ label, items, open, onToggle, pathname, onNavigate }: NavGroupProps) {
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={cn(
          "flex min-h-11 w-full items-center justify-between rounded-lg px-3 text-sm font-medium transition-colors",
          "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
      >
        <span>{label}</span>
        <ChevronDown className={cn("size-4 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <ul className="mt-1 space-y-1 pl-3" role="list">
          {items.map((item) => (
            <li key={item.href}>
              <NavItem
                href={item.href}
                label={item.label}
                icon={item.icon}
                isActive={esActivo(item.href, pathname)}
                onClick={onNavigate}
              />
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}
