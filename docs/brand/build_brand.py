"""Builds the AptoPH logo SVG set into docs/brand/logo.

Symbol: redrawn geometrically from the Layer concept (docs/brand/concepts/r-symbol-2.webp).
Wordmark: Outfit (SIL OFL) SemiBold, outlined to paths so it renders without the font.
"""
import sys
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

FONT, OUT = Path(sys.argv[1]), Path(sys.argv[2])
OUT.mkdir(parents=True, exist_ok=True)

NAVY, TEAL, WHITE = "#0F1B3D", "#14B8A6", "#FFFFFF"

# ---------------------------------------------------------------- symbol
# Coordinates in a 1024 grid, mirrored around x = 512.
LEFT_TOWER = [(487, 198), (487, 438), (328, 780), (178, 780), (334, 302)]
WINDOW = [(384, 330), (434, 297), (431, 352), (379, 386)]
WINDOW_STEP = (-12, 105)
PANES = [(456, 579), (520, 579), (456, 640), (520, 640)]
PANE = 48


def mirror(points):
    return [(1024 - x, y) for x, y in points]


def poly(points):
    return "M" + " L".join(f"{x:g} {y:g}" for x, y in points) + " Z"


def tower_path():
    windows = []
    for i in range(3):
        dx, dy = WINDOW_STEP[0] * i, WINDOW_STEP[1] * i
        # reversed winding so windows are holes with nonzero fill too
        windows.append(list(reversed([(x + dx, y + dy) for x, y in WINDOW])))
    left = poly(LEFT_TOWER) + " " + " ".join(poly(w) for w in windows)
    right = poly(list(reversed(mirror(LEFT_TOWER)))) + " " + " ".join(
        poly(list(reversed(mirror(w)))) for w in windows
    )
    return left + " " + right


def panes_svg(color):
    return "".join(
        f'<rect x="{x}" y="{y}" width="{PANE}" height="{PANE}" rx="5" fill="{color}"/>' for x, y in PANES
    )


def symbol_group(tower, accent):
    return f'<path fill="{tower}" fill-rule="evenodd" d="{tower_path()}"/>{panes_svg(accent)}'


SYM_X0, SYM_X1, SYM_Y0, SYM_Y1 = 178, 846, 198, 780
SYM_W, SYM_H = SYM_X1 - SYM_X0, SYM_Y1 - SYM_Y0

# ---------------------------------------------------------------- wordmark
font = TTFont(FONT)
font = instantiateVariableFont(font, {"wght": 600})
glyphset = font.getGlyphSet()
cmap = font.getBestCmap()
hmtx = font["hmtx"]
CAP = font["OS/2"].sCapHeight


def text_path(text, scale, x, baseline, tracking=0.0):
    """Returns (svg path d, advance width) for `text`, origin at (x, baseline)."""
    parts = []
    cursor = 0.0
    for ch in text:
        name = cmap[ord(ch)]
        pen = SVGPathPen(glyphset)
        tpen = TransformPen(pen, (scale, 0, 0, -scale, x + cursor * scale, baseline))
        glyphset[name].draw(tpen)
        parts.append(pen.getCommands())
        cursor += hmtx[name][0] + tracking
    return " ".join(parts), (cursor - tracking) * scale


def wordmark(scale, x, baseline, apto, ph):
    d1, w1 = text_path("Apto", scale, x, baseline, tracking=-10)
    d2, w2 = text_path("PH", scale, x + w1 + (-10 + 6) * scale, baseline, tracking=10)
    svg = f'<path fill="{apto}" d="{d1}"/><path fill="{ph}" d="{d2}"/>'
    return svg, w1 + w2 + (-4) * scale


def svg_doc(view, body, title):
    x, y, w, h = view
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x:g} {y:g} {w:g} {h:g}" '
        f'role="img" aria-label="{title}"><title>{title}</title>{body}</svg>\n'
    )


def write(name, content):
    (OUT / name).write_text(content)
    print("wrote", name)


# ---- symbol variants (square viewBox, ~8% margin)
pad = 60
side = max(SYM_W, SYM_H) + 2 * pad
cx, cy = (SYM_X0 + SYM_X1) / 2, (SYM_Y0 + SYM_Y1) / 2
sym_view = (cx - side / 2, cy - side / 2, side, side)
write("aptoph-symbol.svg", svg_doc(sym_view, symbol_group(NAVY, TEAL), "AptoPH"))
write("aptoph-symbol-white.svg", svg_doc(sym_view, symbol_group(WHITE, TEAL), "AptoPH"))
write("aptoph-symbol-mono.svg", svg_doc(sym_view, symbol_group(NAVY, NAVY), "AptoPH"))

# ---- horizontal lockup: cap height = 56% of symbol height, centred on it
cap_h = SYM_H * 0.56
scale = cap_h / CAP
baseline = cy + cap_h / 2
gap = SYM_W * 0.13
tx = SYM_X1 + gap
for suffix, apto, ph, tower, accent in [
    ("", NAVY, TEAL, NAVY, TEAL),
    ("-white", WHITE, TEAL, WHITE, TEAL),
    ("-mono", NAVY, NAVY, NAVY, NAVY),
]:
    words, width = wordmark(scale, tx, baseline, apto, ph)
    margin = 40
    view = (SYM_X0 - margin, SYM_Y0 - margin, tx + width - SYM_X0 + 2 * margin, SYM_H + 2 * margin)
    write(f"aptoph-logo-horizontal{suffix}.svg", svg_doc(view, symbol_group(tower, accent) + words, "AptoPH"))

# ---- stacked lockup: wordmark under the symbol
cap_h2 = SYM_H * 0.34
scale2 = cap_h2 / CAP
_, w_probe = wordmark(scale2, 0, 0, NAVY, TEAL)
baseline2 = SYM_Y1 + SYM_H * 0.16 + cap_h2
tx2 = cx - w_probe / 2
desc = SYM_H * 0.1  # room for the "p" descender
for suffix, apto, ph, tower, accent in [("", NAVY, TEAL, NAVY, TEAL), ("-white", WHITE, TEAL, WHITE, TEAL)]:
    words, width = wordmark(scale2, tx2, baseline2, apto, ph)
    left = min(SYM_X0, tx2) - 40
    right = max(SYM_X1, tx2 + width) + 40
    view = (left, SYM_Y0 - 40, right - left, baseline2 + desc + 40 - (SYM_Y0 - 40))
    write(f"aptoph-logo-stacked{suffix}.svg", svg_doc(view, symbol_group(tower, accent) + words, "AptoPH"))

# ---- app icons: symbol at ~62% of the tile
tile = side / 0.62 * (SYM_H / side) if False else max(SYM_W, SYM_H) / 0.62
tview = (cx - tile / 2, cy - tile / 2 + 10, tile, tile)
body = f'<rect x="{tview[0]:g}" y="{tview[1]:g}" width="{tile:g}" height="{tile:g}" fill="{NAVY}"/>'
write("aptoph-app-icon.svg", svg_doc(tview, body + symbol_group(WHITE, TEAL), "AptoPH"))
r = tile * 0.225
body_r = f'<rect x="{tview[0]:g}" y="{tview[1]:g}" width="{tile:g}" height="{tile:g}" rx="{r:g}" fill="{NAVY}"/>'
write("aptoph-app-icon-rounded.svg", svg_doc(tview, body_r + symbol_group(WHITE, TEAL), "AptoPH"))

# ---- Open Graph / social card (1200x630): white logo + tagline on navy
OG_W, OG_H = 1200, 630
logo_scale = 150 / SYM_H  # symbol 150 px tall
words, width = wordmark(scale, tx, baseline, WHITE, TEAL)
logo_w = (tx + width - SYM_X0) * logo_scale
lx, ly = 90, 120
logo = (
    f'<g transform="translate({lx:g} {ly:g}) scale({logo_scale:.5f}) translate({-SYM_X0} {-SYM_Y0})">'
    f"{symbol_group(WHITE, TEAL)}{words}</g>"
)
tag_scale = 52 / CAP
line1, _ = text_path("Software de administración", tag_scale, lx, 420)
line2, _ = text_path("de propiedad horizontal", tag_scale, lx, 490)
small_scale = 24 / CAP
foot, _ = text_path(
    "Cartera · Pagos · Zonas comunes · PQRS · Portería · Documentos", small_scale, lx, 560
)
og_body = (
    f'<rect width="{OG_W}" height="{OG_H}" fill="{NAVY}"/>'
    f'<circle cx="1080" cy="80" r="360" fill="{TEAL}" opacity="0.12"/>'
    f'<rect x="{lx}" y="330" width="72" height="6" rx="3" fill="{TEAL}"/>'
    f"{logo}"
    f'<path fill="{WHITE}" d="{line1} {line2}"/>'
    f'<path fill="#B3BFDD" d="{foot}"/>'
)
write("aptoph-og-image.svg", svg_doc((0, 0, OG_W, OG_H), og_body, "AptoPH"))
