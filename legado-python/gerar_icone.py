"""Gera assets/icone.ico e assets/icone.png a partir do ícone desenhado por código."""
import os
import sys
from pathlib import Path

os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")
sys.path.insert(0, str(Path(__file__).resolve().parent))

from PySide6.QtGui import QGuiApplication

app = QGuiApplication([])
from app.interface.icones import icone_app

pasta = Path(__file__).resolve().parent / "assets"
pasta.mkdir(exist_ok=True)
pm = icone_app(256).pixmap(256, 256)
pm.save(str(pasta / "icone.png"), "PNG")
print("ico:", pm.save(str(pasta / "icone.ico"), "ICO"))
