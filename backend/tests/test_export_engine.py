"""Tests del motor de export genérico (E1).

Verifica que los 4 renderers generan bytes válidos con el media_type/extensión correctos,
que el engine despacha bien y rechaza formatos inválidos (422), y que el CSV serializa las
filas esperadas según la regla de secciones concatenadas. El motor es aditivo: no toca reportes.
"""
import csv as csvmod
import io
import zipfile

import pytest

from services.export import build_export, Descarga
from utils.errors import AppError

_DATOS_SIMPLE = {
    "titulo": "X",  # se omite del cuerpo
    "total_empleados": 42,
    "tasa_rotacion_pct": 3.5,
    "analisis": "Linea 1\nLinea 2",
    "por_area": [{"area": "Tec", "total": 5}, {"area": "RRHH", "total": 3}],
    "motivos_egreso": {"renuncia": 2, "despido": 1},
}

_DATOS_SHEETS = {
    "_sheets": {
        "Resumen": {"Año": 2026, "Activos": 10},
        "Headcount": {"por_area": [{"area": "Tec", "total": 5}]},
    },
    "titulo": "Anual",
}

_META = [
    ("pdf", "pdf", "application/pdf"),
    ("excel", "xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
    ("csv", "csv", "text/csv; charset=utf-8"),
    ("word", "docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
]


class TestFormatos:
    @pytest.mark.parametrize("formato,ext,media_type", _META)
    def test_genera_bytes_y_meta(self, formato: str, ext: str, media_type: str) -> None:
        d = build_export("Reporte X", _DATOS_SIMPLE, "demo", formato)
        assert isinstance(d, Descarga)
        assert isinstance(d.content, bytes) and len(d.content) > 0
        assert d.filename == f"demo.{ext}"
        assert d.media_type == media_type

    @pytest.mark.parametrize("formato", ["pdf", "excel", "csv", "word"])
    def test_sheets_no_rompe(self, formato: str) -> None:
        d = build_export("Anual", _DATOS_SHEETS, "anual_2026", formato)
        assert len(d.content) > 0


class TestBinarios:
    def test_pdf_magic(self) -> None:
        d = build_export("X", _DATOS_SIMPLE, "demo", "pdf")
        assert d.content[:4] == b"%PDF"

    def test_xlsx_es_zip(self) -> None:
        d = build_export("X", _DATOS_SIMPLE, "demo", "excel")
        assert zipfile.is_zipfile(io.BytesIO(d.content))

    def test_docx_es_zip(self) -> None:
        d = build_export("X", _DATOS_SIMPLE, "demo", "word")
        assert zipfile.is_zipfile(io.BytesIO(d.content))


class TestCSVContenido:
    def test_filas_esperadas(self) -> None:
        d = build_export("Reporte X", _DATOS_SIMPLE, "demo", "csv")
        text = d.content.decode("utf-8")
        assert text.startswith("﻿")  # BOM
        rows = list(csvmod.reader(io.StringIO(text.lstrip("﻿"))))
        flat = ["|".join(r) for r in rows]
        assert "Reporte X" in flat                    # título
        assert "Total empleados|42" in flat           # escalar
        assert "Area|Total" in flat                   # headers capitalizados
        assert "Tec|5" in flat                        # fila de tabla
        assert "renuncia|2" in flat                   # dict simple


class TestEngineErrores:
    def test_formato_invalido_422(self) -> None:
        with pytest.raises(AppError) as exc:
            build_export("X", _DATOS_SIMPLE, "demo", "ppt")
        assert exc.value.status_code == 422
        assert exc.value.code == "EXPORT_FORMATO_INVALIDO"
