"""Remove a flat background colour from an image, keeping interior holes opaque.

The background is the region of near-bg pixels connected to the image border. Edge pixels
are un-mixed against the background so anti-aliasing survives without a cream halo.
"""
import numpy as np
from PIL import Image
from scipy import ndimage


def cutout(img: Image.Image, thresh: float = 14.0) -> Image.Image:
    rgb = np.asarray(img.convert("RGB")).astype(np.float32)
    h, w, _ = rgb.shape
    border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
    bg = np.median(border, axis=0)
    d = np.linalg.norm(rgb - bg, axis=2)

    near = d < thresh
    labels, _ = ndimage.label(near)
    edge_labels = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
    edge_labels = edge_labels[edge_labels != 0]
    bgmask = np.isin(labels, edge_labels)

    alpha = np.where(bgmask, 0.0, 1.0)
    # Un-mix the anti-aliased ring next to the background.
    ring = ndimage.binary_dilation(bgmask, iterations=3) & ~bgmask
    dmax = ndimage.maximum_filter(np.where(bgmask, 0, d), size=7)
    a = np.clip(d / np.maximum(dmax, 1e-3), 0, 1)
    alpha = np.where(ring, a, alpha)
    out = rgb.copy()
    safe = np.maximum(alpha, 1e-3)[..., None]
    unmixed = (rgb - (1 - alpha[..., None]) * bg) / safe
    out = np.where(ring[..., None], np.clip(unmixed, 0, 255), out)
    rgba = np.dstack([out, alpha * 255]).astype(np.uint8)
    return Image.fromarray(rgba, "RGBA")


def trim(img: Image.Image, pad: int = 0) -> Image.Image:
    box = img.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
    img = img.crop(box)
    if pad:
        c = Image.new("RGBA", (img.width + 2 * pad, img.height + 2 * pad), (0, 0, 0, 0))
        c.paste(img, (pad, pad))
        img = c
    return img
