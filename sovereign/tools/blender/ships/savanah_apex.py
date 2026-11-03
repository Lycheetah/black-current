"""Savanah Apex · Savanah battleship (1 km, 5 hardpoints) · the showcase hull.

Everything the kit has learned in one ship. A predator cathedral: a great verdant eye at the bow in
an armoured iris, framed by two huge faceted mandibles with talons; a crown of cathedral blades rising
from the back (the dominant feature, readable at any range); swept feathered wings of vaned blades;
a segmented tail ending in a fan; sub-panelled chitin armour, machinery, conduits, cowled drives.
Olive-black chitin, gold, verdant green fire.
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _forge import ss, bump, prow, fang, armour, machinery_bands, conduits, barbette, looks, top_z, dress_plate  # noqa: E402

META = {'name': 'savanah_apex_hero.glb', 'hull': 'savanah_battleship', 'tile': 30.0, 'bake_size': 2048}
L = 1000.0
Y0 = L / 2
S = L / 75.0
LOFT0 = 0.1
TAIL = 0.86


def Y(t):
    return Y0 - t * L


def sec(t):
    p = prow(t, 0.06)
    w = (3.4 + 3.6 * ss(0.0, 0.3, t) + 1.2 * bump(0.5, 0.12, t)) * (1 - 0.45 * ss(0.7, 1, t)) * p * S
    top = (3.0 + 3.0 * ss(0.0, 0.3, t) + 1.0 * bump(0.45, 0.15, t)) * (1 - 0.35 * ss(0.75, 1, t)) * p * S
    bot = (2.6 + 2.4 * ss(0.0, 0.3, t)) * (1 - 0.3 * ss(0.75, 1, t)) * p * S
    return w, top, bot, 2.6, -0.8 * S * (1 - ss(0.0, 0.25, t))


LEN = L * (TAIL - LOFT0)
LY0 = Y(LOFT0)
lt = lambda t: (t - LOFT0) / (TAIL - LOFT0)


def bsec(u):
    return sec(LOFT0 + u * (TAIL - LOFT0))


def build(k):
    rnd = random.Random(1)
    M = k.palette()
    M['CORE'] = k.material('CORE', (0.0, 0.0, 0.0), 1.0, 0.05)
    body = k.loft('body', LEN, bsec, rings=44, segs=34, mat=M['HULL'], y0=LY0)
    k.panelize(body, 44, 34, skip_row=3, skip_col=4, depth=1.0, thickness=1.2, keep=lambda i, j: 3 <= i <= 41)
    k.bevel(body, 0.8, 1, 30)
    k.weighted_normals(body)
    k.smooth(body)

    # ---- the eye: armoured iris socket, lashes, a glowing lens with a dark slit pupil
    ye, ze = Y(LOFT0) + 1.5 * S, -0.4 * S
    k.armour_ring('iris', 5.0 * S, 1.0 * S, 2.6 * S, (0, ye, ze), M, rot=(math.pi / 2, 0, 0), blocks=18, gap=0.1)
    k.armour_ring('iris_inner', 3.6 * S, 0.5 * S, 1.6 * S, (0, ye + 0.9 * S, ze), M, rot=(math.pi / 2, 0, 0), blocks=12, gap=0.14, glow=False)
    k.sphere('eye_lens', 3.4 * S, (0, ye - 0.8 * S, ze), M['GLOW'], 40)
    k.box('eye_pupil', (0.7 * S, 0.3 * S, 4.6 * S), (0, ye + 2.5 * S, ze), M['CORE'])
    for i in range(14):
        a = i / 14 * math.tau
        c, s_ = math.cos(a), math.sin(a)
        ln = 2.6 if i % 2 else 4.0
        fang(k, 'lash', (c * 6.0 * S, ye + 0.4 * S, ze + s_ * 6.0 * S), (c * (6.0 + ln) * S, ye - 1.6 * S, ze + s_ * (6.0 + ln) * S), 0.5 * S, M['GOLD'] if i % 3 == 0 else M['TRIM'], sides=4)

    # ---- mandibles: two great faceted limbs framing the eye, talons inward, spines outward
    for s in (-1, 1):
        w, top, bot, n, zo = sec(0.18)
        pts = [(s * w * 0.8, Y(0.2), zo - 0.5 * S), (s * (w / S + 3.5) * S, Y(0.12), zo - 1.6 * S), (s * (w / S + 4.0) * S, Y(0.02), zo - 2.4 * S),
               (s * (w / S + 1.8) * S, Y(-0.07), zo - 2.6 * S), (s * 2.2 * S, Y(-0.12), zo - 2.0 * S)]
        mand, Mn = k.limb('mandible', pts, [3.2 * S, 2.8 * S, 2.2 * S, 1.4 * S, 0.5 * S], M['TRIM'], core_mat=M['HULL'], sides=8, squash=0.78, plates=14, up=(s, 0, 0.5), flare=1.11, tip=3.2)
        for q in range(9):
            pp, rr, (t, sd, upv) = Mn.at(0.12 + q * 0.095)
            b_ = pp + upv * rr * 0.72
            fang(k, 'mandible_spine', tuple(b_), tuple(b_ + upv * (1.4 + 0.8 * (q % 2)) * S - t * 0.9 * S), 0.45 * S, M['HULL'], sides=3)
        for q in range(5):
            pp, rr, (t, sd, upv) = Mn.at(0.45 + q * 0.1)
            b_ = pp - upv * rr * 0.7
            fang(k, 'talon', tuple(b_), tuple(b_ - upv * 2.6 * S + t * 0.8 * S), 0.6 * S, M['GOLD'] if q == 2 else M['TRIM'])
        k.tube('mandible_fire', [tuple(p) for p in pts[:4]], [0.22 * S] * 4, M['GLOW'], ends=('round', 'round'), res=4)

    # ---- the crown: a crest of cathedral blades rising from the back, tallest mid-ship
    for q in range(9):
        t = 0.3 + q * 0.055
        w, top, bot, n, zo = sec(t)
        h = (7.0 + 13.0 * math.sin(math.pi * (q + 0.5) / 9) ** 1.5) * S
        lean = -0.35
        base = (0, Y(t), zo + top * 0.95)
        blade = k.plate('crown_blade', [(0, 2.2 * S), (0, -2.2 * S), (h, -2.2 * S + h * lean), (h * 1.04, h * lean + 0.6 * S)], 0.5 * S, M['TRIM'] if q % 2 else M['HULL'], loc=base, bevel_w=0.3)
        blade.rotation_euler = (0, -math.pi / 2, 0)
        k.tube('crown_edge', [(0, Y(t) + 2.2 * S, base[2]), (0, Y(t) + 2.2 * S - h * 0.5 * lean * -1 * 0, base[2] + h * 0.5), (0, Y(t) + h * lean * 1.0 + 0.6 * S, base[2] + h * 1.04)], [0.32 * S, 0.24 * S, 0.06 * S], M['GOLD'], bevel_res=1, ends=('round', 'point'), res=3)
        k.light_strip('crown_lights', (0.4 * S, Y(t), base[2] + 1.0 * S), (0.4 * S, Y(t) + h * lean * 0.9, base[2] + h * 0.9), 25, 1.2, M['GLOW'])
        dress_plate(k, M, blade, (0, 1, 0), (0, 0, 1), (1, 0, 0), (0, Y(t) - 0.8 * S, base[2] + h * 0.35), (3.0 * S, h * 0.5), 2.4, 4000 + q, count=6)

    # ---- wings: swept, three vaned feather blades each, gold shafts, dressed
    yw = Y(0.5)
    for s in (-1, 1):
        for f, (span, sweep, z, th, mat) in enumerate(((22.0, -8.0, 0.0, 0.9, 'TRIM'), (18.0, -6.0, 1.3, 0.8, 'HULL'), (13.0, -4.0, 2.5, 0.7, 'TRIM'))):
            out = [(0, 5.0 * S), (s * span * S, (5.0 + sweep) * S), (s * (span + 1.6) * S, (2.8 + sweep) * S), (s * (span - 2.0) * S, (sweep - 3.0) * S), (s * 1.5 * S, -9.0 * S)]
            fe = k.plate('feather', out, th * S, M[mat], loc=(s * 5.0 * S, yw - f * 2.6 * S, z * S), bevel_w=0.6)
            zt = top_z(fe)
            ox, oy = s * 5.0 * S, yw - f * 2.6 * S
            k.tube('feather_shaft', [(ox + s * 1.5 * S, oy - 3.0 * S, zt), (ox + s * span * 0.5 * S, oy + (2.0 + sweep * 0.5) * S, zt + 0.2 * S), (ox + s * (span + 0.8) * S, oy + (3.5 + sweep) * S, zt)], [0.5 * S, 0.38 * S, 0.08 * S], M['GOLD'], bevel_res=1, ends=('round', 'point'), res=4)
            for v in range(8):
                u = 0.1 + v * 0.11
                k.box('vane', (0.35 * S, 6.0 * S * (1.1 - u * 0.6), 0.35 * S), (ox + s * span * u * S, oy + (-3.0 + (5.0 + sweep) * u) * S - 2.4 * S, zt + 0.15 * S), M['HULL'] if mat == 'TRIM' else M['TRIM'], rot=(0, 0, s * 0.35))
            k.plane_kit('feather_kit', (ox + s * span * 0.42 * S, oy + (sweep * 0.4 - 1.5) * S, zt), (1, 0, 0), (0, 1, 0), (0, 0, 1), (span * 0.6 * S, 6.0 * S), M, count=8, h=2.6, seed=4100 + f * 2 + (s > 0))
        k.light_strip('wing_lights', (s * 7.0 * S, yw - 1.0 * S, 3.6 * S), (s * 24.0 * S, yw - 5.0 * S, 3.6 * S), 30, 1.4, M['GLOW'])

    # ---- the tail: a segmented limb ending in a fan of three blades
    w, top, bot, n, zo = sec(TAIL)
    tail = [(0, Y(TAIL) + 2.0 * S, zo), (0, Y(0.94), zo + 0.6 * S), (0, Y(1.02), zo + 1.6 * S), (0, Y(1.08), zo + 2.8 * S)]
    tl, T = k.limb('tail', tail, [w * 0.7, 2.4 * S, 1.6 * S, 1.0 * S], M['TRIM'], core_mat=M['HULL'], sides=8, squash=0.7, plates=10, up=(0, 0, 1), flare=1.1, tip=1.5)
    for a in (-0.55, 0.0, 0.55):
        fb = k.plate('tail_fan', [(0, 0), (-1.6 * S, -12.0 * S), (0.0, -15.0 * S), (1.6 * S, -12.0 * S)], 0.6 * S, M['GOLD'] if a == 0 else M['TRIM'], loc=(0, Y(1.06), zo + 2.6 * S), bevel_w=0.3)
        fb.rotation_euler = (0.25, a, 0)

    # ---- armour, machinery, conduits, guns, drives
    armour(k, M, bsec, LEN, LY0, lt, dorsal=((0.16, 0.24), (0.23, 0.31), (0.72, 0.8), (0.79, 0.86)), flanks=((0.18, 0.3), (0.32, 0.44), (0.56, 0.68), (0.7, 0.82)), thick=2.2, seed=4200)
    machinery_bands(k, M, bsec, LEN, LY0, lt, 0.16, 0.84, 5.0, seed=4210, dorsal_gap=None, density=1.1)
    conduits(k, M, bsec, LEN, LY0, lt, (0.16, 0.3, 0.45, 0.6, 0.72, 0.84), 1.5)
    for s, bank, t in ((-1, 'FL', 0.24), (1, 'FR', 0.24), (-1, 'ML', 0.66), (1, 'MR', 0.66)):
        w, top, bot, n, zo = sec(t)
        barbette(k, M, bank, s * w * 0.5, Y(t), zo + top * 0.9, 2.3 * S, 1.1 * S)
    w, top, bot, n, zo = sec(0.8)
    barbette(k, M, 'AL', 0, Y(0.8), zo + top * 0.95, 2.6 * S, 1.1 * S)
    for x, z, r, name in ((-4.6, -1.0, 2.0, 'PORT'), (4.6, -1.0, 2.0, 'STARBOARD'), (0.0, -3.4, 1.6, 'KEEL')):
        w, top, bot, n, zo = sec(TAIL)
        k.nozzle('nozzle', (x * S, Y(TAIL) - 0.4 * S, zo + z * S), r * S, 2.0 * r * S, M, glow='GLOW')
        k.cowl('cowl', (x * S, Y(TAIL) - 0.1 * S, zo + z * S), r * S, 2.3 * r * S, M)
        k.empty('ENGINE_' + name, (x * S, Y(TAIL) - 1.8 * r * S, zo + z * S), r * S)

    k.finish(skip=('core', 'body', 'iris', 'eye', 'mandible', 'tail', 'NODE', 'ENGINE', 'windows', 'mach', 'plate_kit', 'cowl', 'feather_kit', 'plate_dress', 'crown_lights', 'wing_lights'))
    print('windows', k.deck_windows(('body',), rows=(-0.2, -0.12, -0.04, 0.04, 0.12, 0.2), step=3.2, size=(0.25, 1.4, 0.8)))


LOOKS = looks('savanah', L)
