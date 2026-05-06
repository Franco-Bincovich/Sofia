"""
Instancia compartida de rate limiter (slowapi).
Importar desde acá en todos los routers que necesiten rate limiting.
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

# MemoryStorage no persiste entre instancias serverless de Vercel.
# Para el deploy de demo se deshabilita; reactivar con Redis en producción real.
limiter = Limiter(key_func=get_remote_address, enabled=False)
