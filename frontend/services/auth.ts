import { apiFetch, type Session } from "@/services/api"

export async function login(username: string, password: string): Promise<Session> {
  return apiFetch<Session>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  })
}
