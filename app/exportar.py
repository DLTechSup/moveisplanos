"""Exportação (PDF e PNG) e persistência de projetos (.pmv)."""
from __future__ import annotations

import json
from pathlib import Path

from PySide6.QtCore import QMarginsF, QRect, QRectF, Qt
from PySide6.QtGui import QImage, QPageLayout, QPageSize, QPainter, QPdfWriter

from .desenho.prancha import ALT, LARG, Pagina, montar_paginas
from .modelos import Projeto


def preparar_painter(pt: QPainter, largura_px: int, altura_px: int) -> None:
    pt.setRenderHint(QPainter.Antialiasing, True)
    pt.setRenderHint(QPainter.TextAntialiasing, True)
    pt.setRenderHint(QPainter.SmoothPixmapTransform, True)
    pt.setViewport(QRect(0, 0, largura_px, altura_px))
    pt.setWindow(QRect(0, 0, int(LARG), int(ALT)))


def renderizar_imagem(pagina: Pagina, largura_px: int = 4961) -> QImage:
    altura_px = int(round(largura_px * ALT / LARG))
    img = QImage(largura_px, altura_px, QImage.Format_RGB32)
    img.fill(Qt.white)
    pt = QPainter(img)
    preparar_painter(pt, largura_px, altura_px)
    pagina.desenhar(pt)
    pt.end()
    return img


def paginas_do_modo(calc, modo: str) -> list[Pagina]:
    """modo: 'completo' (técnico + cliente), 'tecnico' ou 'cliente'."""
    if modo == "cliente":
        return montar_paginas(calc, True, somente_cliente=True)
    return montar_paginas(calc, incluir_cliente=(modo == "completo"))


def exportar_pdf(calc, caminho: str | Path, modo: str = "completo") -> int:
    """Gera o PDF (A3 paisagem, uma página por folha). Devolve o número de páginas."""
    paginas = paginas_do_modo(calc, modo)
    escritor = QPdfWriter(str(caminho))
    escritor.setPageSize(QPageSize(QPageSize.A3))
    escritor.setPageOrientation(QPageLayout.Landscape)
    escritor.setPageMargins(QMarginsF(0, 0, 0, 0))
    escritor.setResolution(300)
    escritor.setTitle(calc.projeto.nome or "Projeto")
    escritor.setCreator("Projeta Móveis")
    pt = QPainter(escritor)
    for i, pg in enumerate(paginas):
        if i:
            escritor.newPage()
        preparar_painter(pt, escritor.width(), escritor.height())
        pg.desenhar(pt)
    pt.end()
    return len(paginas)


def exportar_png(calc, caminho_base: str | Path, modo: str = "completo", largura_px: int = 4961) -> list[Path]:
    """Uma imagem PNG por página: <base>_pagina1.png, <base>_pagina2.png…"""
    base = Path(caminho_base)
    if base.suffix.lower() == ".png":
        base = base.with_suffix("")
    arquivos = []
    for i, pg in enumerate(paginas_do_modo(calc, modo), 1):
        destino = base.parent / f"{base.name}_pagina{i}.png"
        renderizar_imagem(pg, largura_px).save(str(destino), "PNG")
        arquivos.append(destino)
    return arquivos


def salvar_projeto(projeto: Projeto, caminho: str | Path) -> None:
    with open(caminho, "w", encoding="utf-8") as f:
        json.dump(projeto.para_dict(), f, ensure_ascii=False, indent=2)


def abrir_projeto(caminho: str | Path) -> Projeto:
    with open(caminho, encoding="utf-8") as f:
        return Projeto.de_dict(json.load(f))
