"""
Servicio de autenticación. Lógica de login, refresh y logout usando Supabase Auth.
"""
from schemas.auth import LoginResponse, RefreshResponse, UserInfo
from integrations.supabase_client import supabase_admin, supabase_client
from utils.errors import AppError
from utils.logger import logger


class AuthService:
    def login(self, email: str, password: str) -> LoginResponse:
        """
        Autentica al usuario con email y contraseña usando Supabase Auth.

        Verifica las credenciales, luego obtiene el perfil desde public.users
        usando el cliente admin (bypasea RLS) porque el token aún no está en contexto.

        Args:
            email: Email del usuario registrado en el sistema.
            password: Contraseña en texto plano (solo viaja sobre HTTPS).

        Returns:
            LoginResponse con access_token, refresh_token y datos del usuario.

        Raises:
            AppError: INVALID_CREDENTIALS (401) si las credenciales son incorrectas.
            AppError: USER_NOT_FOUND (404) si el perfil no existe en public.users.
        """
        try:
            auth_resp = supabase_client.auth.sign_in_with_password(
                {"email": email, "password": password}
            )
        except Exception:
            logger.warning("Login fallido", extra={"email": email})
            raise AppError("Credenciales inválidas", "INVALID_CREDENTIALS", 401)

        session = auth_resp.session
        auth_user = auth_resp.user

        try:
            result = (
                supabase_admin.table("users")
                .select("id, email, nombre, rol")
                .eq("id", str(auth_user.id))
                .single()
                .execute()
            )
        except Exception:
            raise AppError("Usuario no encontrado en el sistema", "USER_NOT_FOUND", 404)

        data = result.data
        logger.info("Login exitoso", extra={"user_id": str(auth_user.id)})

        return LoginResponse(
            access_token=session.access_token,
            refresh_token=session.refresh_token,
            user=UserInfo(
                id=data["id"],
                email=data["email"],
                rol=data["rol"],
                nombre=data["nombre"],
            ),
        )

    def refresh_token(self, token: str) -> RefreshResponse:
        """
        Genera nuevos tokens a partir de un refresh token válido.

        Supabase rota el refresh token en cada llamada: el token usado
        queda invalidado y se emite uno nuevo.

        Args:
            token: Refresh token vigente emitido en el login o refresh anterior.

        Returns:
            RefreshResponse con el nuevo access_token y el refresh_token rotado.

        Raises:
            AppError: INVALID_REFRESH_TOKEN (401) si el token expiró o fue revocado.
        """
        try:
            resp = supabase_client.auth.refresh_session(refresh_token=token)
        except Exception:
            raise AppError("Token de refresco inválido o expirado", "INVALID_REFRESH_TOKEN", 401)

        session = resp.session
        return RefreshResponse(
            access_token=session.access_token,
            refresh_token=session.refresh_token,
        )

    def logout(self, user_id: str, access_token: str) -> None:
        """
        Cierra la sesión del usuario invalidando todos sus tokens activos en Supabase.

        La invalidación es best-effort: si Supabase falla, se loguea el error
        pero no se lanza excepción para no bloquear el flujo del cliente.

        Args:
            user_id: UUID del usuario que cierra sesión (para trazabilidad).
            access_token: JWT activo del usuario, identifica la sesión en Supabase.
        """
        try:
            supabase_admin.auth.admin.sign_out(access_token)
        except Exception as exc:
            logger.warning(
                "Error al invalidar token en logout",
                extra={"user_id": user_id, "error": str(exc)},
            )
        logger.info("Logout exitoso", extra={"user_id": user_id})
