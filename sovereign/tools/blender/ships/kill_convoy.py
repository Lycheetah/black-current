"""Kill Convoy · Human Hunters cruiser (280 m, 4 hardpoints) · Blender hero hull, shipyard batch 5.

Rust-industrial pursuit cruiser, built to EVE's lessons: one dominant feature (a huge riveted sail
offset to port), asymmetry (scaffolding on one side, a spinal cannon down the other), vertical
height, big plain plates next to dense clusters. Rust, dark steel, brass, orange light.
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _forge import ss, bump, prow, fang, armour, machinery_bands, conduits, barbette, looks  # noqa: E402

META = {'name': 'kill_convoy_hero.glb', 'hull': 'human_hunters_cruiser', 'tile': 12.0, 'bake_size': 2048}
L = 280.0
Y0 = L / 2
S = L / 50.0
LOFT0 = 0.08


def Y(t):
    return Y0 - t * L


def sec(t):
    p = prow(t, 0.08)
    w = (1.5 + 1.1 * ss(0.0, 0.35, t)) * (1 - 0.2 * ss(0.85, 1, t)) * p * S
    top = (2.6 + 1.8 * ss(0.0, 0.35, t)) * p * S
    bot = (1.8 + 1.0 * ss(0.0, 0.35, t)) * p * S
    return w, top, bot, 5.0, 0.0


LEN = L * (1 - LOFT0)
LY0 = Y(LOFT0)
lt = lambda t: (t - LOFT0) / (1 - LOFT0)


def plate_yz(k, name, outline, thick, x, y, z, mat, bevel=0.1):
    """A plate standing upright in the YZ plane: outline [(height, along)]; thickness across X."""
    p = k.plate(name, [(u, v) for u, v in outline], thick, mat, loc=(x, y, z), bevel_w=bevel)
    p.rotation_euler = (0, -math.pi / 2, 0)
    return p


def build(k):
    rnd = random.Random(5)
    M = k.palette()
    M['CORE'] = k.material('CORE', (0.0, 0.0, 0.0), 1.0, 0.05)
    hull = k.loft('body', LEN, sec, rings=32, segs=28, mat=M['HULL'], y0=LY0)
    k.panelize(hull, 32, 28, skip_row=2, skip_col=3, depth=0.25, thickness=0.3, keep=lambda i, j: 2 <= i <= 29)
    k.bevel(hull, 0.15, 1, 30)
    k.weighted_normals(hull)
    k.smooth(hull)

    # The sail: tall, raked back, offset to port, patched with plates of other metals and riveted.
    w, top, bot, n, zo = sec(lt(0.5))
    sx, sy, sz = -0.9 * S, Y(0.44), top * 0.9
    sail = [(0, 9.0 * S), (0, -26.0 * S), (13.0 * S, -34.0 * S), (19.0 * S, -20.0 * S), (15.0 * S, 2.0 * S)]
    plate_yz(k, 'sail', sail, 1.0 * S, sx, sy, sz, M['HULL'], 0.3)
    for i, (h0, h1, a0, a1) in enumerate(((2, 7, -2, -14), (6, 12, -8, -22), (10, 16, -14, -28), (3, 9, -16, -24))):
        for side in (-1, 1):
            patch = [(h0 * S, a0 * S), (h0 * S, a1 * S), (h1 * S, (a1 - 2) * S), (h1 * S, (a0 - 1) * S)]
            plate_yz(k, 'sail_patch', patch, 0.25 * S, sx + side * 0.62 * S, sy, sz, M['TRIM'] if (i + (side > 0)) % 2 else M['GOLD'], 0.05)
    for (h0, a0), (h1, a1) in (((0.6, 8.0), (0.6, -25.0)), ((1.0, 8.0), (14.5, 1.5)), ((13.5, -33.0), (18.5, -20.0)), ((7.0, -5.0), (7.0, -28.0))):
        for side in (-1, 1):
            k.light_strip('rivets', (sx + side * 0.55 * S, sy + a0 * S, sz + h0 * S), (sx + side * 0.55 * S, sy + a1 * S, sz + h1 * S), 2.2, 0.28, M['GOLD'])
    k.light_strip('sail_lights', (sx - 0.6 * S, sy + 8.0 * S, sz + 1.0 * S), (sx - 0.6 * S, sy - 24.0 * S, sz + 1.0 * S), 15, 0.5, M['GLOW'])
    # Cockpit pod at the sail's leading edge.
    k.box('cockpit', (2.4 * S, 5.0 * S, 2.6 * S), (sx, sy + 5.4 * S, sz + 6.4 * S), M['TRIM'])
    k.box('cockpit_glass', (2.5 * S, 0.1 * S, 0.5 * S), (sx, sy + 7.95 * S, sz + 7.0 * S), k.window_material())
    # Stiffener ribs across both faces of the sail, and vent banks between them.
    for h, a0, a1 in ((3.0, 6.5, -27.0), (8.0, 4.5, -30.0), (13.0, 2.5, -31.0)):
        for side in (-1, 1):
            k.box('sail_rib', (0.5 * S, (a0 - a1) * S, 0.6 * S), (sx + side * 0.75 * S, sy + (a0 + a1) / 2 * S, sz + h * S), M['TRIM'])
    for h, ac in ((5.5, -10.0), (10.5, -16.0), (5.5, -20.0)):
        for side in (-1, 1):
            k.vent_grille('sail_vent', (sx + side * 0.62 * S, sy + ac * S, sz + h * S), 2.0 * S, 4.0 * S, 6, M['TRIM'], M['HULL'], rot=(0, side * math.pi / 2, 0))

    # Scaffolding: girders bracing the sail from the starboard deck (one side only).
    for q in range(6):
        y = sy + 6.0 * S - q * 5.0 * S
        h = (4.0 + q * 1.4) * S
        k.box('scaffold_post', (0.4 * S, 0.4 * S, h), (2.0 * S, y, sz + h / 2 - 0.5 * S), M['TRIM'])
        k.tube('scaffold_brace', [(2.0 * S, y, sz + h - 0.6 * S), (0.6 * S, y - 1.0 * S, sz + h + 0.4 * S), (sx + 0.6 * S, y - 2.0 * S, sz + h + 1.2 * S)], [0.15 * S] * 3, M['GOLD'], bevel_res=1, ends=('flat', 'flat'), res=1)
        if q < 5:
            k.tube('scaffold_x', [(2.0 * S, y, sz), (2.0 * S, y - 2.5 * S, sz + h * 0.5), (2.0 * S, y - 5.0 * S, sz + h)], [0.12 * S] * 3, M['TRIM'], bevel_res=1, ends=('flat', 'flat'), res=1)

    # The spinal cannon: a long barrel down the starboard flank, coils, a brake past the bow.
    cx, cz = 2.6 * S, -1.4 * S
    k.tube('cannon', [(cx, Y(0.86), cz), (cx, Y(0.4), cz), (cx, Y(-0.1), cz)], [1.25 * S, 1.0 * S, 0.8 * S], M['TRIM'], bevel_res=2, ends=('flat', 'flat'), res=2)
    for q in range(12):
        y = Y(0.8) + q * 7.0 * S * 0.45 * 2.2
        if y > Y(-0.08):
            break
        k.cylinder('cannon_coil', 1.45 * S, 1.0 * S, (cx, y, cz), M['GOLD'] if q % 3 == 0 else M['HULL'], segs=10, rot=(-math.pi / 2, 0, 0))
    k.box('cannon_brake', (3.0 * S, 3.0 * S, 2.4 * S), (cx, Y(-0.1) + 1.0 * S, cz), M['HULL'])
    k.cylinder('cannon_bore', 0.6 * S, 0.3 * S, (cx, Y(-0.1) - 0.5 * S, cz), M['GLOW'], segs=12, rot=(-math.pi / 2, 0, 0))
    for t in (0.2, 0.45, 0.7):
        k.box('cannon_mount', (1.6 * S, 2.0 * S, 1.0 * S), (cx - 1.0 * S, Y(t), cz + 0.6 * S), M['HULL'])

    # Port flank: bolted armour slabs of uneven sizes (the plain big planes).
    for q in range(9):
        t = 0.2 + q * 0.075
        w, top, bot, n, zo = sec(lt(t))
        hh = (2.0 + 2.5 * rnd.random()) * S
        k.box('slab', (0.6 * S, (5.5 + 3 * rnd.random()) * S, hh), (-w - 0.3 * S, Y(t), (rnd.random() - 0.4) * 2.0 * S), M['HULL'] if q % 2 else M['TRIM'])
        k.light_strip('slab_rivets', (-w - 0.65 * S, Y(t) + 2.5 * S, hh * 0.45), (-w - 0.65 * S, Y(t) - 2.5 * S, hh * 0.45), 2.4, 0.25, M['GOLD'])

    k.machinery('mach_belly', sec, LEN, LY0, lt(0.2), lt(0.9), math.pi + 1.0, math.tau - 1.0, M, count=40, h=1.6, seed=1301)
    k.machinery('mach_deck', sec, LEN, LY0, lt(0.62), lt(0.9), 0.6, math.pi - 0.6, M, count=40, h=1.8, seed=1302)
    for s, bank, t in ((-1, 'FL', 0.24), (1, 'FR', 0.28), (-1, 'ML', 0.72), (1, 'MR', 0.76)):
        w, top, bot, n, zo = sec(lt(t))
        barbette(k, M, bank, s * w * 0.45, Y(t), top * 0.92, 1.1 * S, 0.7 * S)
    for x, z, r, name in ((-1.0, 1.2, 1.1, 'MAIN'), (1.0, 1.2, 0.8, 'STARBOARD'), (-1.0, -0.9, 0.8, 'PORT'), (1.0, -0.9, 0.6, 'AUX')):
        k.nozzle('nozzle', (x * S, Y(1.0) - 0.4 * S, z * S), r * S, 1.8 * r * S, M, glow='GLOW')
        k.empty('ENGINE_' + name, (x * S, Y(1.0) - 1.4 * r * S, z * S), r * S)

    k.finish(skip=('core', 'body', 'sail', 'rivets', 'NODE', 'ENGINE', 'windows', 'mach', 'cannon'))
    print('windows', k.deck_windows(('body', 'cockpit'), rows=(-0.12, -0.04, 0.04, 0.12, 0.2), step=2.6, size=(0.2, 1.2, 0.6)))


LOOKS = looks('rust', L)
