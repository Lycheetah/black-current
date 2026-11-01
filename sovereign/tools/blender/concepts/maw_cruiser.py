"""Maw Cruiser · Blackhole cruiser (4 hardpoints) · concept blockouts.

Family with the Gravity Fang: knife spine, forward-swept horizon blades, copper-lipped armour, fire
seams, a singularity at the heart inside a standing ring. A cruiser is the Fang grown up: more mass,
more guns, and one bigger idea.

  A · THE MAW        the bow splits into an upper and a lower jaw that open around a forward
                      singularity: the ship is a mouth. Ring behind the jaws, four shoulder batteries.
  B · TWIN HORIZON   two Fang-like knife hulls side by side, bridged by a ring that holds the
                      singularity between them. Batteries on the outer flanks.
  C · GRAVITY VANES  one heavy spine with four great vanes in an X (the destroyer lore grown up);
                      the singularity sits aft in its ring, between the vanes.
"""
import math
import os
import sys
sys.path.insert(0, os.path.dirname(__file__))
from _common import ss, bump, prow  # noqa: E402

# True hull length in metres (EVE scale); the blockout is drawn in loose units and scaled to this.
REAL_LENGTH = 280
L = 50.0
Y0 = L / 2


def Y(t):
    return Y0 - t * L


def maw(k, M):
    """The ship is a mouth: a heavy head with two thick curved jaws (upper and lower) that open forward
    and end in fangs, teeth along their inner edges, the singularity burning in the throat, the ring as
    a collar behind the head, horizon blades and four batteries on the long body."""
    def body(t):
        p = prow(t, 0.04)
        head = bump(0.12, 0.1, t)
        w = (2.4 + 3.6 * ss(0.0, 0.3, t) + 1.4 * head) * (1 - 0.22 * ss(0.85, 1, t)) * p
        top = (2.2 + 2.8 * ss(0.0, 0.3, t) + 1.2 * head) * p
        bot = (2.0 + 2.4 * ss(0.0, 0.35, t) + 0.8 * head) * p
        return w, top, bot, 3.0, 0.0
    k.loft('body', L * 0.82, body, rings=30, segs=30, mat=M['HULL'], y0=Y(0.18))
    y_throat = Y(0.18)
    # Throat: a dark socket with the singularity burning inside.
    k.sphere('singularity', 2.6, (0, y_throat + 0.6, 0.3), M['CORE'], 40)
    k.torus('throat_glow', 3.2, 0.22, (0, y_throat + 0.2, 0.3), M['FIRE'], rot=(math.pi / 2, 0, 0), segs=64)
    # Upper and lower jaws: thick curved arms opening forward, fang-tipped, teeth inside.
    for sgn in (1, -1):
        for s_ in (-1, 1):
            pts, radii = [], []
            for i in range(9):
                u = i / 8
                pts.append((s_ * (2.6 - 1.4 * u), y_throat + u * 13.0, sgn * (2.4 + 3.4 * math.sin(u * 1.9) - 2.6 * u ** 2.2)))
                radii.append(1.5 * (1 - 0.55 * u) + 0.25)
            k.tube('jaw', pts, radii, M['TRIM'], ends=('round', 'point'))
            for j in range(2, 7):
                p_ = pts[j]
                k.tube('tooth', [(p_[0] * 0.8, p_[1], p_[2] - sgn * radii[j] * 0.7), (p_[0] * 0.65, p_[1] + 0.3, p_[2] - sgn * (radii[j] + 1.3))],
                       [0.35, 0.05], M['TRIM'], ends=('round', 'point'))
            k.tube('jaw_fire', [(p[0], p[1], p[2] + sgn * r * 0.85) for p, r in zip(pts[1:-2], radii[1:-2])], [0.12] * 6, M['FIRE'], ends=('round', 'round'))
    # Collar ring around the neck, behind the head.
    k.torus('event_ring', 7.6, 0.85, (0, Y(0.34), 0.4), M['TRIM'], rot=(math.pi / 2 - 0.25, 0, 0), segs=72, rsegs=14)
    k.torus('ring_fire', 7.6, 0.22, (0, Y(0.34) + 0.9, 0.4), M['FIRE'], rot=(math.pi / 2 - 0.25, 0, 0), segs=72)
    for s_ in (-1, 1):
        blade = [(0, 0), (s_ * 9.0, -6.0), (s_ * 10.5, 2.5), (s_ * 7.5, 6.0), (s_ * 3.0, 4.0)]
        k.plate('horizon_blade', blade, 1.3, M['TRIM'], loc=(0, Y(0.64), 0.3), bevel_w=0.2)
        for i, t in enumerate((0.48, 0.74)):
            k.turret('turret', (s_ * 3.6, Y(t), 4.8 - i * 0.5), M, scale=1.15)
    k.wedge('drive_block', (8.0, 6.0, 5.4), (0, Y(0.95), 0.4), M['TRIM'], slope=-0.2, back=0.35)
    for x in (-2.4, 0.0, 2.4):
        k.nozzle('nozzle', (x, Y(1.0) - 0.6, 0.4 + (0.9 if x == 0 else -0.4)), 1.25, 2.2, M)


def twin(k, M):
    def knife(t):
        p = prow(t, 0.06)
        w = (0.9 + 1.9 * ss(0.0, 0.4, t)) * p
        top = (0.8 + 2.4 * ss(0.0, 0.45, t)) * p
        bot = (0.8 + 2.0 * ss(0.0, 0.5, t)) * p
        return w, top, bot, 3.4, 0.0
    for s in (-1, 1):
        h = k.loft('knife', L * 0.95, knife, rings=24, segs=24, mat=M['HULL'], y0=Y(0.0))
        h.location.x = s * 5.2
        k.plate('outer_blade', [(0, 0), (s * 6.5, -5.0), (s * 7.0, 1.5), (s * 2.0, 3.5)], 1.0, M['TRIM'], loc=(s * 7.0, Y(0.6), 0.3), bevel_w=0.16)
        k.turret('turret', (s * 7.6, Y(0.38), 2.2), M, scale=1.05)
        k.turret('turret', (s * 7.4, Y(0.75), 2.0), M, scale=1.05)
        k.nozzle('nozzle', (s * 5.2, Y(0.95) - 1.2, 0.2), 1.25, 2.0, M)
        k.tube('flank_fire', [(s * 8.1, Y(0.2), 0.4), (s * 8.4, Y(0.5), 0.4), (s * 8.1, Y(0.8), 0.4)], [0.1] * 3, M['FIRE'], ends=('round', 'round'))
    # The bridge ring between the hulls, the singularity held in its middle.
    k.wedge('bridge', (8.0, 9.0, 2.2), (0, Y(0.5), 0.6), M['TRIM'], slope=0.3, back=0.3)
    k.torus('event_ring', 4.4, 0.75, (0, Y(0.5), 3.4), M['TRIM'], rot=(math.pi / 2 - 0.25, 0, 0), segs=72, rsegs=14)
    k.torus('ring_fire', 3.8, 0.16, (0, Y(0.5), 3.4), M['FIRE'], rot=(math.pi / 2 - 0.25, 0, 0), segs=72)
    k.sphere('singularity', 2.2, (0, Y(0.5), 3.4), M['CORE'], 40)


def vanes(k, M):
    def spine(t):
        p = prow(t, 0.06)
        w = (1.4 + 3.0 * ss(0.0, 0.4, t) * (1 - 0.2 * ss(0.85, 1, t))) * p
        top = (1.3 + 3.2 * ss(0.0, 0.45, t)) * p
        bot = (1.3 + 2.8 * ss(0.0, 0.5, t)) * p
        return w, top, bot, 3.3, 0.0
    k.loft('spine', L, spine, rings=28, segs=28, mat=M['HULL'], y0=Y0)
    for i, a in enumerate((0.75, math.pi - 0.75, math.pi + 0.75, -0.75)):
        vane = k.plate('vane', [(0, 7.0), (0, -9.0), (9.5, -12.0), (11.0, -6.0), (6.0, 4.0)], 1.1, M['TRIM'], loc=(0, Y(0.45), 0), bevel_w=0.2)
        vane.location = (0, Y(0.45), 0)
        vane.rotation_euler = (0, -a, 0)
        x, z = math.cos(a) * 9.5, math.sin(a) * 9.5
        k.tube('vane_fire', [(math.cos(a) * 4.5, Y(0.45) + 4.2, math.sin(a) * 4.5), (x * 1.12, Y(0.45) - 6.0, z * 1.12)], [0.14, 0.14], M['FIRE'], ends=('round', 'round'))
    for t in (0.3, 0.6):
        for s in (-1, 1):
            k.turret('turret', (s * 2.6, Y(t), 3.9), M, scale=1.05)
    k.torus('event_ring', 4.6, 0.75, (0, Y(0.82), 0.4), M['TRIM'], rot=(math.pi / 2, 0, 0), segs=72, rsegs=14)
    k.sphere('singularity', 2.0, (0, Y(0.82), 0.4), M['CORE'], 40)
    k.torus('ring_fire', 4.0, 0.16, (0, Y(0.82) - 0.75, 0.4), M['FIRE'], rot=(math.pi / 2, 0, 0), segs=72)
    for x in (-1.6, 1.6):
        k.nozzle('nozzle', (x, Y(1.0) - 0.6, 0.4), 1.15, 2.0, M)


VARIANTS = {'A_the_maw': maw, 'B_twin_horizon': twin, 'C_gravity_vanes': vanes}

EVE_BAR = {
    'criteria': [
        ('Thumbnail read', 'Recognisable as one shape at 64 px, like a Rupture or Caracal on the overview'),
        ('Front and back', 'You can tell the nose and the engines at a glance'),
        ('Believable function', 'Four batteries, engines and mass where a working warship would put them'),
        ('One memorable feature', 'The thing you remember about it'),
        ('Family with the Fang', 'Same civilisation at a glance: knife, blades, ring, fire seams, singularity'),
        ('Surface detail', 'Plating, seams, hatches, lights, decals: EVE density up close'),
    ],
    'scores': {
        'A_the_maw': [('PASS', 'toothed mouth'), ('PASS', 'the mouth is the front'), ('WEAK', 'body is a plain tube'), ('PASS', 'the maw, unmistakable'), ('PASS', 'ring, blades, fire'), ('FAIL', 'blockout')],
        'B_twin_horizon': [('PASS', ''), ('PASS', ''), ('PASS', ''), ('PASS', 'twin hulls'), ('WEAK', 'reads as two Fangs'), ('FAIL', 'blockout')],
        'C_gravity_vanes': [('PASS', ''), ('WEAK', 'X reads both ways'), ('PASS', ''), ('PASS', 'the X vanes'), ('PASS', ''), ('FAIL', 'blockout')],
    },
}
