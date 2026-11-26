"""
Draws the art for the built-in Dragon's Hoard set as SVG files in images/.
Run from the repo folder:  python3 tools/make_art.py

Every creature here is original. Each one is described by a few settings
(colours, stage, horns, wings, tail tip), and the scene behind it is drawn
from its type. "framed" art is 4:3 for normal cards, "full" art is portrait
for full-picture cards.
"""
import math, os, random

OUT = os.path.join(os.path.dirname(__file__), "..", "images")
os.makedirs(OUT, exist_ok=True)
INK = "#1d1426"

# ------------------------------------------------------------------ scenes
SCENES = {
    "Fire":     dict(sky=("#2a0f2e", "#b3262f", "#ff8a3d"), far="#5a1630", near="#2b0d1c", sun="#ffd36b", bits="ember"),
    "Water":    dict(sky=("#0b2a4a", "#1f6fa8", "#7fd3e8"), far="#1d5a86", near="#0f3a5e", sun="#e9fbff", bits="bubble"),
    "Grass":    dict(sky=("#163b3a", "#3f8f6a", "#c9e98a"), far="#2f6d4d", near="#1d4a34", sun="#fff3b0", bits="leaf"),
    "Electric": dict(sky=("#141a3a", "#3b3f8f", "#f6d743"), far="#2a2f6b", near="#171b42", sun="#fff6a8", bits="spark"),
    "Ghost":    dict(sky=("#0c0b22", "#2e1f5c", "#7c5cc4"), far="#241a4a", near="#130f2c", sun="#efe9ff", bits="star"),
    "Rock":     dict(sky=("#3a2418", "#a8643a", "#f2c38b"), far="#7a4a2c", near="#4a2c1a", sun="#fff0cf", bits="dust"),
    "Normal":   dict(sky=("#3d5a8a", "#88b6e6", "#f8e9c8"), far="#6f93b8", near="#4f7a5a", sun="#fffbe8", bits="petal"),
    "Dragon":   dict(sky=("#08142b", "#1d3f6e", "#3fd6b0"), far="#16305a", near="#0b1b38", sun="#e8fff7", bits="aurora"),
    "Void":     dict(sky=("#020108", "#1a0b3a", "#5a1a7a"), far="#12082a", near="#07040f", sun="#e9d8ff", bits="star"),
    "Gold":     dict(sky=("#3a2606", "#a8740f", "#ffe08a"), far="#7a520c", near="#4a3206", sun="#fff7d6", bits="glint"),
}

def ridge(rng, w, base, amp, n, h):
    pts = [(0, h)]
    for i in range(n + 1):
        x = w * i / n
        pts.append((x, base - amp * (0.4 + 0.6 * rng.random())))
    pts.append((w, h))
    return " ".join(f"{x:.0f},{y:.0f}" for x, y in pts)

def particles(rng, kind, w, h, count, color):
    out = []
    for _ in range(count):
        x, y = rng.uniform(0, w), rng.uniform(0, h * 0.85)
        r = rng.uniform(1.5, 4.5)
        if kind == "ember":
            out.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{r:.1f}" fill="#ffb347" opacity="{rng.uniform(.4,.9):.2f}"/>')
        elif kind == "bubble":
            out.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{r*1.6:.1f}" fill="none" stroke="#e9fbff" stroke-width="1.5" opacity=".6"/>')
        elif kind == "leaf":
            a = rng.uniform(0, 180)
            out.append(f'<ellipse cx="{x:.0f}" cy="{y:.0f}" rx="{r*2:.1f}" ry="{r:.1f}" fill="#bfe37a" opacity=".7" transform="rotate({a:.0f} {x:.0f} {y:.0f})"/>')
        elif kind == "spark":
            out.append(f'<path d="M{x:.0f} {y:.0f} l4 -10 l-2 8 l6 -2 l-6 12 l2 -8 z" fill="#fff6a8" opacity=".8"/>')
        elif kind in ("star", "glint", "aurora"):
            c = {"star": "#ffffff", "glint": "#fff7d6", "aurora": "#d8fff3"}[kind]
            out.append(f'<path d="M{x:.0f} {y-r*2:.0f} Q{x:.0f} {y:.0f} {x+r*2:.0f} {y:.0f} Q{x:.0f} {y:.0f} {x:.0f} {y+r*2:.0f} Q{x:.0f} {y:.0f} {x-r*2:.0f} {y:.0f} Q{x:.0f} {y:.0f} {x:.0f} {y-r*2:.0f}z" fill="{c}" opacity="{rng.uniform(.5,1):.2f}"/>')
        elif kind == "dust":
            out.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{r*.7:.1f}" fill="#fff0cf" opacity=".5"/>')
        else:  # petal
            out.append(f'<ellipse cx="{x:.0f}" cy="{y:.0f}" rx="{r*1.4:.1f}" ry="{r*.8:.1f}" fill="#ffd1e6" opacity=".8"/>')
    return "".join(out)

def scene(kind, w, h, seed, fancy=False):
    s, rng = SCENES[kind], random.Random(seed)
    a, b, c = s["sky"]
    g = f'''<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{a}"/><stop offset=".6" stop-color="{b}"/><stop offset="1" stop-color="{c}"/></linearGradient>
      <radialGradient id="glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="{s['sun']}" stop-opacity=".9"/><stop offset="1" stop-color="{s['sun']}" stop-opacity="0"/></radialGradient></defs>
      <rect width="{w}" height="{h}" fill="url(#sky)"/>'''
    sx, sy = w * rng.uniform(.62, .8), h * rng.uniform(.18, .3)
    if fancy:  # sunbeams behind everything
        rays = "".join(f'<path d="M{sx:.0f} {sy:.0f} L{sx + math.cos(t) * w * 2:.0f} {sy + math.sin(t) * w * 2:.0f} L{sx + math.cos(t + .09) * w * 2:.0f} {sy + math.sin(t + .09) * w * 2:.0f}z" fill="{s["sun"]}" opacity=".10"/>'
                       for t in [i * math.pi / 9 for i in range(18)])
        g += rays
    if kind == "Dragon":  # aurora ribbons
        for i in range(3):
            y0 = h * (.12 + i * .08)
            g += f'<path d="M0 {y0:.0f} C{w*.3:.0f} {y0-40:.0f} {w*.6:.0f} {y0+50:.0f} {w} {y0-10:.0f}" stroke="{["#3fd6b0","#7af6ff","#b38cff"][i]}" stroke-width="{18-i*4}" fill="none" opacity=".35" stroke-linecap="round"/>'
    g += f'<circle cx="{sx:.0f}" cy="{sy:.0f}" r="{w*.28:.0f}" fill="url(#glow)"/><circle cx="{sx:.0f}" cy="{sy:.0f}" r="{w*.07:.0f}" fill="{s["sun"]}"/>'
    if kind == "Void":  # nebula clouds and a ring planet
        for (nx, ny, rx, ry, col) in [(.25, .3, .5, .22, "#ff4fd8"), (.7, .45, .45, .2, "#7af6ff"), (.45, .15, .35, .12, "#b38cff")]:
            g += f'<ellipse cx="{w*nx:.0f}" cy="{h*ny:.0f}" rx="{w*rx:.0f}" ry="{h*ry:.0f}" fill="{col}" opacity=".18" transform="rotate(-18 {w*nx:.0f} {h*ny:.0f})"/>'
        g += f'<ellipse cx="{sx:.0f}" cy="{sy:.0f}" rx="{w*.16:.0f}" ry="{w*.035:.0f}" fill="none" stroke="#ffd84a" stroke-width="3" opacity=".7" transform="rotate(-20 {sx:.0f} {sy:.0f})"/>'
        g += particles(rng, "star", w, h, 60, "#fff")
    if kind == "Ghost":
        g += f'<circle cx="{sx + w*.03:.0f}" cy="{sy - w*.015:.0f}" r="{w*.065:.0f}" fill="{a}"/>'
    if kind == "Electric":
        for _ in range(2):
            x = rng.uniform(w * .05, w * .45)
            g += f'<path d="M{x:.0f} 0 l-14 {h*.12:.0f} l12 0 l-18 {h*.14:.0f}" stroke="#fff6a8" stroke-width="3" fill="none" opacity=".8"/>'
    g += f'<polygon points="{ridge(rng, w, h*.62, h*.22, 7, h)}" fill="{s["far"]}"/>'
    g += f'<polygon points="{ridge(rng, w, h*.78, h*.1, 5, h)}" fill="{s["near"]}"/>'
    if kind == "Water":
        for i in range(4):
            y = h * (.8 + i * .05)
            g += f'<path d="M0 {y:.0f} q{w/8:.0f} -10 {w/4:.0f} 0 t{w/4:.0f} 0 t{w/4:.0f} 0 t{w/4:.0f} 0" stroke="#bfefff" stroke-width="2" fill="none" opacity=".45"/>'
    g += particles(rng, s["bits"], w, h, 26 if fancy else 16, s["sun"])
    return g

# ------------------------------------------------------------------ creatures
TIPS = {
    "flame":   lambda c: f'<path d="M0 0 C-14 -10 -8 -34 6 -44 C2 -30 18 -28 14 -12 C24 -18 26 -4 18 6 C10 14 -4 12 0 0z" fill="#ffb347" stroke="{INK}" stroke-width="3"/><path d="M4 -4 C0 -14 4 -22 8 -26 C8 -16 14 -14 10 -4z" fill="#fff0a8"/>',
    "fin":     lambda c: f'<path d="M0 0 C-10 -30 10 -44 30 -40 C18 -28 22 -12 30 4 C16 2 8 6 0 0z" fill="{c}" stroke="{INK}" stroke-width="3"/>',
    "leaf":    lambda c: f'<path d="M0 0 C-6 -30 22 -46 40 -40 C34 -18 20 -2 0 0z" fill="#8fd16a" stroke="{INK}" stroke-width="3"/><path d="M2 -2 C12 -16 24 -28 36 -36" stroke="#3f7d2a" stroke-width="2" fill="none"/>',
    "bolt":    lambda c: f'<path d="M0 0 L10 -30 L2 -28 L18 -56 L12 -30 L22 -32 Z" fill="#ffe14d" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>',
    "wisp":    lambda c: f'<path d="M0 0 C-20 -10 -10 -40 10 -36 C0 -28 14 -20 24 -26 C24 -8 12 4 0 0z" fill="#c9b8ff" stroke="{INK}" stroke-width="3" opacity=".9"/>',
    "club":    lambda c: f'<circle cx="8" cy="-6" r="16" fill="{c}" stroke="{INK}" stroke-width="3"/><path d="M-2 -18 l4 -10 l4 10 M14 -20 l6 -8 l0 10 M20 -2 l10 -2 l-8 8" fill="{c}" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>',
    "puff":    lambda c: f'<circle cx="6" cy="-6" r="14" fill="#fff6ee" stroke="{INK}" stroke-width="3"/><circle cx="18" cy="-14" r="9" fill="#fff6ee" stroke="{INK}" stroke-width="3"/>',
    "crystal": lambda c: f'<path d="M0 0 L6 -40 L18 -48 L24 -8 Z" fill="#9ff3ff" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/><path d="M6 -40 L14 -6" stroke="#ffffff" stroke-width="2"/>',
}

def horns(style, c):
    if style == "curl":
        return f'<path d="M30 -80 C18 -112 -12 -116 -14 -94 C-2 -104 12 -98 14 -76z" fill="{c}" stroke="{INK}" stroke-width="3"/><path d="M58 -84 C58 -118 34 -128 24 -110 C38 -112 44 -100 42 -82z" fill="{c}" stroke="{INK}" stroke-width="3"/>'
    if style == "spike":
        return f'<path d="M28 -78 L4 -122 L44 -86z" fill="{c}" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/><path d="M56 -84 L52 -132 L72 -88z" fill="{c}" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>'
    if style == "antler":
        return f'<path d="M34 -80 L22 -116 M26 -104 L10 -112 M24 -110 L30 -126 M58 -84 L64 -122 M62 -108 L78 -114 M63 -116 L56 -132" stroke="{c}" stroke-width="7" stroke-linecap="round" fill="none"/><path d="M34 -80 L22 -116 M58 -84 L64 -122" stroke="{INK}" stroke-width="1.5" fill="none" opacity=".4"/>'
    if style == "fins":
        return f'<path d="M22 -74 C0 -100 10 -128 34 -122 C28 -106 34 -94 44 -82z" fill="{c}" stroke="{INK}" stroke-width="3"/><path d="M50 -82 C46 -112 66 -128 84 -114 C70 -106 68 -96 66 -82z" fill="{c}" stroke="{INK}" stroke-width="3"/>'
    if style == "nubs":
        return f'<ellipse cx="34" cy="-84" rx="9" ry="12" fill="{c}" stroke="{INK}" stroke-width="3"/><ellipse cx="60" cy="-88" rx="9" ry="12" fill="{c}" stroke="{INK}" stroke-width="3"/>'
    if style == "crown":
        return f'<path d="M20 -78 L14 -112 L30 -94 L40 -124 L50 -96 L64 -118 L62 -84z" fill="#ffd84a" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>'
    return ""

def creature(sp):
    """One dragon, drawn around (0,0), about 320 units wide, facing right."""
    st = sp["stage"]
    body, belly, wingc, dark = sp["body"], sp["belly"], sp["wing"], sp["dark"]
    head_r = {1: 48, 2: 42, 3: 38}[st]
    hx, hy = {1: (52, -44), 2: (62, -58), 3: (72, -72)}[st]
    wing_s = {1: .45, 2: .85, 3: 1.25}[st]
    out = []
    # tail with its tip
    tx, ty = -150 - st * 8, 6 - st * 6
    out.append(f'<path d="M-30 40 C-90 78 {tx+20} 70 {tx} {ty}" stroke="{INK}" stroke-width="{28+st*2}" fill="none" stroke-linecap="round"/>')
    out.append(f'<path d="M-30 40 C-90 78 {tx+20} 70 {tx} {ty}" stroke="{body}" stroke-width="{22+st*2}" fill="none" stroke-linecap="round"/>')
    out.append(f'<g transform="translate({tx} {ty}) rotate(-40) scale({.8+st*.15})">{TIPS[sp["tip"]](sp["accent"])}</g>')
    # back wing
    if sp.get("wings", True):
        out.append(f'<g transform="translate(-6 -30) scale({wing_s}) translate(6 30)"><path d="M-5 -35 C-40 -130 -130 -140 -150 -96 C-118 -92 -112 -76 -106 -64 C-90 -76 -72 -66 -66 -48 C-52 -58 -36 -48 -30 -30 Z" fill="{dark}" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/></g>')
    # back leg
    out.append(f'<ellipse cx="-34" cy="72" rx="20" ry="22" fill="{dark}" stroke="{INK}" stroke-width="3"/>')
    # back spikes
    if st >= 2:
        for i in range(4 + st):
            t = i / (3 + st)
            x, y = -40 + t * 90, -30 - math.sin(t * math.pi) * 16 + (0 if st == 2 else -6)
            out.append(f'<path d="M{x-8:.0f} {y+8:.0f} L{x:.0f} {y-14:.0f} L{x+8:.0f} {y+8:.0f}z" fill="{sp["accent"]}" stroke="{INK}" stroke-width="2.5" stroke-linejoin="round"/>')
    # body + belly
    out.append(f'<ellipse cx="0" cy="22" rx="{60+st*4}" ry="{56+st*3}" fill="{body}" stroke="{INK}" stroke-width="4"/>')
    out.append(f'<ellipse cx="14" cy="34" rx="{34+st*3}" ry="{38+st*2}" fill="{belly}"/>')
    for i in range(3):
        y = 16 + i * 18
        out.append(f'<path d="M{-12+i*2} {y} q26 8 52 0" stroke="{dark}" stroke-width="2.5" fill="none" opacity=".45"/>')
    # neck + head
    out.append(f'<path d="M20 -10 Q{hx-10} {hy+30} {hx} {hy}" stroke="{INK}" stroke-width="{46-st*4}" fill="none" stroke-linecap="round"/>')
    out.append(f'<path d="M20 -10 Q{hx-10} {hy+30} {hx} {hy}" stroke="{body}" stroke-width="{40-st*4}" fill="none" stroke-linecap="round"/>')
    out.append(f'<g transform="translate({hx-55} {hy+44})">{horns(sp["horns"], sp["accent"])}</g>')
    out.append(f'<circle cx="{hx}" cy="{hy}" r="{head_r}" fill="{body}" stroke="{INK}" stroke-width="4"/>')
    sx, sy = hx + head_r * .75, hy + head_r * .22
    out.append(f'<ellipse cx="{sx:.0f}" cy="{sy:.0f}" rx="{head_r*.6:.0f}" ry="{head_r*.44:.0f}" fill="{body}" stroke="{INK}" stroke-width="4"/>')
    out.append(f'<ellipse cx="{sx+head_r*.2:.0f}" cy="{sy+head_r*.1:.0f}" rx="{head_r*.38:.0f}" ry="{head_r*.25:.0f}" fill="{belly}"/>')
    out.append(f'<ellipse cx="{sx+head_r*.42:.0f}" cy="{sy-head_r*.14:.0f}" rx="3" ry="4" fill="{INK}"/>')
    out.append(f'<path d="M{sx-head_r*.1:.0f} {sy+head_r*.22:.0f} q{head_r*.3:.0f} {head_r*.16:.0f} {head_r*.6:.0f} 0" stroke="{INK}" stroke-width="3" fill="none" stroke-linecap="round"/>')
    # eye
    ex, ey = hx + head_r * .1, hy - head_r * .18
    er = {1: 14, 2: 12, 3: 11}[st]
    out.append(f'<ellipse cx="{ex:.0f}" cy="{ey:.0f}" rx="{er*.85:.0f}" ry="{er:.0f}" fill="#fff" stroke="{INK}" stroke-width="3"/>')
    out.append(f'<ellipse cx="{ex+2:.0f}" cy="{ey+1:.0f}" rx="{er*.5:.0f}" ry="{er*.7:.0f}" fill="{sp["eye"]}"/>')
    out.append(f'<ellipse cx="{ex+3:.0f}" cy="{ey+2:.0f}" rx="{er*.22:.0f}" ry="{er*.45:.0f}" fill="{INK}"/>')
    out.append(f'<circle cx="{ex+5:.0f}" cy="{ey-4:.0f}" r="3" fill="#fff"/>')
    if st == 3:
        out.append(f'<path d="M{ex-er:.0f} {ey-er*.7:.0f} L{ex+er:.0f} {ey-er*.35:.0f}" stroke="{INK}" stroke-width="4" stroke-linecap="round"/>')
    out.append(f'<ellipse cx="{hx-head_r*.25:.0f}" cy="{hy+head_r*.4:.0f}" rx="7" ry="4" fill="#ff8fa8" opacity=".55"/>')
    # front wing (lighter membrane)
    if sp.get("wings", True) and st >= 2:
        out.append(f'<g transform="translate(-20 -6) scale({wing_s*.8}) translate(20 6)"><path d="M-14 -12 C-30 -96 -100 -112 -118 -76 C-92 -74 -88 -60 -84 -50 C-70 -60 -56 -52 -52 -38 C-42 -46 -30 -38 -26 -24 Z" fill="{wingc}" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/></g>')
    elif sp.get("wings", True):
        out.append(f'<path d="M-18 -16 C-30 -46 -58 -50 -64 -34 C-52 -34 -50 -26 -48 -20 C-40 -26 -30 -22 -28 -12z" fill="{wingc}" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>')
    # front legs with claws
    for lx in (16, 52):
        out.append(f'<ellipse cx="{lx}" cy="{76+st*2}" rx="18" ry="14" fill="{body}" stroke="{INK}" stroke-width="3"/>')
        out.append(f'<path d="M{lx-8} {86+st*2} l-2 6 M{lx} {88+st*2} l0 6 M{lx+8} {86+st*2} l2 6" stroke="{INK}" stroke-width="2.5" stroke-linecap="round"/>')
    # extras
    for (x, y, r) in sp.get("spots", []):
        out.append(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{sp["accent"]}" opacity=".7"/>')
    if sp.get("ghostly"):
        return f'<g opacity=".92">{"".join(out)}</g>'
    return "".join(out)

def svg(sp, layout, art_seed, fancy=False, gold=False):
    w, h = (480, 360) if layout == "framed" else (500, 700)
    kind = "Gold" if gold else sp["scene"]
    bg = scene(kind, w, h, art_seed, fancy)
    s = {1: .78, 2: .9, 3: 1.0}[sp["stage"]] * (w / 480 if layout == "framed" else 1.45)
    cx, cy = (w * .55, h * .56) if layout == "framed" else (w * .6, h * .56)
    shadow = f'<ellipse cx="{cx-10:.0f}" cy="{cy + 98*s:.0f}" rx="{120*s:.0f}" ry="{14*s:.0f}" fill="#000" opacity=".28"/>'
    body = f'<g transform="translate({cx:.0f} {cy:.0f}) scale({s:.3f})">{creature(sp)}</g>'
    if gold:  # gold leaf: tint everything warm and add a sheen
        body = f'<g filter="url(#goldf)">{body}</g>'
        bg = f'<defs><filter id="goldf"><feColorMatrix type="matrix" values=".5 .55 .2 0 .22  .38 .45 .12 0 .14  .1 .15 .05 0 .02  0 0 0 1 0"/></filter></defs>' + bg
    vignette = f'<defs><radialGradient id="vig" cx=".5" cy=".45" r=".75"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></radialGradient></defs><rect width="{w}" height="{h}" fill="url(#vig)"/>'
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}">{bg}{shadow}{body}{vignette}</svg>\n'

# ------------------------------------------------------------------ the set
P = dict(  # colour sets
    ember=dict(body="#d8433a", belly="#ffd08a", wing="#ff9b6b", dark="#8f1f2a", accent="#3a1a24", eye="#ffcc33"),
    tide=dict(body="#2f8fd1", belly="#c8f1ff", wing="#8fe3ff", dark="#1b5a8f", accent="#e8fbff", eye="#21c7b5"),
    moss=dict(body="#5aa84a", belly="#f0e6a6", wing="#b7e38a", dark="#2f6b31", accent="#8a5a2b", eye="#ff9a3c"),
    volt=dict(body="#f2c230", belly="#fff6c8", wing="#ffe98a", dark="#b07d12", accent="#2b2f6b", eye="#4a7bff"),
    dusk=dict(body="#6b4fb0", belly="#d9ccff", wing="#a48ae6", dark="#3d2a73", accent="#c9b8ff", eye="#7dffd8"),
    crag=dict(body="#a07a58", belly="#ecd7b8", wing="#c9a27c", dark="#6a4a33", accent="#5a4636", eye="#ffb347"),
    cloud=dict(body="#f3eadf", belly="#ffd8e8", wing="#ffffff", dark="#c9b7a6", accent="#ff9cc4", eye="#5b8cff"),
    void=dict(body="#2a1650", belly="#7af6ff", wing="#b38cff", dark="#120a2a", accent="#ff4fd8", eye="#7af6ff"),
    aurex=dict(body="#1f9e8a", belly="#d8fff3", wing="#7af6d8", dark="#11695c", accent="#ffd84a", eye="#ff5c9a"),
)
def sp(name, pal, stage, scene, tip, horns, **kw):
    d = dict(P[pal]); d.update(name=name, stage=stage, scene=scene, tip=tip, horns=horns); d.update(kw); return d

SPECIES = {
    "kindlewing": sp("Kindlewing", "ember", 1, "Fire", "flame", "nubs", spots=[(-20, 0, 5), (-6, -14, 4)]),
    "scorchtail": sp("Scorchtail", "ember", 2, "Fire", "flame", "spike"),
    "pyrewyrm":   sp("Pyrewyrm", "ember", 3, "Fire", "flame", "curl"),
    "ripplefin":  sp("Ripplefin", "tide", 1, "Water", "fin", "fins", wings=False),
    "tidecoil":   sp("Tidecoil", "tide", 2, "Water", "fin", "fins"),
    "abyssrex":   sp("Abyssrex", "tide", 3, "Water", "fin", "curl"),
    "mossnout":   sp("Mossnout", "moss", 1, "Grass", "leaf", "nubs"),
    "thornback":  sp("Thornback", "moss", 2, "Grass", "leaf", "antler"),
    "verdragor":  sp("Verdragor", "moss", 3, "Grass", "leaf", "antler"),
    "sparkhatch": sp("Sparkhatch", "volt", 1, "Electric", "bolt", "nubs"),
    "voltwyrm":   sp("Voltwyrm", "volt", 3, "Electric", "bolt", "spike"),
    "wispwing":   sp("Wispwing", "dusk", 1, "Ghost", "wisp", "curl", ghostly=True),
    "duskdrake":  sp("Duskdrake", "dusk", 3, "Ghost", "wisp", "spike", ghostly=True),
    "pebblehorn": sp("Pebblehorn", "crag", 1, "Rock", "club", "spike", wings=False),
    "cragmaw":    sp("Cragmaw", "crag", 2, "Rock", "club", "curl"),
    "puffscale":  sp("Puffscale", "cloud", 1, "Normal", "puff", "nubs"),
    "glimmerkin": sp("Glimmerkin", "cloud", 2, "Normal", "puff", "curl", body="#f7d9e3", belly="#fff8ee", dark="#d6a3b6"),
    "nullwyrm":   sp("Nullwyrm", "void", 3, "Void", "crystal", "crown", spots=[(-30, 0, 4), (-10, -18, 3), (8, 6, 3), (-22, 26, 3)]),
    "aurex":      sp("Elder Aurex", "aurex", 3, "Dragon", "crystal", "crown"),
}

ART = []  # (file, species, layout, seed, fancy, gold)
for i, k in enumerate(SPECIES):
    ART.append((f"{k}.svg", k, "framed", i + 1, False, False))
SPECIALS = [  # full-picture versions for the top rarities
    ("pyrewyrm-full.svg", "pyrewyrm", 101, False, False),
    ("pyrewyrm-sir.svg", "pyrewyrm", 102, True, False),
    ("ripplefin-ir.svg", "ripplefin", 103, True, False),
    ("mossnout-gallery.svg", "mossnout", 104, False, False),
    ("voltwyrm-full.svg", "voltwyrm", 105, False, False),
    ("duskdrake-ir.svg", "duskdrake", 106, True, False),
    ("aurex-sir.svg", "aurex", 107, True, False),
    ("aurex-gold.svg", "aurex", 108, True, True),
    ("nullwyrm-impossible.svg", "nullwyrm", 109, True, False),
]
for f, k, seed, fancy, gold in SPECIALS:
    ART.append((f, k, "full", seed, fancy, gold))

if __name__ == "__main__":
    for f, k, layout, seed, fancy, gold in ART:
        with open(os.path.join(OUT, f), "w") as fh:
            fh.write(svg(SPECIES[k], layout, seed, fancy, gold))
    print(f"wrote {len(ART)} images to {os.path.normpath(OUT)}")
