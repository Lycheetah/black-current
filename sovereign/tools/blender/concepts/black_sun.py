"""Black Sun · Blackhole battleship (5 hardpoints) · concept blockouts.

Codex: "Battleships become dark claws around an artificial star." Family with the Fang and the Maw:
knife spine, horizon blades, copper-lipped armour, fire seams, the ring. A battleship is a line
warship: heavy batteries, enormous mass, a silhouette you recognise from across the grid.

  A · CLAW CROWN   a massive armoured body; four great claws reach forward and close around a burning
                    artificial star held at the bow. Batteries on the claw roots and the spine.
  B · ECLIPSE      a thick ring hull (the eclipse) with the star inside; a long knife spine runs
                    through the ring; two claws forward; batteries ride the ring.
  C · TALON        a long heavy knife (the Fang scaled up) with two vast curved claws cradling the
                    star at the bow, and broad horizon blades amidships.
"""
import math
import os
import sys
sys.path.insert(0, os.path.dirname(__file__))
from _common import ss, bump, prow  # noqa: E402

# True hull length in metres (EVE scale); the blockout is drawn in loose units and scaled to this.
REAL_LENGTH = 1000
L = 75.0
Y0 = L / 2


def Y(t):
    return Y0 - t * L


def star(k, M, y, z, r):
    k.sphere('star', r, (0, y, z), M['FIRE'], 48)
    k.torus('star_corona', r * 1.25, r * 0.06, (0, y, z), M['FIRE'], rot=(math.pi / 2, 0, 0), segs=72, rsegs=8)


def claw_tube(k, M, root, tip_dir, length, r0, bend, name='claw'):
    pts, radii = [], []
    for i in range(9):
        u = i / 8
        pts.append((root[0] + tip_dir[0] * u * length * 0.55 - tip_dir[0] * bend * u ** 2 * length * 0.5,
                    root[1] + u * length,
                    root[2] + tip_dir[1] * u * length * 0.55 - tip_dir[1] * bend * u ** 2 * length * 0.5))
        radii.append(r0 * (1 - 0.6 * u) + 0.4)
    k.tube(name, pts, radii, M['TRIM'], ends=('round', 'point'))
    k.tube(name + '_fire', [(p[0], p[1], p[2] + r * 0.9) for p, r in zip(pts[1:-2], radii[1:-2])], [0.16] * 6, M['FIRE'], ends=('round', 'round'))


def crown(k, M):
    def body(t):
        p = prow(t, 0.08)
        w = (3.0 + 6.0 * ss(0.0, 0.4, t) * (1 - 0.2 * ss(0.85, 1, t))) * p
        top = (2.5 + 5.0 * ss(0.0, 0.45, t)) * p
        bot = (2.5 + 4.2 * ss(0.0, 0.5, t)) * p
        return w, top, bot, 3.0, 0.0
    k.loft('body', L * 0.72, body, rings=26, segs=32, mat=M['HULL'], y0=Y(0.28))
    star(k, M, Y(0.1), 0.5, 4.2)
    for a in (0.8, math.pi - 0.8, math.pi + 0.8, -0.8):
        d = (math.cos(a), math.sin(a))
        claw_tube(k, M, (d[0] * 5.5, Y(0.42), d[1] * 5.0 + 0.5), (d[0], d[1]), 30.0, 3.0, 1.6)
    for s in (-1, 1):
        k.plate('horizon_blade', [(0, 0), (s * 12.0, -9.0), (s * 13.5, 3.0), (s * 9.0, 7.0), (s * 4.0, 5.0)], 1.8, M['TRIM'], loc=(0, Y(0.66), 0.3), bevel_w=0.25)
        k.turret('turret', (s * 6.4, Y(0.48), 6.4), M, scale=1.6)
        k.turret('turret', (s * 6.8, Y(0.74), 5.6), M, scale=1.6)
    k.turret('turret', (0, Y(0.6), 8.4), M, scale=1.8)
    k.torus('event_ring', 7.0, 1.0, (0, Y(0.86), 4.0), M['TRIM'], rot=(math.pi / 2 - 0.3, 0, 0), segs=72, rsegs=14)
    k.wedge('drive_block', (13.0, 8.0, 9.0), (0, Y(0.95), 0.5), M['TRIM'], slope=-0.2, back=0.35)
    for x, z in ((-3.6, -1.6), (3.6, -1.6), (-3.6, 2.4), (3.6, 2.4)):
        k.nozzle('nozzle', (x, Y(1.0) - 1.0, z), 1.8, 3.0, M)


def eclipse(k, M):
    def spine(t):
        p = prow(t, 0.06)
        w = (1.8 + 3.6 * ss(0.0, 0.4, t)) * p
        top = (1.6 + 3.8 * ss(0.0, 0.45, t)) * p
        bot = (1.6 + 3.2 * ss(0.0, 0.5, t)) * p
        return w, top, bot, 3.3, 0.0
    k.loft('spine', L, spine, rings=28, segs=28, mat=M['HULL'], y0=Y0)
    yc = Y(0.5)
    k.torus('eclipse_ring', 13.0, 3.2, (0, yc, 0.5), M['HULL'], rot=(math.pi / 2, 0, 0), segs=96, rsegs=18)
    k.torus('eclipse_fire', 9.9, 0.3, (0, yc, 0.5), M['FIRE'], rot=(math.pi / 2, 0, 0), segs=96)
    star(k, M, yc + 1.0, 0.5, 5.0)
    for a in (0.5, math.pi - 0.5, math.pi / 2, math.pi + 0.9, -0.9):
        x, z = math.cos(a) * 16.4, math.sin(a) * 16.4 + 0.5
        k.turret('turret', (x, yc - 1.0, z), M, scale=1.5, up=math.pi / 2 - a)
    for s in (-1, 1):
        claw_tube(k, M, (s * 3.0, Y(0.3), 0.0), (s, 0.0), 18.0, 2.2, 1.2)
    k.wedge('drive_block', (10.0, 8.0, 8.0), (0, Y(0.94), 0.4), M['TRIM'], slope=-0.2, back=0.35)
    for x in (-2.8, 2.8):
        k.nozzle('nozzle', (x, Y(1.0) - 1.0, 0.4), 2.0, 3.2, M)


def talon(k, M):
    def spine(t):
        p = prow(t, 0.06)
        w = (2.2 + 5.0 * ss(0.05, 0.45, t) * (1 + 0.2 * bump(0.6, 0.15, t))) * p
        top = (1.8 + 5.0 * ss(0.05, 0.5, t)) * p
        bot = (1.8 + 4.0 * ss(0.05, 0.55, t)) * p
        return w, top, bot, 3.3, 0.0
    k.loft('spine', L * 0.85, spine, rings=28, segs=30, mat=M['HULL'], y0=Y(0.15))
    star(k, M, Y(0.04), 0.8, 4.0)
    for s in (-1, 1):
        pts, radii = [], []
        for i in range(10):
            u = i / 9
            pts.append((s * (6.0 + 6.5 * math.sin(u * 2.4) - 5.8 * u ** 2), Y(0.36) + u * 30.0, 0.8 + 1.0 * math.sin(u * 3.0)))
            radii.append(3.2 * (1 - 0.6 * u) + 0.5)
        k.tube('talon', pts, radii, M['TRIM'], ends=('round', 'point'))
        k.tube('talon_fire', [(p[0], p[1], p[2] + r * 0.9) for p, r in zip(pts[1:-2], radii[1:-2])], [0.16] * 7, M['FIRE'], ends=('round', 'round'))
        k.plate('horizon_blade', [(0, 0), (s * 13.0, -8.0), (s * 14.5, 4.0), (s * 9.5, 8.0), (s * 4.0, 5.0)], 1.8, M['TRIM'], loc=(0, Y(0.62), 0.3), bevel_w=0.25)
        k.turret('turret', (s * 7.6, Y(0.55), 5.6), M, scale=1.6)
        k.turret('turret', (s * 8.0, Y(0.78), 4.8), M, scale=1.6)
    k.turret('turret', (0, Y(0.42), 7.2), M, scale=1.8)
    k.torus('event_ring', 6.0, 0.95, (0, Y(0.66), 7.6), M['TRIM'], rot=(math.pi / 2 - 0.3, 0, 0), segs=72, rsegs=14)
    k.sphere('singularity', 2.6, (0, Y(0.66), 7.6), M['CORE'], 40)
    k.wedge('drive_block', (12.0, 8.0, 8.5), (0, Y(0.95), 0.6), M['TRIM'], slope=-0.2, back=0.35)
    for x in (-3.4, 0.0, 3.4):
        k.nozzle('nozzle', (x, Y(1.0) - 1.0, 0.6 + (1.6 if x == 0 else -0.8)), 1.9, 3.0, M)


VARIANTS = {'A_claw_crown': crown, 'B_eclipse': eclipse, 'C_talon': talon}

EVE_BAR = {
    'criteria': [
        ('Thumbnail read', 'Recognisable across the grid, like an Apocalypse, Megathron or Raven'),
        ('Front and back', 'You can tell the nose and the engines at a glance'),
        ('Believable function', 'Five heavy batteries, big drives, real mass'),
        ('One memorable feature', 'Claws around an artificial star (the codex line)'),
        ('Family with the Fang', 'Same civilisation at a glance'),
        ('Surface detail', 'Plating, seams, hatches, lights, decals: EVE density up close'),
    ],
    'scores': {
        'A_claw_crown': [('PASS', ''), ('PASS', 'star leads'), ('PASS', ''), ('PASS', 'the codex line exactly'), ('WEAK', 'claws over blades'), ('FAIL', 'blockout')],
        'B_eclipse': [('PASS', 'strongest shape'), ('WEAK', 'ring dominates'), ('PASS', 'ring batteries'), ('PASS', 'the eclipse'), ('WEAK', 'new form'), ('FAIL', 'blockout')],
        'C_talon': [('PASS', ''), ('PASS', ''), ('PASS', ''), ('PASS', 'talons and star'), ('PASS', 'Fang grown up'), ('FAIL', 'blockout')],
    },
}
