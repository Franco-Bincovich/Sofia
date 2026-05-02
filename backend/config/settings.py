"""
Única fuente de configuración y variables de entorno del proyecto.
El resto del código importa `settings` desde acá — nunca os.environ directamente.
"""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App
    app_env: str = "development"

    # Supabase
    supabase_url: str
    supabase_anon_key: str
    supabase_service_key: str

    # Auth
    jwt_secret: str
    jwt_expiration_minutes: int = 60
    refresh_token_expiration_days: int = 30

    # Anthropic
    anthropic_api_key: str

    # Resend
    resend_api_key: str
    resend_from_email: str = "noreply@hrkarstec.com"

    # CORS
    allowed_origins: str = "http://localhost:3000"

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
