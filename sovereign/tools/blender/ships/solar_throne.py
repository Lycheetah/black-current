"""Solar Throne · Cosmic Light battleship (1 km, 5 hardpoints) · Cosmic Light flagship.

A cathedral of light: an ivory hull with gold filigree, a colossal sun disc standing behind the
throne-bridge with rays blazing outward, six gold sun-blade wings fanned like rays, a lance of light
at the bow, hangar bays in the flanks. Dominant feature: the standing sun."""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _forge import ss, bump, prow, fang, armour, machinery_bands, conduits, barbette, looks, dress_plate  # noqa: E402

META = {'name': 'solar_throne_hero.glb', 'hull': 'cosmic_light_battleship', 'tile': 30.0, 'bake_size': 2048}
L = 1000.0
Y0 = L / 2
S = L / 75.0
LOFT0 = 0.1


def Y(t):
    return Y0 - t * L


def sec(t):
    p = prow(t, 0.1)
    w = (2.8 + 3.2 * ss(0.0, 0.35, t) + 0.8 * bump(0.55, 0.12, t)) * (1 - 0.3 * ss(0.85, 1, t)) * p * S
    top = (2.6 + 2.6 * ss(0.0, 0.35, t)) * p * S
    bot = (2.2 + 2.0 * ss(0.0, 0.35, t)) * p * S
    return w, top, bot, 2.4, 0.0


LEN = L * (1 - LOFT0)
LY0 = Y(LOFT0)
lt = lambda t: (t - LOFT0) / (1 - LOFT0)


def build(k):
    M = k.palette()
    M['CORE'] = k.material('CORE', (0.0, 0.0, 0.0), 1.0, 0.05)
    M['SUNCORE'] = k.material('SUNCORE', (1.0, 0.9, 0.6), 0.0, 0.3, emit=(1.0, 0.88, 0.6))
    hull = k.loft('body', LEN, sec, rings=40, segs=34, mat=M['HULL'], y0=LY0)
    k.panelize(hull, 40, 34, skip_row=3, skip_col=4, depth=1.0, thickness=1.2, keep=lambda i, j: 3 <= i <= 37)
    k.bevel(hull, 0.8, 1, 30)
    k.weighted_normals(hull)
    k.smooth(hull)
    armour(k, M, sec, LEN, LY0, lt, dorsal=((0.14, 0.26), (0.25, 0.37), (0.36, 0.48)), flanks=((0.16, 0.3), (0.34, 0.48), (0.52, 0.66), (0.7, 0.84)), thick=2.2, seed=6000)
    machinery_bands(k, M, sec, LEN, LY0, lt, 0.16, 0.92, 5.0, seed=6010, dorsal_gap=None, density=0.8)
    conduits(k, M, sec, LEN, LY0, lt, (0.16, 0.32, 0.5, 0.68, 0.86), 1.6)
    # The throne-bridge and the standing sun behind it.
    w, top, bot, n, zo = sec(lt(0.62))
    k.bridge_tower('throne', (0, Y(0.6), top - 0.5 * S), 14.0 * S, 12.0 * S, 16.0 * S, M, decks=3, seed=6020)
    sy, sz, R = Y(0.7), top + 26.0 * S, 18.0 * S
    k.sphere('sun', R * 0.55, (0, sy, sz), M['SUNCORE'], 48)
    k.armour_ring('sun_rim', R * 0.62, 1.2 * S, 3.0 * S, (0, sy, sz), M, rot=(math.pi / 2, 0, 0), blocks=24, gap=0.08)
    k.armour_ring('sun_outer', R * 0.86, 0.8 * S, 2.2 * S, (0, sy, sz), M, rot=(math.pi / 2, 0, 0), blocks=32, gap=0.18)
    for i in range(24):
        a = i / 24 * math.tau
        c, s_ = math.cos(a), math.sin(a)
        ln = (12.0 if i % 2 == 0 else 7.0) * S
        fang(k, 'sun_ray', (c * R * 0.9, sy, sz + s_ * R * 0.9), (c * (R * 0.9 + ln), sy - 0.8 * S, sz + s_ * (R * 0.9 + ln)), (1.2 if i % 2 == 0 else 0.8) * S, M['GOLD'], sides=4)
    for s in (-1, 1):
        k.box('sun_pylon', (2.2 * S, 3.0 * S, 22.0 * S), (s * 6.0 * S, sy, top + 10.0 * S), M['TRIM'], rot=(0, s * 0.28, 0))
        k.box_kit('sun_pylon_kit', (s * 6.0 * S, sy, top + 10.0 * S), (2.2 * S, 3.0 * S, 22.0 * S), M, faces=('left', 'right'), count=8, h=2.0, seed=6030 + (s > 0))
    # Six gold sun-blade wings fanned like rays (three a side).
    for s in (-1, 1):
        for j, (ang, span, t) in enumerate(((0.38, 28.0, 0.44), (0.0, 32.0, 0.5), (-0.38, 26.0, 0.56))):
            w, top, bot, n, zo = sec(lt(t))
            blade = k.plate('sun_blade', [(0, 2.6 * S), (s * span * S, 0.6 * S), (s * (span + 3.0) * S, -0.2 * S), (s * span * S, -1.4 * S), (0, -3.2 * S)], 0.8 * S, M['GOLD'] if j == 1 else M['HULL'], loc=(s * w * 0.9, Y(t), 0.0), bevel_w=0.5)
            blade.rotation_euler = (0, -s * ang, 0)
            k.light_strip('blade_lights', (s * w * 1.0, Y(t), math.sin(ang) * 4.0 * S), (s * (w + span * 0.9 * S * math.cos(ang)), Y(t), math.sin(ang) * span * 0.9 * S), 30, 1.4, M['GLOW'])
    # The lance of light at the bow, and hangar bays in the flanks.
    fang(k, 'lance', (0, Y(LOFT0) + 1.0 * S, 0.0), (0, Y(-0.08), 0.0), 2.6 * S, M['GOLD'], sides=6)
    k.armour_ring('lance_collar', 4.6 * S, 0.8 * S, 2.0 * S, (0, Y(LOFT0) + 0.6 * S, 0.0), M, rot=(math.pi / 2, 0, 0), blocks=16, gap=0.12)
    for s in (-1, 1):
        w, top, bot, n, zo = sec(lt(0.3))
        k.hangar_bay('bay', (s * w * 1.0, Y(0.3), -0.8 * S), (0, 1, 0), (0, 0, 1), (s, 0, 0), 16.0 * S, 4.0 * S, 3.0 * S, M)
    for s, bank, t in ((-1, 'FL', 0.26), (1, 'FR', 0.26), (-1, 'ML', 0.42), (1, 'MR', 0.42)):
        w, top, bot, n, zo = sec(lt(t))
        barbette(k, M, bank, s * w * 0.5, Y(t), top * 0.95, 2.2 * S, 1.1 * S)
    w, top, bot, n, zo = sec(lt(0.84))
    barbette(k, M, 'AL', 0, Y(0.84), top * 0.95, 2.6 * S, 1.1 * S)
    for i, (x, z, r) in enumerate(((-3.6, -1.0, 2.0), (3.6, -1.0, 2.0), (0.0, 2.2, 2.2))):
        k.nozzle('nozzle', (x * S, Y(1.0) - 0.8 * S, z * S), r * S, 2.0 * r * S, M, glow='GLOW')
        k.cowl('cowl', (x * S, Y(1.0) - 0.4 * S, z * S), r * S, 2.3 * r * S, M)
        k.empty('ENGINE_%d' % i, (x * S, Y(1.0) - 2.0 * r * S, z * S), r * S)
    k.finish(skip=('core', 'body', 'sun', 'lance_collar', 'throne', 'bay', 'NODE', 'ENGINE', 'windows', 'mach', 'plate_kit', 'cowl', 'blade_lights'))
    print('windows', k.deck_windows(('body', 'throne'), rows=(-0.16, -0.08, 0.0, 0.08, 0.16, 0.26), step=3.2, size=(0.25, 1.4, 0.8)))


LOOKS = dict(looks('cosmic_light', L), SUNCORE=dict(emit=(1.0, 0.88, 0.6)))
