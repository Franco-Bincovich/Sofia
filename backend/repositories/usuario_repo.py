"""
Repositorio de escritura de usuarios del sistema (perfil espejo en public.users).
La identidad/credencial vive en auth.users (Supabase Auth) — eso lo maneja el service.
Acceso con supabase_admin. Chequeos de unicidad dirigidos (limit 1, sin full-scan).
"""
from typing import Optional

from integrations.supabase_client import supabase_admin
from utils.errors import AppError

_USERS = "users"
_EMPLEADOS = "empleados"


class UsuarioRepo:
    def email_existe(self, email: str) -> bool:
        """True si ya hay un usuario con ese email (chequeo dirigido)."""
        res = supabase_admin.table(_USERS).select("id").eq("email", email).limit(1).execute()
        return bool(res.data)

    def username_existe(self, username: str) -> bool:
        """True si ya hay un usuario con ese username (case-insensitive, dirigido)."""
        res = supabase_admin.table(_USERS).select("id").ilike("username", username).limit(1).execute()
        return bool(res.data)

    def insert_perfil(self, payload: dict) -> None:
        """Inserta la fila espejo en public.users. Lanza si el insert vuelve vacío."""
        res = supabase_admin.table(_USERS).insert(payload).execute()
        if not res.data:
            raise AppError("Error al crear el perfil del usuario", "DB_ERROR", 500)

    def vincular_empleado(self, empleado_id: str, user_id: str) -> bool:
        """Setea empleados.user_id. Devuelve False si el empleado no existe (0 filas)."""
        res = supabase_admin.table(_EMPLEADOS).update({"user_id": user_id}).eq("id", empleado_id).execute()
        return bool(res.data)

    def get_email(self, user_id: str) -> Optional[str]:
        """Email del usuario por id (para reautenticar en el cambio de contraseña).
        None si el usuario no existe. Chequeo dirigido (limit 1)."""
        res = supabase_admin.table(_USERS).select("email").eq("id", user_id).limit(1).execute()
        return res.data[0]["email"] if res.data else None

    def bajar_flag_password(self, user_id: str) -> None:
        """Baja must_change_password a false tras un cambio de contraseña exitoso
        (idempotente: dejarlo en false si ya lo estaba no rompe nada)."""
        supabase_admin.table(_USERS).update({"must_change_password": False}).eq("id", user_id).execute()

    def get_perfil(self, user_id: str) -> Optional[dict]:
        """Perfil mínimo (id, username, rol) para la baja y su auditoría. None si no existe."""
        res = supabase_admin.table(_USERS).select("id, username, rol").eq("id", user_id).limit(1).execute()
        return res.data[0] if res.data else None
