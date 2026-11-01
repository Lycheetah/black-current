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


def knife(k, M):
    """A heavy blade: a thick armoured spine with forward-swept horizon blades, a stepped notch behind
    them where the singularity sits in its broken ring, and a squat twin-drive block."""
    Y = lambda t: Y0 - t * L  # noqa: E731

    def spine(t):
        w = 0.5 + 2.6 * ss(0.0, 0.35, t) * (1 + 0.25 * bump(0.6, 0.15, t))
        top = 0.4 + 2.0 * ss(0.05, 0.45, t)
        bot = 0.4 + 1.5 * ss(0.05, 0.5, t)
        return w, top, bot, 3.0, 0.0
    hull = k.loft('spine', L, spine, rings=24, segs=24, mat=M['HULL'], y0=Y0)
    k.bevel(hull, 0.12, 2, 30)
    for s in (-1, 1):
        # Forward-swept horizon blades: thick, wedge-shaped, edged in fire.
        blade = [(0, 0), (s * 8.5, -4.5), (s * 9.5, 2.5), (s * 6.5, 5.0), (s * 2.5, 3.0)]
        k.plate('horizon_blade', blade, 0.9, M['TRIM'], loc=(0, Y(0.55), 0.2))
        k.tube('blade_fire', [(s * 2.6, Y(0.55) + 3.0, 0.8), (s * 6.5, Y(0.55) + 5.0, 0.8), (s * 9.5, Y(0.55) + 2.5, 0.8)], [0.12] * 3, M['FIRE'])
        # Rear stub wings carry the casemates.
        k.plate('stub', [(s * 2.4, 0), (s * 5.5, -1.0), (s * 5.5, -4.0), (s * 2.4, -5.0)], 1.1, M['HULL'], loc=(0, Y(0.78), 0.0))
        k.box('casemate', (2.0, 2.8, 1.5), (s * 4.0, Y(0.8), 1.2), M['TRIM'])
        k.cylinder('barrel', 0.32, 3.0, (s * 4.0, Y(0.8) + 2.6, 1.35), M['TRIM'])
    # The singularity set into a stepped notch in the back, inside a broken accretion ring.
    k.box('notch_wall', (4.6, 1.0, 1.4), (0, Y(0.36), 2.0), M['TRIM'])
    k.sphere('core', 1.7, (0, Y(0.5), 2.3), M['CORE'], 32)
    k.torus('accretion', 2.7, 0.35, (0, Y(0.5), 2.2), M['FIRE'], rot=(0.25, 0, 0.6), arc=math.tau * 0.75)
    # Squat twin-drive block with deep nozzles.
    k.box('drive_block', (5.0, 3.6, 3.2), (0, Y(0.95), 0.5), M['TRIM'])
    for s in (-1, 1):
        k.cylinder('nozzle', 1.05, 1.6, (s * 1.3, Y(1.0) - 0.6, 0.5), M['TRIM'], r2=1.2)
        k.cylinder('nozzle_glow', 0.75, 0.2, (s * 1.3, Y(1.0) - 1.2, 0.5), M['FIRE'])


def claw(k, M):
    Y = lambda t: Y0 - t * L  # noqa: E731

    def pod(t):
        w = 0.8 + 4.2 * ss(0.3, 0.6, t) * (1 - 0.4 * ss(0.85, 1.0, t))
        top = 0.6 + 2.6 * ss(0.3, 0.6, t) * (1 - 0.3 * ss(0.85, 1, t))
        return w, top, top * 0.9, 2.2, 0.0
    core = k.loft('core_pod', L * 0.7, pod, rings=20, segs=24, mat=M['HULL'], y0=Y(0.3))
    k.subsurf(core, 1); k.smooth(core)
    k.sphere('singularity', 1.4, (0, Y(0.48), 0), M['CORE'], 32)
    k.torus('ring', 4.6, 0.38, (0, Y(0.6), 0), M['FIRE'], rot=(math.pi / 2 - 0.35, 0.25, 0), arc=math.tau)
    # Two thick claws reaching forward, almost closing at the bow.
    for s in (-1, 1):
        pts, radii = [], []
        for i in range(9):
            u = i / 8
            ang = u * 2.3
            pts.append((s * (4.0 + 2.8 * math.sin(ang) - 3.4 * u ** 2), Y(0.55) + u * 16.0, 0.4 * math.sin(u * 3.1)))
            radii.append(2.0 * (1 - 0.55 * u) + 0.35)
        k.tube('claw', pts, radii, M['TRIM'])
        k.tube('claw_seam', [(p[0], p[1], p[2] + r * 0.85) for p, r in zip(pts[1:-1], radii[1:-1])], [0.08] * 7, M['FIRE'])
        k.box('casemate', (1.8, 2.4, 1.2), (s * 3.6, Y(0.62), 1.9), M['TRIM'])
    for s in (-1, 1):
        for z in (-0.9, 0.9):
            k.cylinder('nozzle', 0.75, 1.6, (s * 1.1, Y(1.0) - 0.2, z), M['TRIM'], r2=0.9)
            k.cylinder('nozzle_glow', 0.55, 0.2, (s * 1.1, Y(1.0) - 0.9, z), M['FIRE'])


def ring(k, M):
    Y = lambda t: Y0 - t * L  # noqa: E731

    def sec(t):
        w = 0.3 + 3.6 * ss(0.0, 0.45, t) * (1 - 0.2 * ss(0.85, 1, t))
        top = 0.3 + 2.2 * ss(0.05, 0.5, t)
        bot = 0.3 + 1.6 * ss(0.05, 0.5, t)
        return w, top, bot, 3.6, 0.0
    hull = k.loft('hull', L * 0.85, sec, rings=22, segs=24, mat=M['HULL'], y0=Y0)
    k.bevel(hull, 0.12, 2, 30)
    yc = Y(0.5)
    k.torus('event_ring', 6.4, 0.95, (0, yc, 0.4), M['TRIM'], rot=(math.pi / 2, 0, 0), segs=64, rsegs=14)
    k.torus('event_seam', 6.4, 0.25, (0, yc + 0.9, 0.4), M['FIRE'], rot=(math.pi / 2, 0, 0), segs=64)
    k.sphere('singularity', 1.6, (0, yc, 2.2), M['CORE'], 32)
    for a in (0.5, math.pi - 0.5, math.pi + 0.9, -0.9):
        x, z = math.cos(a) * 6.4, math.sin(a) * 6.4 + 0.4
        k.box('ring_casemate', (2.4, 2.6, 2.4), (x, yc + 1.4, z), M['TRIM'])
        k.cylinder('barrel', 0.36, 2.4, (x, yc + 3.6, z), M['TRIM'])
    k.box('drive_block', (4.8, 3.6, 3.0), (0, Y(0.9), 0.3), M['TRIM'])
    k.cylinder('nozzle', 1.35, 1.8, (0, Y(0.97), 0.3), M['TRIM'], r2=1.55)
    k.cylinder('nozzle_glow', 1.0, 0.2, (0, Y(0.97) - 0.9, 0.3), M['FIRE'])


VARIANTS = {'A_horizon_knife': knife, 'B_gravity_claw': claw, 'C_event_ring': ring}
