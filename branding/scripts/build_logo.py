"""Build AptoPH logo, app icon and favicon assets from the chosen Layer symbol concept."""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, str(Path(__file__).parent))
from cutout import cutout, trim  # noqa: E402

ROOT = Path(sys.argv[1])  # branding/
FONT = sys.argv[2]

BLUE = (30, 58, 95)
MINT = (60, 200, 168)
MINT_TEXT = (31, 158, 132)  # darker mint for lettering on light backgrounds
CORAL = (255, 138, 101)
CREAM = (250, 247, 242)
WHITE = (255, 255, 255)
NAVY_DARK = (16, 32, 56)


def palette_snap(sym: Image.Image) -> tuple[Image.Image, np.ndarray]:
    """Snap every opaque pixel to the exact brand colour it is closest to."""
    a = np.asarray(sym).astype(np.float32)
    rgb, alpha = a[..., :3], a[..., 3]
    refs = np.array([BLUE, MINT, CORAL, WHITE], dtype=np.float32)
    dist = np.linalg.norm(rgb[..., None, :] - refs[None, None], axis=3)
    cls = dist.argmin(axis=2)
    out = refs[cls]
    img = Image.fromarray(np.dstack([out, alpha]).astype(np.uint8), "RGBA")
    return img, cls


def recolor(cls: np.ndarray, alpha: np.ndarray, mapping: dict) -> Image.Image:
    h, w = cls.shape
    out = np.zeros((h, w, 4), dtype=np.float32)
    for k, col in mapping.items():
        m = cls == k
        if col is None:
            continue
        out[m, :3] = col[:3]
        out[m, 3] = alpha[m] * (col[3] / 255 if len(col) == 4 else 1)
    return Image.fromarray(out.astype(np.uint8), "RGBA")


def font(size, weight):
    f = ImageFont.truetype(FONT, size)
    f.set_variation_by_axes([weight])
    return f


def wordmark(height: int, apto, ph) -> Image.Image:
    size = int(height * 1.35)
    f = font(size, 800)
    pad = size
    canvas = Image.new("RGBA", (size * 6, size * 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(canvas)
    d.text((pad // 4, pad // 4), "Apto", font=f, fill=apto)
    x = pad // 4 + d.textlength("Apto", font=f) + size * 0.02
    d.text((x, pad // 4), "PH", font=f, fill=ph)
    return trim(canvas)


def fit_h(img: Image.Image, h: int) -> Image.Image:
    return img.resize((round(img.width * h / img.height), h), Image.LANCZOS)


def horizontal(sym, apto, ph, bg=None):
    s = fit_h(sym, 400)
    wm = wordmark(220, apto, ph)
    wm = fit_h(wm, 190)
    gap, pad = 70, 60
    W = pad * 2 + s.width + gap + wm.width
    H = pad * 2 + s.height
    c = Image.new("RGBA", (W, H), bg or (0, 0, 0, 0))
    c.alpha_composite(s, (pad, pad))
    c.alpha_composite(wm, (pad + s.width + gap, pad + (s.height - wm.height) // 2 + 10))
    return c


def stacked(sym, apto, ph, bg=None):
    s = fit_h(sym, 520)
    wm = fit_h(wordmark(220, apto, ph), 200)
    gap, pad = 70, 80
    W = pad * 2 + max(s.width, wm.width)
    H = pad * 2 + s.height + gap + wm.height
    c = Image.new("RGBA", (W, H), bg or (0, 0, 0, 0))
    c.alpha_composite(s, ((W - s.width) // 2, pad))
    c.alpha_composite(wm, ((W - wm.width) // 2, pad + s.height + gap))
    return c


def square_on(sym, size, bg, scale=0.62, radius=0):
    c = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ImageDraw.Draw(c).rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=bg)
    s = sym.copy()
    s.thumbnail((int(size * scale), int(size * scale)), Image.LANCZOS)
    c.alpha_composite(s, ((size - s.width) // 2, (size - s.height) // 2))
    return c


def main():
    concept = Image.open(ROOT / "concepts/logo-symbol-4.png")
    raw = trim(cutout(concept, thresh=10))
    sym, cls = palette_snap(raw)
    alpha = np.asarray(raw)[..., 3].astype(np.float32)

    variants = {
        "color": sym,
        "white": recolor(cls, alpha, {0: WHITE, 1: MINT, 2: CORAL, 3: None}),
        "mono": recolor(cls, alpha, {0: BLUE, 1: BLUE, 2: BLUE, 3: None}),
    }
    # Mono: the mint tower would merge into the blue one, so separate them with its windows.
    logo = ROOT / "logo"
    for name, im in variants.items():
        out = im.copy()
        out.thumbnail((1024, 1024), Image.LANCZOS)
        sq = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
        sq.alpha_composite(out, ((1024 - out.width) // 2, (1024 - out.height) // 2))
        suffix = "" if name == "color" else f"-{name}"
        sq.save(logo / f"aptoph-symbol{suffix}.png")
        sq.resize((256, 256), Image.LANCZOS).save(logo / f"aptoph-symbol{suffix}-256.png")

    horizontal(sym, BLUE, MINT_TEXT).save(logo / "aptoph-logo-horizontal.png")
    horizontal(variants["white"], WHITE, MINT).save(logo / "aptoph-logo-horizontal-white.png")
    horizontal(variants["mono"], BLUE, BLUE).save(logo / "aptoph-logo-horizontal-mono.png")
    stacked(sym, BLUE, MINT_TEXT).save(logo / "aptoph-logo-stacked.png")
    stacked(variants["white"], WHITE, MINT).save(logo / "aptoph-logo-stacked-white.png")
    fit_h(wordmark(220, BLUE, MINT_TEXT), 240).save(logo / "aptoph-wordmark.png")
    fit_h(wordmark(220, WHITE, MINT), 240).save(logo / "aptoph-wordmark-white.png")

    icon = ROOT / "app-icon"
    full = square_on(sym, 1024, CREAM + (255,), scale=0.66)
    full.save(icon / "aptoph-app-icon-1024.png")
    for s in (512, 192, 180):
        full.resize((s, s), Image.LANCZOS).save(icon / f"aptoph-app-icon-{s}.png")
    square_on(sym, 1024, CREAM + (255,), scale=0.62, radius=230).save(icon / "aptoph-app-icon-rounded-1024.png")
    # Android adaptive icon: foreground in the 66% safe zone, flat background colour.
    square_on(sym, 1024, (0, 0, 0, 0), scale=0.48).save(icon / "aptoph-adaptive-foreground.png")
    Image.new("RGBA", (1024, 1024), CREAM + (255,)).save(icon / "aptoph-adaptive-background.png")
    dark = square_on(variants["white"], 1024, NAVY_DARK + (255,), scale=0.66)
    dark.save(icon / "aptoph-app-icon-dark-1024.png")

    fav = square_on(sym, 256, (0, 0, 0, 0), scale=0.96)
    fav.save(icon / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
    fav.resize((32, 32), Image.LANCZOS).save(icon / "favicon-32.png")
    print("logo + icons built")


if __name__ == "__main__":
    main()
