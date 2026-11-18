"""Build the SVG logos: the vectorized symbol plus the wordmark converted to outlines.

usage: build_svg.py <symbol.svg> <PlusJakartaSans[wght].ttf> <out_dir>
"""
import re
import sys
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

SYMBOL, FONT, OUT = Path(sys.argv[1]), sys.argv[2], Path(sys.argv[3])
BLUE, MINT, MINT_TEXT, CORAL, WHITE, NIGHT = "#1E3A5F", "#3CC8A8", "#1F9E84", "#FF8A65", "#FFFFFF", "#102038"

src = SYMBOL.read_text()
VB = [float(v) for v in re.search(r'viewBox="([^"]+)"', src).group(1).split()]
# The symbol is drawn on a 1024 grid: whole-unit coordinates are invisible at logo sizes
# and take a third of the bytes of the tracer's three decimals.
PATHS = [
    re.sub(r"-?\d+\.\d+", lambda m: str(round(float(m.group(0)))), p)
    for p in re.findall(r"<path [^>]*/>", src)
]


def symbol_paths(tower_a, tower_b, window, light):
    colors = {"tower-a": tower_a, "tower-b": tower_b, "window": window, "light": light}
    out = []
    for p in PATHS:
        part = re.search(r'data-part="([^"]+)"', p).group(1)
        if colors[part] is None:
            continue
        p = re.sub(r'fill="[^"]+"', f'fill="{colors[part]}"', p, count=1)
        out.append(re.sub(r'\s*data-part="[^"]+"', "", p))
    return "".join(out)


font = instantiateVariableFont(TTFont(FONT), {"wght": 800})
glyphs = font.getGlyphSet()
cmap = font.getBestCmap()
UPM = font["head"].unitsPerEm
CAP = font["OS/2"].sCapHeight


def word_paths(text, color, x0, baseline, cap_px):
    """Outline paths for text, scaled so capitals are cap_px tall. Returns (svg, width)."""
    scale = cap_px / CAP
    x = 0.0
    d = []
    for ch in text:
        name = cmap[ord(ch)]
        pen = SVGPathPen(glyphs)
        glyphs[name].draw(TransformPen(pen, (scale, 0, 0, -scale, x0 + x, baseline)))
        d.append(re.sub(r"-?\d+\.\d+", lambda m: f"{float(m.group(0)):.1f}", pen.getCommands()))
        x += glyphs[name].width * scale
    return f'<path fill="{color}" d="{" ".join(d)}"/>', x


def symbol_group(x, y, h, colors):
    s = h / VB[3]
    return (f'<g transform="translate({x:.2f} {y:.2f}) scale({s:.5f}) translate({-VB[0]} {-VB[1]})">'
            f"{symbol_paths(*colors)}</g>")


def svg(w, h, body):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.0f} {h:.0f}" role="img" '
            f'aria-label="AptoPH">{body}</svg>\n')


def horizontal(colors, apto, ph):
    sh = 120  # symbol height
    sw = sh * VB[2] / VB[3]
    cap = 52
    gap = 24
    baseline = sh * 0.5 + cap / 2 + 2
    a, aw = word_paths("Apto", apto, sw + gap, baseline, cap)
    p, pw = word_paths("PH", ph, sw + gap + aw + 2, baseline, cap)
    return svg(sw + gap + aw + 2 + pw + 2, sh, symbol_group(0, 0, sh, colors) + a + p)


def stacked(colors, apto, ph):
    sh = 160
    sw = sh * VB[2] / VB[3]
    cap = 50
    a_svg, aw = word_paths("Apto", apto, 0, 0, cap)
    _, pw = word_paths("PH", ph, 0, 0, cap)
    tw = aw + 2 + pw
    W = max(sw, tw) + 8
    baseline = sh + 28 + cap
    a, _ = word_paths("Apto", apto, (W - tw) / 2, baseline, cap)
    p, _ = word_paths("PH", ph, (W - tw) / 2 + aw + 2, baseline, cap)
    return svg(W, baseline + 14, symbol_group((W - sw) / 2, 0, sh, colors) + a + p)


def symbol_only(colors):
    return svg(VB[2], VB[3], symbol_group(0, 0, VB[3], colors))


COLOR = (BLUE, MINT, WHITE, CORAL)
REVERSE = (WHITE, MINT, NIGHT, CORAL)
MONO = (BLUE, BLUE, WHITE, WHITE)

OUT.mkdir(parents=True, exist_ok=True)
files = {
    "aptoph-logo-horizontal.svg": horizontal(COLOR, BLUE, MINT_TEXT),
    "aptoph-logo-horizontal-white.svg": horizontal(REVERSE, WHITE, MINT),
    "aptoph-logo-horizontal-mono.svg": horizontal(MONO, BLUE, BLUE),
    "aptoph-logo-stacked.svg": stacked(COLOR, BLUE, MINT_TEXT),
    "aptoph-logo-stacked-white.svg": stacked(REVERSE, WHITE, MINT),
    "aptoph-symbol.svg": symbol_only(COLOR),
    "aptoph-symbol-white.svg": symbol_only(REVERSE),
    "aptoph-symbol-mono.svg": symbol_only(MONO),
}
for name, content in files.items():
    (OUT / name).write_text(content)
print("wrote", len(files), "SVGs")
