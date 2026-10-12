"""Formatação de números no padrão brasileiro."""


def fmt_num(valor: float, casas: int = 2) -> str:
    """Número com vírgula decimal e sem zeros inúteis (140, 78,5, 67,75)."""
    texto = f"{valor:.{casas}f}"
    if "." in texto:
        texto = texto.rstrip("0").rstrip(".")
    if texto in ("-0", ""):
        texto = "0"
    return texto.replace(".", ",")


def fmt_cm(mm: float) -> str:
    """Milímetros internos exibidos em centímetros."""
    return fmt_num(mm / 10.0, 2)


def fmt_mm(mm: float) -> str:
    return fmt_num(mm, 1)


def fmt_brl(valor: float) -> str:
    texto = f"{valor:,.2f}"
    texto = texto.replace(",", "#").replace(".", ",").replace("#", ".")
    return f"R$ {texto}"
