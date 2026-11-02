"""Harpy Claw · Savanah cruiser (280 m, 4 hardpoints) · Blender hero hull, forged in pass 2.

A predator bird in armour: a hooked beak-head drooping at the bow, two forward-swept wings built
from layered feather blades, two great talons curling under the belly, a fan tail of three blades
and a triple drive. Savanah family with the Green Seed: olive armour, gold, green fire.
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _forge import ss, bump, prow, fang, armour, machinery_bands, conduits, barbette, looks  # noqa: E402

META = {'name': 'harpy_claw_hero.glb', 'hull': 'savanah_cruiser', 'tile': 12.0, 'bake_size': 2048}
L = 280.0
Y0 = L / 2
S = L / 50.0
LOFT0 = 0.0


def Y(t):
    return Y0 - t * L


def sec(t):
    p = prow(t, 0.07)
    head = bump(0.14, 0.08, t)
    w = (1.6 + 3.4 * ss(0.12, 0.45, t) + 1.1 * head) * (1 - 0.35 * ss(0.8, 1, t)) * p * S
    top = (1.4 + 2.2 * ss(0.12, 0.45, t) + 1.4 * head) * p * S
    bot = (1.2 + 2.0 * ss(0.12, 0.45, t)) * p * S
    zo = -1.2 * S * (1 - ss(0.0, 0.2, t))   # the beak droops
    return w, top, bot, 2.8, zo


LEN = L
LY0 = Y(0)
lt = lambda t: t


def build(k):
    M = k.palette()
    M['CORE'] = k.material('CORE', (0.0, 0.0, 0.0), 1.0, 0.05)
    hull = k.loft('body', LEN, sec, rings=40, segs=30, mat=M['HULL'], y0=LY0)
    k.panelize(hull, 40, 30, skip_row=3, skip_col=4, depth=0.3, thickness=0.35, keep=lambda i, j: 3 <= i <= 37)
    k.bevel(hull, 0.25, 1, 30)
    k.weighted_normals(hull)
    k.smooth(hull)

    # Beak: a hooked gold-edged blade over the bow, two eye sensors.
    w_, top_, bot_, n_, zo_ = sec(0.12)
    k.wedge('beak', (2.0 * S, 7.0 * S, 1.6 * S), (0, Y(0.07), zo_ + top_ * 0.7), M['TRIM'], slope=0.7, back=0.2)
    fang(k, 'beak_hook', (0, Y(0.03), zo_ + top_ * 0.5), (0, Y(-0.012), zo_ - 1.6 * S), 0.9 * S, M['GOLD'], sides=4)
    for s in (-1, 1):
        k.sphere('eye', 0.45 * S, (s * w_ * 0.82, Y(0.13), zo_ + top_ * 0.45), M['GLOW'], 16)
        k.torus('eye_rim', 0.55 * S, 0.1 * S, (s * w_ * 0.82, Y(0.13), zo_ + top_ * 0.45), M['GOLD'], rot=(0, math.pi / 2, 0), segs=24, rsegs=6)

    # Wings: forward-swept, three layered feather blades each, ribs underneath, a gold leading edge.
    yw = Y(0.46)
    for s in (-1, 1):
        for f, (span, sweep, z, th, mat) in enumerate(((15.0, 6.0, 0.6, 0.5, 'TRIM'), (12.5, 4.0, 1.2, 0.45, 'HULL'), (9.5, 2.0, 1.75, 0.4, 'TRIM'))):
            out = [(0, 3.0 * S), (s * span * S, (3.0 + sweep) * S), (s * (span + 1.2) * S, (1.5 + sweep) * S), (s * (span - 1.0) * S, (sweep - 1.5) * S), (s * 1.0 * S, -6.0 * S)]
            k.plate('feather', out, th * S, M[mat], loc=(s * 3.0 * S, yw - f * 1.6 * S, z * S), bevel_w=0.25)
        k.tube('wing_edge', [(s * 3.2 * S, yw + 3.3 * S, 1.0 * S), (s * 10.0 * S, yw + 7.2 * S, 1.0 * S), (s * 18.0 * S, yw + 9.1 * S, 0.9 * S)], [0.2 * S, 0.18 * S, 0.06 * S], M['GOLD'], ends=('round', 'point'), res=4)
        k.tube('wing_fire', [(s * 4.0 * S, yw + 1.0 * S, 1.25 * S), (s * 14.0 * S, yw + 5.5 * S, 1.25 * S)], [0.08 * S] * 2, M['GLOW'], ends=('round', 'round'))
        for ry, x1 in ((2.0, 14.0), (-1.5, 12.0), (-4.5, 8.0)):
            k.box('wing_rib', ((x1 - 3.5) * S, 0.4 * S, 0.6 * S), (s * (3.5 + x1) / 2 * S, yw + ry * S, 0.2 * S), M['HULL'])
        k.light_strip('wing_lights', (s * 4.5 * S, yw - 1.0 * S, 2.1 * S), (s * 13.0 * S, yw + 3.6 * S, 2.1 * S), 20, 0.6, M['GLOW'])
        # Talons: armoured limbs curling down and forward under the belly.
        pts = [(s * 2.6 * S, Y(0.4), -2.6 * S), (s * 3.6 * S, Y(0.32), -5.0 * S), (s * 3.2 * S, Y(0.22), -6.4 * S), (s * 2.2 * S, Y(0.14), -5.6 * S), (s * 1.6 * S, Y(0.1), -4.2 * S)]
        talon, T = k.limb('talon', pts, [1.3 * S, 1.1 * S, 0.9 * S, 0.65 * S, 0.4 * S], M['TRIM'], core_mat=M['HULL'], sides=6, squash=0.85, plates=8, up=(s, 0, 0), flare=1.12, tip=3.0)
        for j in range(4):
            pp, rr, (t, sd, upv) = T.at(0.2 + j * 0.18)
            b_ = pp + sd * rr * 0.6 * (-1)
            fang(k, 'talon_spur', tuple(b_), tuple(b_ - sd * 0.9 * S + t * 0.3 * S), 0.22 * S, M['GOLD'], sides=3)

    # Fan tail.
    for a in (-0.5, 0.0, 0.5):
        blade = k.plate('tail', [(0, 0), (-1.2 * S, -9.0 * S), (0.0, -11.0 * S), (1.2 * S, -9.0 * S)], 0.45 * S, M['TRIM'], loc=(0, Y(0.84), 2.0 * S), bevel_w=0.2)
        blade.rotation_euler = (0.35, a, 0)

    armour(k, M, sec, LEN, LY0, lt, dorsal=((0.16, 0.24), (0.23, 0.32), (0.56, 0.65), (0.64, 0.74), (0.73, 0.83)), flanks=((0.2, 0.3), (0.33, 0.42), (0.55, 0.65), (0.68, 0.79)), thick=0.65, seed=201)
    machinery_bands(k, M, sec, LEN, LY0, lt, 0.2, 0.88, 2.0, seed=211, dorsal_gap=(0.33, 0.55), density=1.0)
    conduits(k, M, sec, LEN, LY0, lt, (0.2, 0.35, 0.5, 0.65, 0.8), 0.5)

    for s, bank, t, r in ((-1, 'FL', 0.38, 1.0), (1, 'FR', 0.38, 1.0), (-1, 'ML', 0.62, 1.0), (1, 'MR', 0.62, 1.0)):
        w, top, bot, n, zo = sec(t)
        barbette(k, M, bank, s * w * 0.5, Y(t), zo + top * 0.9, 1.25 * S, 0.9 * S)

    for x, z, name in ((-2.0, 0.0, 'PORT'), (0.0, 1.0, 'MAIN'), (2.0, 0.0, 'STARBOARD')):
        k.nozzle('nozzle', (x * S, Y(1.0) - 0.5 * S, z * S), 1.05 * S, 2.0 * S, M, glow='GLOW')
        k.cowl('cowl', (x * S, Y(1.0) - 0.2 * S, z * S), 1.05 * S, 2.3 * S, M)
        k.empty('ENGINE_' + name, (x * S, Y(1.0) - 1.6 * S, z * S), 1.05 * S)
    w, top, bot, n, zo = sec(0.5)
    k.wedge('bridge', (3.0 * S, 6.0 * S, 1.8 * S), (0, Y(0.5), top * 0.95 + 0.6 * S), M['HULL'], slope=0.5, back=0.3)
    k.box('bridge_glass', (2.2 * S, 0.1 * S, 0.3 * S), (0, Y(0.5) + 1.2 * S, top * 0.95 + 1.1 * S), k.window_material())
    k.sensor_mast('mast', (0.6 * S, Y(0.52), top * 0.95 + 1.5 * S), 14.0, M['TRIM'], M['GLOW'], dish=3.0)

    k.finish(skip=('core', 'body', 'NODE', 'ENGINE', 'windows', 'talon', 'mach', 'plate_kit', 'cowl', 'eye'))
    print('windows', k.deck_windows(('body', 'bridge'), rows=(-0.2, -0.12, -0.04, 0.04, 0.12), step=2.6, size=(0.2, 1.2, 0.6)))


LOOKS = looks('savanah', L)
