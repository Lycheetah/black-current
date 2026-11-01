"""Gravity Fang · Blackhole frigate · concept blockouts (three directions).

Codex: Blackhole frigates are "horizon knives"; the line is black/navy edged in burning orange around a
central singularity. Art direction: squat hull around a central mass, gravitational claws, accretion
ring, orange fire seams, very few windows, heavy squat casemates, deep recessed nozzles, no thin parts.
Reference lesson from the Rifter/Rupture: one strong primary shape, a clear nose and a clear engine
end, and one asymmetric or surprising element the eye remembers.

  A · HORIZON KNIFE   a broad armoured arrowhead; the singularity sits sunk in its back inside a
                       broken accretion ring; heavy casemates on the shoulders; a twin-nozzle block.
  B · GRAVITY CLAW    a dense core pod gripped by two thick forward claws that almost close at the
                       bow; a tilted ring around the core; engines out of the back of the pod.
  C · EVENT RING      a compact squat wedge driven through a thick vertical ring like a gyroscope;
                       the prow is a short knife, the ring carries the guns.
"""
import math

L = 30.0
Y0 = L / 2


def ss(a, b, x):
    t = min(1, max(0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def bump(c, w, x):
    return math.exp(-((x - c) / w) ** 2)


def prow(t, length=0.07):
    """Closes a loft's nose into a rounded chisel instead of a flat cut."""
    return min(1.0, t / length) ** 0.5


def knife(k, M):
    """A heavy blade: an armoured spine with a blunt chisel prow, forward-swept horizon blades, the
    singularity in a stepped notch inside a broken accretion ring, turrets on rear stubs, twin bells."""
    Y = lambda t: Y0 - t * L  # noqa: E731

    def spine(t):
        k_ = prow(t)
        w = (1.1 + 2.3 * ss(0.0, 0.35, t) * (1 + 0.25 * bump(0.6, 0.15, t))) * k_
        top = (0.8 + 2.4 * ss(0.0, 0.45, t)) * k_
        bot = (0.8 + 1.9 * ss(0.0, 0.5, t)) * k_
        return w, top, bot, 3.4, 0.0
    hull = k.loft('spine', L, spine, rings=28, segs=28, mat=M['HULL'], y0=Y0)
    k.bevel(hull, 0.14, 2, 30)
    # Ventral keel adds the vertical mass Blackhole needs.
    k.wedge('keel', (2.2, 14.0, 1.6), (0, Y(0.55), -2.6), M['TRIM'], slope=-0.25)
    for s in (-1, 1):
        blade = [(0, 0), (s * 8.5, -4.5), (s * 9.5, 2.5), (s * 6.5, 5.0), (s * 2.5, 3.0)]
        k.plate('horizon_blade', blade, 1.0, M['TRIM'], loc=(0, Y(0.55), 0.2), bevel_w=0.18)
        k.tube('blade_fire', [(s * 2.6, Y(0.55) + 3.05, 0.75), (s * 6.5, Y(0.55) + 5.05, 0.75), (s * 9.5, Y(0.55) + 2.55, 0.75)], [0.12] * 3, M['FIRE'], ends=('round', 'round'))
        k.plate('stub', [(s * 2.4, 0), (s * 5.8, -1.0), (s * 5.8, -4.0), (s * 2.4, -5.2)], 1.2, M['HULL'], loc=(0, Y(0.78), -0.1), bevel_w=0.15)
        k.turret('turret', (s * 4.1, Y(0.86), 1.0), M, scale=0.95)
    k.wedge('notch_wall', (4.6, 1.4, 1.6), (0, Y(0.36), 2.4), M['TRIM'], slope=0.5)
    k.sphere('core', 1.7, (0, Y(0.5), 2.9), M['CORE'], 40)
    k.torus('accretion', 2.7, 0.35, (0, Y(0.5), 2.8), M['FIRE'], rot=(0.25, 0, 0.6), arc=math.tau * 0.75, segs=64, rsegs=12)
    k.wedge('drive_block', (5.4, 4.0, 3.6), (0, Y(0.93), 0.4), M['TRIM'], slope=-0.2, back=0.35)
    for s in (-1, 1):
        k.nozzle('nozzle', (s * 1.35, Y(1.0) - 0.3, 0.4), 1.05, 1.8, M)


def claw(k, M):
    """A dense core pod gripped by two heavy claws that end in fangs; tilted ring; four bells."""
    Y = lambda t: Y0 - t * L  # noqa: E731

    def pod(t):
        k_ = prow(t, 0.18)
        w = (0.6 + 4.4 * ss(0.0, 0.4, t) * (1 - 0.4 * ss(0.8, 1.0, t))) * k_
        top = (0.5 + 3.0 * ss(0.0, 0.4, t) * (1 - 0.3 * ss(0.8, 1, t))) * k_
        return w, top, top * 0.9, 2.2, 0.0
    core = k.loft('core_pod', L * 0.62, pod, rings=24, segs=28, mat=M['HULL'], y0=Y(0.38))
    k.subsurf(core, 1)
    k.smooth(core)
    k.sphere('singularity', 1.4, (0, Y(0.48), 0), M['CORE'], 40)
    k.torus('ring', 4.6, 0.4, (0, Y(0.6), 0), M['FIRE'], rot=(math.pi / 2 - 0.35, 0.25, 0), segs=72, rsegs=12)
    for s in (-1, 1):
        pts, radii = [], []
        for i in range(9):
            u = i / 8
            pts.append((s * (4.0 + 2.8 * math.sin(u * 2.3) - 3.4 * u ** 2), Y(0.55) + u * 15.0, 0.4 * math.sin(u * 3.1)))
            radii.append(2.0 * (1 - 0.55 * u) + 0.35)
        k.tube('claw', pts, radii, M['TRIM'], ends=('round', 'point'))
        k.tube('claw_seam', [(p[0], p[1], p[2] + r * 0.88) for p, r in zip(pts[1:-1], radii[1:-1])], [0.09] * 7, M['FIRE'], ends=('round', 'round'))
        k.turret('turret', (s * 3.4, Y(0.66), 2.4), M, scale=0.9)
    for s in (-1, 1):
        for z in (-1.0, 1.0):
            k.nozzle('nozzle', (s * 1.2, Y(1.0) - 0.4, z), 0.78, 1.6, M)


def ring(k, M):
    """A compact armoured wedge driven through a thick vertical ring; the ring carries four turrets."""
    Y = lambda t: Y0 - t * L  # noqa: E731

    def sec(t):
        k_ = prow(t)
        w = (0.9 + 3.2 * ss(0.0, 0.45, t) * (1 - 0.2 * ss(0.85, 1, t))) * k_
        top = (0.8 + 2.6 * ss(0.0, 0.5, t)) * k_
        bot = (0.8 + 2.0 * ss(0.0, 0.5, t)) * k_
        return w, top, bot, 3.6, 0.0
    hull = k.loft('hull', L * 0.85, sec, rings=24, segs=28, mat=M['HULL'], y0=Y0)
    k.bevel(hull, 0.14, 2, 30)
    yc = Y(0.5)
    k.torus('event_ring', 6.6, 1.0, (0, yc, 0.4), M['TRIM'], rot=(math.pi / 2, 0, 0), segs=72, rsegs=16)
    k.torus('event_seam', 6.6, 0.22, (0, yc + 0.95, 0.4), M['FIRE'], rot=(math.pi / 2, 0, 0), segs=72)
    for s in (-1, 1):
        k.wedge('ring_strut', (1.2, 2.4, 3.2), (s * 4.6, yc, 0.4), M['HULL'], slope=0.0, rot=(0, s * 0.4, 0))
    k.sphere('singularity', 1.6, (0, yc, 3.0), M['CORE'], 40)
    for a in (0.6, math.pi - 0.6, math.pi + 0.95, -0.95):
        x, z = math.cos(a) * 7.4, math.sin(a) * 7.4 + 0.4
        k.turret('turret', (x, yc - 0.6, z), M, scale=0.85, up=math.pi / 2 - a)
    k.wedge('drive_block', (5.2, 4.2, 3.8), (0, Y(0.9), 0.3), M['TRIM'], slope=-0.2, back=0.35)
    k.nozzle('nozzle', (0, Y(0.98) - 0.6, 0.3), 1.45, 2.0, M)


VARIANTS = {'A_horizon_knife': knife, 'B_gravity_claw': claw, 'C_event_ring': ring}


# The EVE bar: how each direction measures against an EVE frigate (the Rifter standard), honestly.
EVE_BAR = {
    'criteria': [
        ('Thumbnail read', 'Recognisable as one shape at 64 px, like a Rifter or Rupture on the overview'),
        ('Front and back', 'You can tell the nose and the engines at a glance'),
        ('Believable function', 'Guns, engines and mass sit where a working warship would put them'),
        ('One memorable feature', 'The thing you remember (the Rifter\'s asymmetric spine and wings)'),
        ('Mass and proportion', 'A frigate should feel compact, tough and heavy for its size'),
        ('Surface detail', 'Plating, seams, hatches, lights, decals: EVE\'s density up close'),
    ],
    'scores': {
        'A_horizon_knife': [('PASS', ''), ('PASS', ''), ('PASS', ''), ('WEAK', 'notch core is subtle'), ('PASS', ''), ('FAIL', 'blockout: no detail yet')],
        'B_gravity_claw': [('PASS', 'strongest shape'), ('WEAK', 'claws vs pod'), ('WEAK', 'guns hidden'), ('PASS', 'the fangs'), ('PASS', ''), ('FAIL', 'blockout: no detail yet')],
        'C_event_ring': [('PASS', ''), ('PASS', ''), ('PASS', 'ring carries guns'), ('PASS', 'the ring'), ('WEAK', 'thin from the side'), ('FAIL', 'blockout: no detail yet')],
    },
}
