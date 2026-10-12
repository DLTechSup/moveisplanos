"""Ponto de entrada do Projeta Móveis."""
from __future__ import annotations

import sys
from pathlib import Path

if __package__ in (None, ""):                       # permite `python app/main.py`
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from PySide6.QtCore import QLocale
from PySide6.QtWidgets import QApplication

from app.catalogo import Catalogo
from app.interface.icones import icone_app
from app.interface.janela import JanelaPrincipal


def main() -> int:
    app = QApplication(sys.argv)
    app.setApplicationName("Projeta Móveis")
    app.setWindowIcon(icone_app())
    QLocale.setDefault(QLocale(QLocale.Portuguese, QLocale.Brazil))
    app.setStyle("Fusion")
    catalogo = Catalogo.carregar()
    janela = JanelaPrincipal(catalogo)
    janela.show()
    return app.exec()


if __name__ == "__main__":
    sys.exit(main())
