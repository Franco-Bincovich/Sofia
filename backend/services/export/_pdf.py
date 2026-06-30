"""Renderer PDF del motor de export (reportlab). Genérico: mapea `datos` por estructura.

escalares → "Resumen"; analisis/contexto_datos → texto; lista de dicts → tabla;
lista de escalares → bullets; dict simple (no '_') → key/value.
"""
import io
from typing import Any, Dict


def build_pdf(nombre: str, datos: Dict[str, Any]) -> bytes:
    """Genera un PDF a partir de (nombre, datos). datos asume primitivos (sin coerción de tipos)."""
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable,
    )

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=2*cm, rightMargin=2*cm,
                            topMargin=2*cm, bottomMargin=2*cm)
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle("title", parent=styles["Heading1"],
                                 fontSize=16, spaceAfter=4, textColor=colors.HexColor("#1e293b"))
    h2_style = ParagraphStyle("h2", parent=styles["Heading2"],
                              fontSize=11, spaceAfter=3, textColor=colors.HexColor("#334155"))
    body_style = ParagraphStyle("body", parent=styles["Normal"],
                                fontSize=9, leading=14, textColor=colors.HexColor("#475569"))
    label_style = ParagraphStyle("label", parent=styles["Normal"],
                                 fontSize=9, leading=14, textColor=colors.HexColor("#64748b"))

    story = [
        Paragraph(nombre, title_style),
        HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e2e8f0"), spaceAfter=8),
    ]

    # ── Datos escalares ────────────────────────────────────────────────────────
    scalars = {k: v for k, v in datos.items()
               if not isinstance(v, (list, dict)) and k not in ("titulo",)}
    if scalars:
        story.append(Paragraph("Resumen", h2_style))
        for key, val in scalars.items():
            label = key.replace("_", " ").capitalize()
            story.append(Paragraph(f"<b>{label}:</b>  {val}", body_style))
        story.append(Spacer(1, 0.4*cm))

    # ── Texto largo (análisis IA) ──────────────────────────────────────────────
    for key in ("analisis", "contexto_datos"):
        if key in datos and isinstance(datos[key], str):
            story.append(Paragraph(key.replace("_", " ").capitalize(), h2_style))
            for line in datos[key].split("\n"):
                story.append(Paragraph(line or "&nbsp;", body_style))
            story.append(Spacer(1, 0.4*cm))

    # ── Tablas ─────────────────────────────────────────────────────────────────
    for key, val in datos.items():
        if not isinstance(val, list) or not val:
            continue
        story.append(Paragraph(key.replace("_", " ").capitalize(), h2_style))
        if isinstance(val[0], dict):
            headers = list(val[0].keys())
            table_data = [[h.replace("_", " ").capitalize() for h in headers]]
            for row in val:
                table_data.append([str(row.get(h, "")) for h in headers])
            col_w = (17 * cm) / len(headers)
            tbl = Table(table_data, colWidths=[col_w] * len(headers))
            tbl.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTSIZE", (0, 0), (-1, 0), 8),
                ("FONTSIZE", (0, 1), (-1, -1), 8),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ]))
            story.append(tbl)
        else:
            for item in val:
                story.append(Paragraph(f"• {item}", label_style))
        story.append(Spacer(1, 0.4*cm))

    # ── Dicts simples (excluye claves privadas como _sheets) ──────────────────
    for key, val in datos.items():
        if key.startswith("_") or not isinstance(val, dict):
            continue
        story.append(Paragraph(key.replace("_", " ").capitalize(), h2_style))
        for k, v in val.items():
            story.append(Paragraph(f"<b>{k}:</b>  {v}", body_style))
        story.append(Spacer(1, 0.4*cm))

    doc.build(story)
    return buf.getvalue()
