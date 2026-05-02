"""
Punto de entrada para Vercel serverless functions.

Vercel detecta el objeto `app` (ASGI) y lo ejecuta como función serverless.
El runtime @vercel/python instala backend/requirements.txt automáticamente.

NO usar en entorno local — usar main.py + uvicorn en su lugar:
    uvicorn main:app --reload
"""
import os
import sys

# Agrega el directorio backend al path.
# Necesario cuando Vercel ejecuta desde la raíz del repositorio
# y los imports relativos (config.settings, routers.*) no resuelven.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from main import app  # noqa: E402

__all__ = ["app"]
