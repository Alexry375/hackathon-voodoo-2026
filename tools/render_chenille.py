"""Render the Castle Clashers wooden cradle + tank-tread footprint (chenille)
to match the reference frame at assets/Castle Clashers Assets/clip2_001.png.

Output: assets/Castle Clashers Assets/Chenille.png
"""
from PIL import Image, ImageDraw
from pathlib import Path
import math

# Slightly wider than castle PNG (731) to give a bit of overhang on each side.
W, H = 760, 220
OUT = Path(__file__).parent.parent / "assets" / "Castle Clashers Assets" / "Chenille.png"

# Palette (reference is terracotta/orange wood, dark chocolate outlines, near-black treads).
OUTLINE     = (44, 28, 18, 255)
WOOD_LIGHT  = (224, 140, 78, 255)   # warm terracotta top
WOOD_MID    = (200, 110, 56, 255)   # main body
WOOD_DARK   = (158, 78, 38, 255)    # bottom band / shading
ARCH_DARK   = (96, 46, 22, 255)     # arch interior (warm shadow, not pure black)
ARCH_BLACK  = (40, 24, 14, 255)     # deepest arch shadow
TREAD_BODY  = (62, 60, 60, 255)     # tread main grey
TREAD_LIGHT = (110, 108, 106, 255)  # cleat highlight
TREAD_DARK  = (32, 30, 30, 255)     # cleat shadow / outline

img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

# ---------------- wooden cradle (top section) -------------------------------
CRADLE_X0 = 80
CRADLE_X1 = W - 80
CRADLE_Y0 = 6
CRADLE_Y1 = 110
CRADLE_W  = CRADLE_X1 - CRADLE_X0
CRADLE_H  = CRADLE_Y1 - CRADLE_Y0

# main body
d.rectangle([CRADLE_X0, CRADLE_Y0, CRADLE_X1, CRADLE_Y1], fill=WOOD_MID)

# top highlight band (lit edge)
d.rectangle([CRADLE_X0 + 4, CRADLE_Y0 + 4, CRADLE_X1 - 4, CRADLE_Y0 + 22], fill=WOOD_LIGHT)

# bottom shadow band (where it meets the treads)
d.rectangle([CRADLE_X0, CRADLE_Y1 - 26, CRADLE_X1, CRADLE_Y1], fill=WOOD_DARK)

# two short rounded arches (semicircular tops, short jambs)
ARCH_W = int(CRADLE_W * 0.22)
ARCH_H = int(CRADLE_H * 0.55)
ARCH_BOTTOM = CRADLE_Y1 - 14
for cx_frac in (0.28, 0.72):
    cx = CRADLE_X0 + int(CRADLE_W * cx_frac)
    ax0 = cx - ARCH_W // 2
    ax1 = cx + ARCH_W // 2
    arch_top = ARCH_BOTTOM - ARCH_H
    arc_diameter = ARCH_W
    arc_top_y = arch_top
    arc_bot_y = arch_top + arc_diameter
    # arch shape: rectangle bottom + semicircle top
    d.rectangle([ax0, arch_top + ARCH_W // 2, ax1, ARCH_BOTTOM], fill=ARCH_DARK)
    d.pieslice([ax0, arc_top_y, ax1, arc_bot_y], 180, 360, fill=ARCH_DARK)
    # inner deep-shadow (smaller, offset down-right) to give the dark-mouth look
    inset = max(6, ARCH_W // 9)
    d.rectangle([ax0 + inset, arch_top + ARCH_W // 2 + inset // 2, ax1 - inset, ARCH_BOTTOM],
                fill=ARCH_BLACK)
    d.pieslice([ax0 + inset, arc_top_y + inset, ax1 - inset, arc_bot_y - inset],
               180, 360, fill=ARCH_BLACK)
    # outline (rectangle sides + arc top)
    d.line([(ax0, ARCH_BOTTOM), (ax0, arch_top + ARCH_W // 2)], fill=OUTLINE, width=4)
    d.line([(ax1, ARCH_BOTTOM), (ax1, arch_top + ARCH_W // 2)], fill=OUTLINE, width=4)
    d.arc([ax0, arc_top_y, ax1, arc_bot_y], 180, 360, fill=OUTLINE, width=4)

# main cradle outline
d.rectangle([CRADLE_X0, CRADLE_Y0, CRADLE_X1, CRADLE_Y1], outline=OUTLINE, width=5)

# ---------------- tank treads (two separate flat ovals) ---------------------
# Each tread is a wide rounded rectangle with chain-link cleats around the rim.
TREAD_Y_TOP = CRADLE_Y1 - 6
TREAD_W = int(CRADLE_W * 0.40)
TREAD_H = 88
TREAD_GAP = int(CRADLE_W * 0.06)
TREAD_TOTAL = TREAD_W * 2 + TREAD_GAP
TREAD_X_OFFSET = (CRADLE_W - TREAD_TOTAL) // 2

def draw_tread(x0):
    y0 = TREAD_Y_TOP
    x1 = x0 + TREAD_W
    y1 = y0 + TREAD_H
    radius = TREAD_H // 2

    # main rounded-rectangle body
    d.rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=TREAD_BODY)

    # chain-link cleats around the perimeter — alternating light/dark tiles.
    # Generate evenly spaced anchor points along the rounded-rect outline.
    perim_pts = []
    # top straight
    n_top = 14
    for i in range(n_top):
        t = (i + 0.5) / n_top
        perim_pts.append((x0 + radius + (TREAD_W - 2 * radius) * t, y0, 0))  # angle 0 = up
    # right cap (sweep from top to bottom along the right semicircle)
    n_cap = 8
    cx_r = x1 - radius
    for i in range(n_cap):
        t = (i + 0.5) / n_cap
        a = -math.pi / 2 + math.pi * t
        perim_pts.append((cx_r + math.cos(a) * radius, y0 + radius + math.sin(a) * radius, a + math.pi / 2))
    # bottom straight (right to left)
    for i in range(n_top):
        t = (i + 0.5) / n_top
        perim_pts.append((x1 - radius - (TREAD_W - 2 * radius) * t, y1, math.pi))
    # left cap (bottom to top)
    cx_l = x0 + radius
    for i in range(n_cap):
        t = (i + 0.5) / n_cap
        a = math.pi / 2 + math.pi * t
        perim_pts.append((cx_l + math.cos(a) * radius, y0 + radius + math.sin(a) * radius, a + math.pi / 2))

    # draw small radial cleats (rectangles oriented along the tangent)
    cleat_long = 14
    cleat_short = 8
    for i, (px, py, angle) in enumerate(perim_pts):
        color = TREAD_LIGHT if i % 2 == 0 else TREAD_DARK
        # build a rotated rectangle as a polygon
        cos_a, sin_a = math.cos(angle), math.sin(angle)
        # local axes: tangent direction = (cos_a, sin_a) is along the perimeter? we
        # used angle = (radial direction + π/2) so tangent is perpendicular to radial.
        # Use cleat_long along the tangent (perpendicular to radial), cleat_short radial.
        tx, ty = -sin_a, cos_a  # tangent
        rx, ry = cos_a, sin_a   # radial (pointing OUT of center, but we used radial-up)
        hl, hs = cleat_long / 2, cleat_short / 2
        poly = [
            (px + tx * hl + rx * hs, py + ty * hl + ry * hs),
            (px + tx * hl - rx * hs, py + ty * hl - ry * hs),
            (px - tx * hl - rx * hs, py - ty * hl - ry * hs),
            (px - tx * hl + rx * hs, py - ty * hl + ry * hs),
        ]
        d.polygon(poly, fill=color, outline=TREAD_DARK)

    # inner darker oval (gives the "tread cavity" look)
    inner_pad = 10
    d.rounded_rectangle([x0 + inner_pad, y0 + inner_pad, x1 - inner_pad, y1 - inner_pad],
                        radius=radius - inner_pad, fill=TREAD_DARK)
    # subtle highlight stripe across top of inner cavity
    d.rounded_rectangle([x0 + inner_pad + 4, y0 + inner_pad + 4,
                         x1 - inner_pad - 4, y0 + inner_pad + 14],
                        radius=6, fill=TREAD_BODY)

    # outer outline
    d.rounded_rectangle([x0, y0, x1, y1], radius=radius, outline=OUTLINE, width=4)

draw_tread(CRADLE_X0 + TREAD_X_OFFSET)
draw_tread(CRADLE_X0 + TREAD_X_OFFSET + TREAD_W + TREAD_GAP)

OUT.parent.mkdir(parents=True, exist_ok=True)
img.save(OUT)
print(f"wrote {OUT} ({W}x{H})")
