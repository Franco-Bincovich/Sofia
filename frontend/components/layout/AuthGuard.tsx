"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    const session = localStorage.getItem("session")
    if (!session) {
      router.push("/login")
    }
  }, [router])

  return <>{children}</>
}
