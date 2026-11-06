"""Pagan Bastion · Pagan AI battleship (1 km, 5 hardpoints) · Pagan AI flagship.

A bone colossus of the ancestral machine cults: a great ribcage arching over a dark inner hull with
amber fire inside, a vertebral spine, a horned skull prow with three burning eye sockets, a frill of
bone fins fanned behind the skull, and rows of gold-banded totem towers. Dominant: skull and frill."""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _forge import ss, bump, prow, fang, armour, machinery_bands, conduits, barbette, looks, rib  # noqa: E402

META = {'name': 'pagan_bastion_hero.glb', 'hull': 'pagan_ai_battleship', 'tile': 30.0, 'bake_size': 2048}
L = 1000.0
Y0 = L / 2
S = L / 75.0
LOFT0 = 0.2


def Y(t):
    return Y0 - t * L


def sec(t):
    p = prow(t, 0.06)
    w = (3.0 + 2.2 * ss(0.0, 0.3, t)) * (1 - 0.35 * ss(0.8, 1, t)) * p * S
    top = (2.8 + 2.0 * ss(0.0, 0.3, t)) * p * S
    bot = (2.6 + 1.6 * ss(0.0, 0.3, t)) * p * S
    return w, top, bot, 2.4, 0.0


LEN = L * (1 - LOFT0)
LY0 = Y(LOFT0)
lt = lambda t: (t - LOFT0) / (1 - LOFT0)


def build(k):
    M = k.palette()
    M['CORE'] = k.material('CORE', (0.0, 0.0, 0.0), 1.0, 0.05)
    hull = k.loft('body', LEN, sec, rings=36, segs=30, mat=M['TRIM'], y0=LY0)
    k.panelize(hull, 36, 30, skip_row=3, skip_col=4, depth=1.0, thickness=1.2, keep=lambda i, j: 3 <= i <= 33)
    k.bevel(hull, 0.8, 1, 30)
    k.weighted_normals(hull)
    k.smooth(hull)
    k.machinery('mach_inner', sec, LEN, LY0, 0.05, 0.92, -0.9, math.pi + 0.9, M, count=140, h=5.0, seed=6500)
    k.tube('inner_fire', [(0, Y(0.26), 0.0), (0, Y(0.6), 0.0), (0, Y(0.9), 0.0)], [3.0 * S, 3.4 * S, 2.2 * S], M['GLOW'], ends=('round', 'round'), res=2)
    # The ribcage and the vertebral spine.
    for q in range(14):
        t = 0.26 + q * 0.046
        w, top, bot, n, zo = sec(lt(t))
        R = max(w, top) * (1.5 + 0.35 * math.sin(math.pi * q / 13))
        rib(k, 'rib', R, 1.4 * S, Y(t), 0.0, M['HULL'], arc=3.5 + 0.4 * math.sin(math.pi * q / 13))
        k.box('vertebra', (4.0 * S, 2.6 * S, 3.0 * S), (0, Y(t), R + 0.4 * S), M['HULL'])
        fang(k, 'vertebra_spur', (0, Y(t), R + 1.6 * S), (0, Y(t) - 2.0 * S, R + 6.0 * S), 1.0 * S, M['HULL'], sides=4)
    # The skull: cranium, brow, cheekbones, horns, three burning sockets, a gold-toothed jaw.
    ys = Y(0.12)
    sk = k.sphere('skull', 13.0 * S, (0, ys, 2.0 * S), M['HULL'], 40)
    sk.scale = (0.85, 1.15, 0.78)
    k.wedge('brow', (20.0 * S, 6.0 * S, 4.0 * S), (0, ys + 11.6 * S, 7.0 * S), M['HULL'], slope=0.4)
    for x in (-5.0, 0.0, 5.0):
        k.sphere('eye_socket', 3.0 * S, (x * S, ys + 13.4 * S, 3.2 * S if x == 0 else 2.4 * S), M['CORE'], 16)
        k.sphere('eye_fire', 1.3 * S, (x * S, ys + 15.0 * S, 3.2 * S if x == 0 else 2.4 * S), M['GLOW'], 12)
    for s in (-1, 1):
        k.wedge('cheekbone', (4.0 * S, 10.0 * S, 3.4 * S), (s * 8.6 * S, ys + 10.0 * S, -1.4 * S), M['HULL'], slope=0.5)
        fang(k, 'horn', (s * 7.0 * S, ys + 2.0 * S, 9.0 * S), (s * 22.0 * S, ys - 10.0 * S, 22.0 * S), 3.0 * S, M['GOLD'], sides=6)
        fang(k, 'horn_lower', (s * 9.0 * S, ys + 4.0 * S, -4.0 * S), (s * 16.0 * S, ys + 16.0 * S, -12.0 * S), 2.0 * S, M['HULL'], sides=5)
    k.wedge('muzzle', (11.0 * S, 9.0 * S, 6.0 * S), (0, ys + 15.0 * S, -2.4 * S), M['HULL'], slope=0.45)
    k.box('jaw', (14.0 * S, 12.0 * S, 3.0 * S), (0, ys + 13.0 * S, -9.0 * S), M['HULL'])
    for i in range(9):
        x = (i - 4) * 1.4 * S
        fang(k, 'tooth', (x, ys + 19.0 * S, -7.6 * S), (x, ys + 19.6 * S, -4.0 * S), 0.6 * S, M['GOLD'], sides=4)
    # The frill: bone fins fanned behind the skull.
    for i in range(11):
        a = math.pi * (0.12 + 0.76 * i / 10)
        c, s_ = math.cos(a), math.sin(a)
        fang(k, 'frill', (c * 9.0 * S, Y(0.2), 2.0 * S + s_ * 9.0 * S), (c * 30.0 * S, Y(0.24), 2.0 * S + s_ * 30.0 * S), 2.4 * S, M['HULL'] if i % 2 else M['GOLD'], sides=4)
    k.armour_ring('frill_ring', 10.0 * S, 1.2 * S, 3.0 * S, (0, Y(0.2), 2.0 * S), M, rot=(math.pi / 2, 0, 0), blocks=14, gap=0.12)
    # Totem towers in two rows on the back.
    for t in (0.42, 0.7):
        w, top, bot, n, zo = sec(lt(t))
        R = max(w, top) * 1.8
        for s in (-1, 1):
            for i in range(3):
                k.box('totem', ((4.0 - 0.4 * i) * S, (4.0 - 0.4 * i) * S, 3.2 * S), (s * 6.0 * S, Y(t), R + 2.4 * S + i * 3.4 * S), M['TRIM'] if i % 2 else M['HULL'])
                k.box('totem_band', ((4.3 - 0.4 * i) * S, (4.3 - 0.4 * i) * S, 0.45 * S), (s * 6.0 * S, Y(t), R + 4.0 * S + i * 3.4 * S), M['GOLD'])
            k.sphere('totem_fire', 1.2 * S, (s * 6.0 * S, Y(t), R + 13.0 * S), M['GLOW'], 12)
    for s, bank, t in ((-1, 'FL', 0.34), (1, 'FR', 0.34), (-1, 'ML', 0.6), (1, 'MR', 0.6)):
        w, top, bot, n, zo = sec(lt(t))
        R = max(w, top) * 1.5
        barbette(k, M, bank, s * R * 0.72, Y(t), R * 0.72, 2.2 * S, 1.1 * S)
    barbette(k, M, 'AL', 0, Y(0.86), max(sec(lt(0.86))[0], sec(lt(0.86))[1]) * 1.6, 2.4 * S, 1.1 * S)
    for i, (x, z) in enumerate(((-3.0, -1.0), (3.0, -1.0), (0.0, 2.4))):
        k.nozzle('nozzle', (x * S, Y(1.0) - 0.8 * S, z * S), 2.0 * S, 3.6 * S, M, glow='GLOW')
        k.empty('ENGINE_%d' % i, (x * S, Y(1.0) - 2.6 * S, z * S), 2.0 * S)
    k.finish(skip=('core', 'body', 'skull', 'eye', 'rib', 'frill_ring', 'NODE', 'ENGINE', 'windows', 'mach', 'inner'))


LOOKS = looks('pagan_ai', L)
