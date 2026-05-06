"""
Utilidades de seguridad para validar y limpiar inputs antes de enviarlos
a APIs externas (IA, integraciones).
"""
import re

_CONTROL_CHARS_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
MAX_PROMPT_LENGTH = 2000


def sanitize_user_input(text: str, max_length: int = MAX_PROMPT_LENGTH) -> str:
    """
    Elimina caracteres de control y trunca el texto a max_length.

    Args:
        text: Texto del usuario a sanitizar.
        max_length: Máximo de caracteres permitidos.

    Returns:
        Texto limpio y truncado.
    """
    cleaned = _CONTROL_CHARS_RE.sub("", text)
    return cleaned[:max_length].strip()
