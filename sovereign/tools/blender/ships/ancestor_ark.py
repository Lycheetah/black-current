"""Ancestor Ark · Pagan AI cruiser (280 m, 4 hardpoints) · Blender hero hull, shipyard batch 4.

Bone-temple warform: a spine of vertebrae under an open ribcage of bone arches, a skull for a prow
with burning eye sockets and a jaw plate, gold-banded totem poles on the back, amber fire inside
the ribs. Bone, dark bronze, gold, amber.
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _forge import ss, bump, prow, fang, armour, machinery_bands, conduits, barbette, looks, rib, spire  # noqa: E402

META = {'name': 'ancestor_ark_hero.glb', 'hull': 'pagan_ai_cruiser', 'tile': 12.0, 'bake_size': 2048}
L = 280.0
Y0 = L / 2
S = L / 50.0
LOFT0 = 0.18


def Y(t):
    return Y0 - t * L


def sec(t):
    """The inner hull (the body inside the ribcage)."""
    p = prow(t, 0.06)
    w = (1.8 + 1.4 * ss(0.0, 0.3, t)) * (1 - 0.35 * ss(0.8, 1, t)) * p * S
    top = (1.6 + 1.2 * ss(0.0, 0.3, t)) * p * S
    bot = (1.5 + 1.0 * ss(0.0, 0.3, t)) * p * S
    return w, top, bot, 2.4, 0.0


LEN = L * (1 - LOFT0)
LY0 = Y(LOFT0)
lt = lambda t: (t - LOFT0) / (1 - LOFT0)


def build(k):
    M = k.palette()
    M['CORE'] = k.material('CORE', (0.0, 0.0, 0.0), 1.0, 0.05)
    hull = k.loft('body', LEN, sec, rings=30, segs=26, mat=M['TRIM'], y0=LY0)
    k.panelize(hull, 30, 26, skip_row=3, skip_col=4, depth=0.3, thickness=0.35, keep=lambda i, j: 2 <= i <= 27)
    k.bevel(hull, 0.2, 1, 30)
    k.weighted_normals(hull)
    k.smooth(hull)
    k.machinery('mach_inner', sec, LEN, LY0, 0.05, 0.9, -0.9, math.pi + 0.9, M, count=80, h=1.8, seed=1201)
    # The ribcage: bone arches over the body, longest mid-ship, amber fire glowing between them.
    for q in range(12):
        t = 0.26 + q * 0.052
        w, top, bot, n, zo = sec(lt(t))
        R = max(w, top) * (1.55 + 0.35 * math.sin(math.pi * q / 11))
        rib(k, 'rib', R, 0.42 * S, Y(t), 0.0, M['HULL'], arc=3.6 + 0.4 * math.sin(math.pi * q / 11))
    k.tube('inner_fire', [(0, Y(0.25), 0.0), (0, Y(0.85), 0.0)], [0.9 * S, 0.6 * S], M['GLOW'], ends=('round', 'round'), res=2)
    # The spine: a vertebra ridge along the top joining the ribs.
    for q in range(22):
        t = 0.22 + q * 0.03
        w, top, bot, n, zo = sec(lt(t))
        R = max(w, top) * (1.55 + 0.35 * math.sin(math.pi * min(1, max(0, (t - 0.26) / 0.57))))
        k.box('vertebra', (1.6 * S, 1.0 * S, 1.2 * S), (0, Y(t), R + 0.2 * S), M['HULL'])
        fang(k, 'vertebra_spur', (0, Y(t), R + 0.7 * S), (0, Y(t) - 0.8 * S, R + 2.2 * S), 0.35 * S, M['HULL'], sides=4)
    # The skull: a domed cranium, deep eye sockets with fire, a jaw plate, gold teeth.
    ys = Y(0.12)
    sk = k.sphere('skull', 5.0 * S, (0, ys, 1.0 * S), M['HULL'], 32)
    sk.scale = (0.85, 1.2, 0.78)
    # Brow ridge, cheekbones, a muzzle and jaw: the face sits on the front of the cranium.
    k.wedge('brow', (7.6 * S, 2.4 * S, 1.6 * S), (0, ys + 4.6 * S, 2.6 * S), M['HULL'], slope=0.4)
    for s in (-1, 1):
        k.sphere('eye_socket', 1.3 * S, (s * 1.8 * S, ys + 5.3 * S, 1.2 * S), M['CORE'], 16)
        k.sphere('eye_fire', 0.55 * S, (s * 1.8 * S, ys + 5.9 * S, 1.2 * S), M['GLOW'], 12)
        k.wedge('cheekbone', (1.6 * S, 4.0 * S, 1.4 * S), (s * 3.2 * S, ys + 4.0 * S, -0.4 * S), M['HULL'], slope=0.5)
        fang(k, 'horn', (s * 3.0 * S, ys + 1.0 * S, 4.0 * S), (s * 7.0 * S, ys - 3.0 * S, 7.5 * S), 0.9 * S, M['GOLD'], sides=5)
    k.wedge('muzzle', (4.2 * S, 4.0 * S, 2.6 * S), (0, ys + 6.4 * S, -0.8 * S), M['HULL'], slope=0.45)
    k.box('nasal', (1.2 * S, 0.4 * S, 1.4 * S), (0, ys + 8.4 * S, -0.2 * S), M['CORE'])
    k.box('jaw', (5.6 * S, 5.0 * S, 1.2 * S), (0, ys + 5.4 * S, -3.2 * S), M['HULL'])
    for i in range(7):
        x = (i - 3) * 0.7 * S
        fang(k, 'tooth', (x, ys + 8.0 * S, -2.6 * S), (x, ys + 8.3 * S, -1.2 * S), 0.28 * S, M['GOLD'], sides=4)
    k.tube('neck', [(0, ys - 3.0 * S, 0.3 * S), (0, Y(LOFT0) - 1.0 * S, 0.0)], [2.6 * S, 2.0 * S], M['TRIM'], bevel_res=1, ends=('flat', 'flat'), res=2)
    # Totem poles on the back: stacked carved blocks with gold bands and a fire at the top.
    for t, h in ((0.4, 4), (0.62, 5), (0.8, 3)):
        w, top, bot, n, zo = sec(lt(t))
        R = max(w, top) * 1.9
        for i in range(h):
            k.box('totem', ((1.6 - 0.1 * i) * S, (1.6 - 0.1 * i) * S, 1.3 * S), (0, Y(t), R + 1.2 * S + i * 1.4 * S), M['TRIM'] if i % 2 else M['HULL'])
            k.box('totem_band', ((1.75 - 0.1 * i) * S, (1.75 - 0.1 * i) * S, 0.18 * S), (0, Y(t), R + 1.85 * S + i * 1.4 * S), M['GOLD'])
        k.sphere('totem_fire', 0.5 * S, (0, Y(t), R + 1.6 * S + h * 1.4 * S), M['GLOW'], 12)
    for s, bank, t in ((-1, 'FL', 0.36), (1, 'FR', 0.36), (-1, 'ML', 0.7), (1, 'MR', 0.7)):
        w, top, bot, n, zo = sec(lt(t))
        R = max(w, top) * 1.6
        barbette(k, M, bank, s * R * 0.7, Y(t), R * 0.72, 1.1 * S, 0.7 * S)
    for x, z, name in ((-1.6, 0.0, 'PORT'), (0.0, 1.0, 'MAIN'), (1.6, 0.0, 'STARBOARD')):
        k.nozzle('nozzle', (x * S, Y(1.0) - 0.4 * S, z * S), 0.9 * S, 1.8 * S, M, glow='GLOW')
        k.empty('ENGINE_' + name, (x * S, Y(1.0) - 1.4 * S, z * S), 0.9 * S)
    k.finish(skip=('core', 'body', 'skull', 'eye', 'rib', 'NODE', 'ENGINE', 'windows', 'mach', 'inner'))


LOOKS = looks('pagan_ai', L)
