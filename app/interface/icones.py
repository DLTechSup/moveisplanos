"""Ícones desenhados por código (independem de arquivos e de fontes de emoji)."""
from __future__ import annotations

from PySide6.QtCore import QPointF, QRectF, Qt
from PySide6.QtGui import QColor, QIcon, QPainter, QPen, QPixmap


def icone_cor(hex_cor: str, larg: int = 30, alt: int = 16) -> QIcon:
    pm = QPixmap(larg, alt)
    pm.fill(QColor(hex_cor))
    p = QPainter(pm)
    p.setPen(QPen(QColor("#555555"), 1))
    p.drawRect(0, 0, larg - 1, alt - 1)
    p.end()
    return QIcon(pm)


def icone_cadeado(fechado: bool, tamanho: int = 18, cor: str = "#14285A") -> QIcon:
    pm = QPixmap(tamanho, tamanho)
    pm.fill(Qt.transparent)
    p = QPainter(pm)
    p.setRenderHint(QPainter.Antialiasing)
    c = QColor(cor if fechado else "#888888")
    p.setPen(QPen(c, 1.8))
    t = tamanho
    corpo = QRectF(t * 0.2, t * 0.46, t * 0.6, t * 0.4)
    p.setBrush(c)
    p.drawRoundedRect(corpo, 2, 2)
    p.setBrush(Qt.NoBrush)
    arco = QRectF(t * 0.3, t * 0.12, t * 0.4, t * 0.5)
    if fechado:
        p.drawArc(arco, 0, 180 * 16)
        p.drawLine(QPointF(t * 0.3, t * 0.37), QPointF(t * 0.3, t * 0.48))
        p.drawLine(QPointF(t * 0.7, t * 0.37), QPointF(t * 0.7, t * 0.48))
    else:
        p.drawArc(arco, 0, 180 * 16)
        p.drawLine(QPointF(t * 0.3, t * 0.37), QPointF(t * 0.3, t * 0.20))
        p.translate(t * 0.0, 0)
    p.end()
    return QIcon(pm)


def icone_app(tamanho: int = 256) -> QIcon:
    """Ícone do programa: gaveteiro estilizado."""
    pm = QPixmap(tamanho, tamanho)
    pm.fill(Qt.transparent)
    p = QPainter(pm)
    p.setRenderHint(QPainter.Antialiasing)
    t = tamanho
    p.setPen(Qt.NoPen)
    p.setBrush(QColor("#14285A"))
    p.drawRoundedRect(QRectF(0, 0, t, t), t * 0.18, t * 0.18)
    p.setBrush(QColor("#D2B48C"))
    corpo = QRectF(t * 0.16, t * 0.2, t * 0.68, t * 0.6)
    p.drawRoundedRect(corpo, t * 0.03, t * 0.03)
    p.setPen(QPen(QColor("#14285A"), t * 0.02))
    for i in range(1, 3):
        y = corpo.top() + corpo.height() * i / 3
        p.drawLine(QPointF(corpo.left(), y), QPointF(corpo.right(), y))
    p.setPen(Qt.NoPen)
    p.setBrush(QColor("#F5F5F2"))
    for i in range(3):
        y = corpo.top() + corpo.height() * (i + 0.5) / 3
        p.drawRoundedRect(QRectF(t * 0.42, y - t * 0.012, t * 0.16, t * 0.024), t * 0.012, t * 0.012)
    p.setBrush(QColor("#8B6A45"))
    p.drawRect(QRectF(t * 0.2, t * 0.8, t * 0.6, t * 0.05))
    p.end()
    return QIcon(pm)
