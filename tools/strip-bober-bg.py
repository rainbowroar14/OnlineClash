"""
Boberdino card/sprite PNG: conservative backdrop removal + tight crop (looks more zoomed in).

Only removes pixels that read as flat checker/light studio BG. Anything with noticeable
saturation/chroma stays (fuselage silver, crocodile, props, decals, wires).
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image


def bbox_crop(rgba: np.ndarray, pad: int = 5) -> np.ndarray:
    a = rgba[:, :, 3]
    ys, xs = np.where(a > 12)
    if ys.size == 0:
        return rgba
    h, w = rgba.shape[:2]
    y0, y1 = max(0, int(ys.min()) - pad), min(h, int(ys.max()) + 1 + pad)
    x0, x1 = max(0, int(xs.min()) - pad), min(w, int(xs.max()) + 1 + pad)
    return rgba[y0:y1, x0:x1]


def strip_and_crop(rgb: np.ndarray) -> np.ndarray:
    r = rgb[..., 0].astype(np.float32)
    g = rgb[..., 1].astype(np.float32)
    b = rgb[..., 2].astype(np.float32)
    mn = np.minimum(np.minimum(r, g), b)
    mx = np.maximum(np.maximum(r, g), b)
    chroma = mx - mn
    light = (r + g + b) / 3.0

    # Pure backdrop cells are nearly achromatic (~0–11). Silver fuselage is usually higher chroma.
    flat_grey = (chroma <= 11) & (light > 82) & (light < 254)
    white_tile = (r >= 205) & (g >= 205) & (b >= 205)

    # Slightly brighter flat light greys (some exports)
    flat_grey2 = (chroma <= 14) & (light > 93) & (light < 250) & (mx < 246)

    candidate = flat_grey | white_tile | flat_grey2

    # Never delete likely subject matter
    croc = (g >= r + 4) | (chroma >= 42) | ((mx - mn) > 38)
    metal_highlight = chroma > 20
    dark_detail = mn < 70
    warm_metal = (r > g + 2) | (r > b + 2)
    saturated = chroma > 13

    keep = croc | metal_highlight | dark_detail | warm_metal | saturated

    remove = candidate & ~keep

    alpha = np.where(remove, 0, 255).astype(np.uint8)
    return np.dstack([rgb.astype(np.uint8), alpha])


def main() -> None:
    src = Path(sys.argv[1])
    dst = Path(sys.argv[2])

    img = Image.open(src)
    if img.mode == "RGBA":
        base = np.array(img)
        op = base[:, :, 3]
        if np.mean(op) > 253:
            rgb = np.array(Image.open(src).convert("RGB"))
            out = strip_and_crop(rgb)
        else:
            out = base
            out[out[:, :, 3] < 8] = [0, 0, 0, 0]
    else:
        rgb = np.array(img.convert("RGB"))
        out = strip_and_crop(rgb)

    out = bbox_crop(out, pad=5)
    tr = np.mean(out[:, :, 3] == 0) * 100
    print(f"transparent {tr:.1f}% | output {out.shape[1]}x{out.shape[0]}")
    Image.fromarray(out, "RGBA").save(dst, optimize=True)


if __name__ == "__main__":
    main()
