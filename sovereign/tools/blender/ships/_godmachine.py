"""AI Gods design language, shared by the whole line: obsidian monoliths, imperial gold, a glowing
command core in a reliquary cage, crowns of upright tines, gold oath bands, ziggurat steps.
Strict symmetry everywhere (the opposite of Chaos)."""
import math

from _forge import fang, spire


def command_core(k, M, c, r, hoops=2):
    """The heart of every god-machine: a faceted white-gold core (two joined pyramids), held in
    armoured hoops (one across the ship, one along it) with gold clamps."""
    x, y, z = c
    fang(k, 'core_upper', c, (x, y, z + r * 1.5), r, M['CORE_LIGHT'], sides=4)
    fang(k, 'core_lower', c, (x, y, z - r * 1.5), r, M['CORE_LIGHT'], sides=4)
    k.armour_ring('core_hoop', r * 1.9, r * 0.22, r * 0.5, c, M, rot=(math.pi / 2, 0, 0), blocks=12, gap=0.16)
    if hoops > 1:
        k.armour_ring('core_hoop', r * 2.15, r * 0.2, r * 0.45, c, M, rot=(0, math.pi / 2, 0), blocks=12, gap=0.16, glow=False)
    for i in range(4):
        a = i / 4 * math.tau + math.pi / 4
        k.box('core_clamp', (r * 0.5, r * 0.5, r * 0.5), (x + math.cos(a) * r * 1.9, y, z + math.sin(a) * r * 1.9), M['GOLD'])


def crown(k, M, c, R, n, h, thick, axis='z', tine_r=None):
    """A crown: an armoured ring with n upright gold tines. axis 'z' lies flat (tines up);
    axis 'y' stands across the ship (tines radiate outward, a halo-crown)."""
    x, y, z = c
    tr = tine_r or thick * 0.7
    if axis == 'z':
        k.armour_ring('crown_ring', R, thick, thick * 1.6, c, M, rot=(0, 0, 0), blocks=max(8, n), gap=0.12, glow=True)
        for i in range(n):
            a = i / n * math.tau
            hh = h * (1.0 if i % 2 == 0 else 0.62)
            spire(k, 'crown_tine', (x + math.cos(a) * R, y + math.sin(a) * R, z + thick * 0.8), hh, tr, M['GOLD'], sides=4)
    else:
        k.armour_ring('crown_ring', R, thick, thick * 1.6, c, M, rot=(math.pi / 2, 0, 0), blocks=max(10, n), gap=0.1, glow=True)
        for i in range(n):
            a = i / n * math.tau + math.pi / 2
            hh = h * (1.0 if i % 2 == 0 else 0.6)
            ca, sa = math.cos(a), math.sin(a)
            fang(k, 'crown_tine', (x + ca * (R + thick), y, z + sa * (R + thick)), (x + ca * (R + thick + hh), y - thick * 0.6, z + sa * (R + thick + hh)), tr, M['GOLD'], sides=4)


def oath_bands(k, M, sec, LEN, Y0, lt, ts, r, a0=0.15, a1=math.pi - 0.15):
    """Gold oath bands wrapped over the hull at ship positions ts (the inscriptions of the oath)."""
    for t in ts:
        for sc in (1.06,):
            pts = k.edge_curve(sec, LEN, Y0, lt(t), a0, a1, scale=sc, steps=18)
            k.tube('oath_band', pts, [r] * len(pts), M['GOLD'], bevel_res=1, ends=('round', 'round'), res=2)


def ziggurat(k, M, c, w, l, steps, step_h, shrink=0.72, seed=1, h_kit=1.0, glow=True):
    """Stepped temple tiers from a base centre upward, each smaller, each edged with a light line and
    dressed on its sides."""
    x, y, z = c
    for i in range(steps):
        f = shrink ** i
        ww, ll = w * f, l * (0.55 + 0.45 * f)
        zc = z + step_h * (i + 0.5)
        k.box('zig', (ww, ll, step_h), (x, y, zc), M['HULL'] if i % 2 == 0 else M['TRIM'])
        k.box_kit('zig_kit', (x, y, zc), (ww, ll, step_h), M, faces=('left', 'right', 'front'), count=6, h=h_kit, seed=seed + i)
        if glow:
            for s in (-1, 1):
                k.box('zig_line', (step_h * 0.12, ll * 0.85, step_h * 0.12), (x + s * ww * 0.5, y, zc + step_h * 0.48), M['GLOW'])
    return z + step_h * steps


def stepped_wing(k, M, root, span, chord, th, side, tiers=3, sweep=0.0, seed=1, h_kit=1.0):
    """A temple-step wing: stacked slabs, each shorter in span, set back and up one step."""
    x, y, z = root
    for i in range(tiers):
        sp = span * (1 - 0.22 * i)
        cx = x + side * sp * 0.5
        cy = y - i * chord * 0.08 + sweep * sp * 0.5
        cz = z + i * th * 0.9
        k.box('wing_step', (sp, chord * (1 - 0.1 * i), th), (cx, cy, cz), M['TRIM'] if i % 2 else M['HULL'])
        k.box_kit('wing_kit', (cx, cy, cz), (sp, chord * (1 - 0.1 * i), th), M, faces=('top',), count=6, h=h_kit, seed=seed + i)
        k.box('wing_edge', (sp * 0.96, th * 0.18, th * 0.24), (cx, cy + chord * (1 - 0.1 * i) * 0.5, cz + th * 0.4), M['GOLD'])
