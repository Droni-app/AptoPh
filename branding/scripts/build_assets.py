"""Post-process Layer outputs into delivery assets: icon set, spot illustrations, splash, social."""
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, str(Path(__file__).parent))
from cutout import cutout, trim  # noqa: E402

ROOT = Path(sys.argv[1])
FONT = sys.argv[2]
BLUE = (30, 58, 95)
CREAM = (250, 247, 242)
SLATE = (74, 96, 122)

ICONS_1 = ["pagos", "estado-de-cuenta", "reservas", "zonas-comunes", "comunicados", "pqrs",
           "visitantes", "paquetes", "parqueadero"]
ICONS_2 = ["asambleas", "mantenimiento", "documentos", "residentes", "unidades", "seguridad",
           "notificaciones", "mascotas", "reportes"]
SPOTS = ["pagos-al-dia", "sin-mensajes", "sin-resultados", "bienvenida"]


def font(size, weight):
    f = ImageFont.truetype(FONT, size, layout_engine=ImageFont.Layout.RAQM)
    f.set_variation_by_axes([weight])
    return f


def draw_text(dr, xy, text, f, fill):
    """Draw text pulling commas left: this font's comma carries a wide left side-bearing."""
    x, y = xy
    parts = text.split(",")
    for i, part in enumerate(parts):
        dr.text((x, y), part, font=f, fill=fill)
        x += dr.textlength(part, font=f)
        if i < len(parts) - 1:
            x -= f.size * 0.11
            dr.text((x, y), ",", font=f, fill=fill)
            x += dr.textlength(",", font=f)


def split_grid(path: Path, n: int):
    im = Image.open(path).convert("RGB")
    cw, ch = im.width // n, im.height // n
    for r in range(n):
        for c in range(n):
            yield im.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch))


def square(img: Image.Image, size: int, fill: float) -> Image.Image:
    img = img.copy()
    img.thumbnail((int(size * fill), int(size * fill)), Image.LANCZOS)
    c = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    c.alpha_composite(img, ((size - img.width) // 2, (size - img.height) // 2))
    return c


def icons():
    out = ROOT / "icons"
    for sheet, names in (("sheet-1.png", ICONS_1), ("sheet-2.png", ICONS_2)):
        for cell, name in zip(split_grid(out / sheet, 3), names):
            ic = square(trim(cutout(cell, thresh=14)), 512, 0.86)
            ic.save(out / f"icon-{name}.png")
            ic.resize((128, 128), Image.LANCZOS).save(out / f"icon-{name}-128.png")
    (out / "source").mkdir(exist_ok=True)
    for s in ("sheet-1.png", "sheet-2.png"):
        (out / s).rename(out / "source" / s)


def spots():
    out = ROOT / "illustrations"
    src = out / "sheet-empty-states.png"
    for cell, name in zip(split_grid(src, 2), SPOTS):
        sp = trim(cutout(cell, thresh=10), pad=24)
        sp.save(out / f"empty-{name}.png")
    (out / "source").mkdir(exist_ok=True)
    src.rename(out / "source" / src.name)


def splash():
    d = ROOT / "splash"
    stacked = Image.open(ROOT / "logo/aptoph-logo-stacked.png")
    for raw, name in (("raw-a.png", "aptoph-splash-background.png"),
                      ("raw-b.png", "aptoph-splash-background-alt.png")):
        if (d / raw).exists():
            (d / raw).rename(d / name)
    bg = Image.open(d / "aptoph-splash-background.png").convert("RGBA")
    logo = stacked.copy()
    logo.thumbnail((int(bg.width * 0.5), 10_000), Image.LANCZOS)
    bg.alpha_composite(logo, ((bg.width - logo.width) // 2, int(bg.height * 0.12)))
    t = font(40, 500)
    dr = ImageDraw.Draw(bg)
    tag = "Tu conjunto, más cerca"
    tw = dr.textlength(tag, font=t) - t.size * 0.11
    draw_text(dr, ((bg.width - tw) / 2, int(bg.height * 0.12) + logo.height + 30), tag, t, SLATE)
    bg.convert("RGB").save(d / "aptoph-splash.png")
    # Native splash (Flutter/Android 12): centered symbol on a flat colour.
    sym = Image.open(ROOT / "logo/aptoph-symbol.png")
    sq = Image.new("RGBA", (1152, 1152), (0, 0, 0, 0))
    s = sym.copy(); s.thumbnail((640, 640), Image.LANCZOS)
    sq.alpha_composite(s, ((1152 - s.width) // 2, (1152 - s.height) // 2))
    sq.save(d / "aptoph-splash-native-icon.png")


def cover(src: Path, size, logo_h, headline, sub, out: Path, crop_left=0.33, hs_ratio=0.075):
    W, H = size
    hero = Image.open(src).convert("RGBA")
    scale = H / hero.height
    hero = hero.resize((round(hero.width * scale), H), Image.LANCZOS)
    hero = hero.crop((int(hero.width * crop_left), 0, hero.width, H))
    # Fade the illustration's left edge into the cream background.
    fade = int(hero.width * 0.22)
    mask = Image.new("L", hero.size, 255)
    md = ImageDraw.Draw(mask)
    for i in range(fade):
        md.line([(i, 0), (i, H)], fill=int(255 * (i / fade) ** 1.4))
    hero.putalpha(Image.composite(hero.getchannel("A"), Image.new("L", hero.size, 0), mask))
    c = Image.new("RGBA", (W, H), CREAM + (255,))
    c.alpha_composite(hero, (W - hero.width, 0))
    logo = Image.open(ROOT / "logo/aptoph-logo-horizontal.png")
    logo = logo.resize((round(logo.width * logo_h / logo.height), logo_h), Image.LANCZOS)
    x = int(W * 0.05)
    y = int(H * 0.12)
    c.alpha_composite(logo, (x - int(logo_h * 0.15), y))
    dr = ImageDraw.Draw(c)
    hs = int(H * hs_ratio)
    y += logo_h + int(H * 0.05)
    for line in headline:
        draw_text(dr, (x, y), line, font(hs, 800), BLUE)
        y += int(hs * 1.18)
    if sub:
        y += int(hs * 0.3)
        draw_text(dr, (x, y), sub, font(int(hs * 0.5), 500), SLATE)
    c.convert("RGB").save(out)


def social():
    d = ROOT / "social"
    cover(ROOT / "hero/aptoph-hero-comunidad.png", (1200, 630), 110,
          ["La administración", "de tu conjunto,", "simple y cercana"],
          "Pagos, reservas, comunicados y más", d / "aptoph-og-image.png", crop_left=0.40)
    cover(ROOT / "hero/aptoph-hero-comunidad-alt.png", (1500, 500), 90,
          ["Tu conjunto, más cerca"], "Administración de propiedad horizontal",
          d / "aptoph-cover-1500x500.png", crop_left=0.30, hs_ratio=0.085)
    cover(ROOT / "hero/aptoph-hero-app-movil.png", (1584, 396), 80,
          ["Tu conjunto, más cerca"], None, d / "aptoph-cover-linkedin-1584x396.png", crop_left=0.30, hs_ratio=0.1)
    sym = Image.open(ROOT / "logo/aptoph-symbol.png")
    av = Image.new("RGBA", (1080, 1080), CREAM + (255,))
    s = sym.copy(); s.thumbnail((700, 700), Image.LANCZOS)
    av.alpha_composite(s, ((1080 - s.width) // 2, (1080 - s.height) // 2))
    av.convert("RGB").save(d / "aptoph-avatar-1080.png")


def webp():
    for folder in ("hero", "headers"):
        for p in (ROOT / folder).glob("*.png"):
            im = Image.open(p).convert("RGB")
            im.save(p.with_suffix(".webp"), quality=86, method=6)
            if folder == "hero":
                im.resize((960, 540), Image.LANCZOS).save(p.with_name(p.stem + "-960.webp"), quality=84, method=6)


if __name__ == "__main__":
    steps = sys.argv[3].split(",") if len(sys.argv) > 3 else ["icons", "spots", "splash", "social", "webp"]
    for st in steps:
        globals()[st]()
    print("done")
