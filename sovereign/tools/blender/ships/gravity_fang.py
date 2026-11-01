"""Gravity Fang · Blackhole frigate · Blender hero hull (concept A+C, detail pass 1).

Codex: Blackhole frigates are "horizon knives": black/navy edged in burning orange around a central
singularity. Art direction: squat hull around a central mass, accretion ring, orange fire seams, very
few windows, heavy squat casemates, deep recessed nozzles, no thin parts.
Chosen direction (docs/concepts/gravity_fang_v2.png): A's armoured knife with forward-swept horizon
blades, plus C's thick ring, here a segmented event ring tilted around the singularity.

Passes, big to small:
  1. silhouette: chisel-prowed spine, ventral keel, horizon blades, rear stubs, drive block, ring
  2. secondary: layered dorsal armour, stepped blade armour, ring segments and clamps, barbettes
  3. detail: panel seams, fire seams, radiators, vents, RCS quads, sensors, hatches, few windows,
     running lights
The game mounts its own articulated turrets on the NODE_ markers, so the hull carries barbettes only.
"""
import math

from mathutils import Euler, Matrix

META = {'name': 'gravity_fang_hero.glb', 'hull': 'blackhole_frigate', 'tile': 3.0, 'bake_size': 2048}
L = 30.0
Y0 = L / 2


def ss(a, b, x):
    t = min(1, max(0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def bump(c, w, x):
    return math.exp(-((x - c) / w) ** 2)


def prow(t, length=0.07):
    return min(1.0, t / length) ** 0.5


def spine(t):
    k_ = prow(t)
    w = (1.1 + 2.3 * ss(0.0, 0.35, t) * (1 + 0.25 * bump(0.6, 0.15, t))) * k_
    top = (0.8 + 2.4 * ss(0.0, 0.45, t)) * k_
    bot = (0.8 + 1.9 * ss(0.0, 0.5, t)) * k_
    return w, top, bot, 3.4, 0.0


def Y(t):
    return Y0 - t * L


def surf(t, side, up):
    """A point on the spine surface: side -1/1, up 0 (flank) .. 1 (top) .. -1 (bottom)."""
    w, top, bot, n, zo = spine(t)
    a = up * math.pi / 2
    c, s = math.cos(a), math.sin(a)
    x = w * abs(c) ** (2 / n)
    z = (top if s >= 0 else bot) * math.copysign(abs(s) ** (2 / n), s)
    return (side * x, Y(t), z + zo)


def tilted(ob, tilt, spin=0.0):
    ob.rotation_euler = (Matrix.Rotation(tilt[0], 4, 'X') @ Matrix.Rotation(tilt[2], 4, 'Z') @ Matrix.Rotation(spin, 4, 'Z')).to_euler()
    return ob


def build(k):
    M = k.palette()
    M['CORE'] = k.material('CORE', (0.0, 0.0, 0.0), 1.0, 0.05)
    M['FIRE'] = M['GLOW']
    WIN = k.window_material()

    # ---- 1. silhouette ---------------------------------------------------------------------------
    hull = k.loft('spine', L, spine, rings=30, segs=28, mat=M['HULL'], y0=Y0)
    k.panelize(hull, 30, 28, skip_row=3, skip_col=4, depth=0.07, thickness=0.08, keep=lambda i, j: 4 <= i <= 27)
    k.bevel(hull, 0.06, 1, 30)
    k.weighted_normals(hull)
    k.smooth(hull)
    k.wedge('keel', (2.2, 14.0, 1.6), (0, Y(0.55), -2.6), M['TRIM'], slope=-0.25)

    for s in (-1, 1):
        blade = [(0, 0), (s * 8.5, -4.5), (s * 9.5, 2.5), (s * 6.5, 5.0), (s * 2.5, 3.0)]
        k.plate('horizon_blade', blade, 1.0, M['TRIM'], loc=(0, Y(0.55), 0.2), bevel_w=0.18)
        stub = [(s * 2.4, 0), (s * 5.8, -1.0), (s * 5.8, -4.0), (s * 2.4, -5.2)]
        k.plate('stub', stub, 1.2, M['HULL'], loc=(0, Y(0.78), -0.1), bevel_w=0.15)

    k.wedge('drive_block', (5.4, 4.0, 3.6), (0, Y(0.93), 0.4), M['TRIM'], slope=-0.2, back=0.35)

    # The singularity, half sunk in a stepped notch, inside a segmented event ring.
    # The ring stands up around the singularity, leaning back, and sinks into the notch: the memorable
    # feature, readable from every angle.
    cy, cz = Y(0.5), 4.3
    k.wedge('notch_wall', (4.6, 1.4, 1.6), (0, Y(0.36), 2.4), M['TRIM'], slope=0.5)
    k.cylinder('core_collar', 1.3, 1.6, (0, cy, 3.3), M['TRIM'], segs=36, rot=(0, 0, 0), r2=1.0)
    k.torus('core_collar_race', 1.15, 0.09, (0, cy, 4.1), M['GOLD'], segs=40, rsegs=8)
    k.sphere('core', 1.55, (0, cy, cz), M['CORE'], 48)
    tilt = (math.pi / 2 - 0.35, 0, 0)
    for i in range(8):
        seg = k.torus('event_ring', 2.75, 0.48, (0, cy, cz), M['TRIM'], arc=math.tau / 8 * 0.84, segs=12, rsegs=14, taper=0.08)
        tilted(seg, tilt, i * math.tau / 8 + 0.2)
        clamp = k.torus('ring_clamp', 2.75, 0.6, (0, cy, cz), M['GOLD'], arc=math.tau / 8 * 0.06, segs=2, rsegs=14, taper=0)
        tilted(clamp, tilt, i * math.tau / 8 + 0.2 + math.tau / 8 * 0.89)
    tilted(k.torus('ring_fire', 2.24, 0.12, (0, cy, cz), M['GLOW'], segs=96, rsegs=8), tilt)
    for s in (-1, 1):
        k.wedge('ring_cradle', (1.0, 2.0, 2.4), (s * 2.1, cy - 0.3, 2.6), M['HULL'], slope=0.25, rot=(0, s * 0.45, 0))

    # ---- 2. secondary ----------------------------------------------------------------------------
    # Layered dorsal armour fore and aft of the ring; each plate lipped in burnished copper.
    for i, (t0, t1) in enumerate(((0.1, 0.19), (0.18, 0.27), (0.26, 0.35), (0.62, 0.7), (0.69, 0.77), (0.76, 0.84))):
        mat = M['TRIM'] if i % 2 else M['HULL']
        k.shell_patch('dorsal_%d' % i, spine, L, Y0, t0, t1, 0.45, math.pi - 0.45, mat, scale=1.022, flare=0.03, thickness=0.12, segs=12, rings=8)
        lip = k.edge_curve(spine, L, Y0, t1, 0.45, math.pi - 0.45, scale=1.022 * 1.03 + 0.02)
        k.tube('dorsal_lip_%d' % i, lip, [0.04] * len(lip), M['GOLD'], bevel_res=1, ends=('round', 'round'), res=2)
    # Flank armour belts, staggered.
    for i in range(4):
        t0 = 0.2 + i * 0.16
        for s, (a0, a1) in ((1, (-0.5, 0.3)), (-1, (math.pi - 0.3, math.pi + 0.5))):
            k.shell_patch('flank_%d' % i, spine, L, Y0, t0, t0 + 0.13, a0, a1, M['TRIM'], scale=1.035, flare=0.06, thickness=0.14, segs=8, rings=8)

    for s in (-1, 1):
        # Stepped armour on the blades, a fire seam along each leading edge, a lamp at the tip.
        k.plate('blade_armour', [(s * 2.6, 2.2), (s * 6.2, 4.0), (s * 8.4, 2.0), (s * 7.6, -3.4), (s * 2.6, 0.4)], 0.5, M['HULL'], loc=(0, Y(0.55), 1.0), bevel_w=0.12)
        k.plate('blade_armour2', [(s * 3.4, 1.8), (s * 5.8, 3.0), (s * 6.8, 1.4), (s * 3.4, 0.8)], 0.35, M['TRIM'], loc=(0, Y(0.55), 1.4), bevel_w=0.08)
        k.tube('blade_fire', [(s * 2.6, Y(0.55) + 3.06, 0.72), (s * 6.5, Y(0.55) + 5.06, 0.72), (s * 9.5, Y(0.55) + 2.56, 0.72)], [0.11] * 3, M['GLOW'], ends=('round', 'round'))
        k.tube('blade_edge', [(s * 2.6, Y(0.55) + 3.1, 0.2), (s * 6.5, Y(0.55) + 5.1, 0.2), (s * 9.55, Y(0.55) + 2.6, 0.2)], [0.32, 0.36, 0.24], M['TRIM'], ends=('round', 'round'))
        # Barbettes on the stubs: the game seats its turrets here.
        bx, by = s * 4.1, Y(0.86)
        k.cylinder('barbette', 1.25, 0.5, (bx, by, 0.75), M['TRIM'], segs=36, rot=(0, 0, 0))
        k.torus('barbette_race', 1.25, 0.08, (bx, by, 1.02), M['GOLD'], segs=40, rsegs=8)
        k.empty('NODE_WPN_' + ('FL' if s < 0 else 'FR'), (bx, by, 1.1))

    # ---- 3. detail -------------------------------------------------------------------------------
    for s in (-1, 1):
        # Fire seams running the length of the flanks, broken where plates overlap.
        for a, b in ((0.12, 0.3), (0.34, 0.46), (0.56, 0.74), (0.78, 0.9)):
            pts = [surf(t, s, 0.18) for t in (a, (a + b) / 2, b)]
            pts = [(p[0] * 1.06, p[1], p[2]) for p in pts]
            k.tube('flank_fire', pts, [0.06] * 3, M['GLOW'], bevel_res=1, ends=('round', 'round'), res=4)
        # Radiator fins on the drive block flanks.
        fin = k.box('radiator', (0.14, 0.32, 2.4), (s * 2.86, Y(0.86), 0.5), M['TRIM'])
        k.array(fin, 7, (0, -0.55, 0))
        k.box('radiator_frame', (0.25, 4.2, 0.3), (s * 2.86, Y(0.86) - 1.6, 1.75), M['GOLD'])
        # RCS quads at the prow shoulders and stub tips.
        for p in (surf(0.14, s, 0.0), (s * 5.9, Y(0.78) - 2.5, -0.1)):
            q = k.box('rcs', (0.55, 0.55, 0.55), (p[0] + s * 0.15, p[1], p[2]), M['TRIM'])
            for dz in (-0.16, 0.16):
                k.cylinder('rcs_nozzle', 0.09, 0.2, (p[0] + s * 0.5, p[1], p[2] + dz), M['CORE'], segs=10, rot=(0, math.pi / 2, 0))
        # Hatches and access panels along the flanks.
        for t in (0.24, 0.4, 0.66):
            p = surf(t, s, -0.3)
            k.box('hatch', (0.12, 0.9, 0.6), (p[0] * 1.02, p[1], p[2]), M['GOLD'] if t == 0.4 else M['HULL'])
        # Very few windows: a short bridge slit each side, ahead of the notch.
        pts = [surf(t, s, 0.42) for t in (0.3, 0.315, 0.33)]
        k.windows('window', [(p[0] * 1.01, p[1], p[2]) for p in pts], (0.08, 0.28, 0.12), WIN)

    # Sensor prow: a dark glass eye in a copper bezel, two masts, an antenna spine.
    p = surf(0.07, 1, 0.6)
    k.sphere('sensor_eye', 0.42, (0, p[1], p[2] + 0.05), M['CORE'], 24)
    k.torus('sensor_bezel', 0.46, 0.07, (0, p[1], p[2] + 0.05), M['GOLD'], rot=(math.radians(-70), 0, 0), segs=32, rsegs=8)
    for s in (-1, 1):
        b = surf(0.22, s * 0.35, 0.95)
        k.sensor_mast('mast', (s * 0.55, b[1], b[2] - 0.05), 1.3 if s > 0 else 0.9, M['TRIM'], M['GLOW'], dish=0.22 if s > 0 else 0)
    k.tube('antenna_spine', [(0, Y(0.64), 3.3), (0, Y(0.72), 3.55), (0, Y(0.8), 3.35)], [0.14, 0.11, 0.06], M['TRIM'], ends=('round', 'round'))
    # Reactor vent over the drive block, keel fire seam.
    k.vent_grille('reactor_vent', (0, Y(0.9), 2.2), 2.4, 2.6, 7, M['TRIM'], M['HULL'], rot=(0.25, 0, 0))
    k.tube('keel_fire', [(0, Y(0.4), -3.42), (0, Y(0.55), -3.42), (0, Y(0.7), -3.3)], [0.07] * 3, M['GLOW'], ends=('round', 'round'))

    # Drives: two deep bells and the markers the game lights.
    for s in (-1, 1):
        k.nozzle('nozzle', (s * 1.35, Y(1.0) - 0.3, 0.4), 1.05, 1.8, M, glow='GLOW')
        k.empty('ENGINE_' + ('PORT' if s < 0 else 'STARBOARD'), (s * 1.35, Y(1.0) - 1.3, 0.4), 1.0)

    k.finish(skip=('core', 'sensor_eye', 'spine', 'event_ring', 'ring_fire', 'NODE', 'ENGINE'))


# Baked texture looks: Blackhole navy-black armour, black trim, burnished copper, burning orange.
LOOKS = {
    'HULL': dict(base=(0.022, 0.027, 0.042), base2=(0.03, 0.036, 0.055), mottle_col=(0.018, 0.02, 0.03), grime=(0.006, 0.006, 0.008),
                 edge=(0.26, 0.24, 0.26), rough=0.34, metal=0.6, cells=1.3, panels=2.6, bump=0.35),
    'TRIM': dict(base=(0.011, 0.011, 0.014), base2=(0.016, 0.016, 0.02), mottle_col=(0.009, 0.009, 0.012), grime=(0.003, 0.003, 0.004),
                 edge=(0.2, 0.18, 0.17), rough=0.42, metal=0.75, cells=2.0, panels=3.6, bump=0.25),
    'GOLD': dict(base=(0.62, 0.3, 0.12), base2=(0.55, 0.26, 0.1), mottle_col=(0.48, 0.22, 0.08), grime=(0.2, 0.09, 0.03),
                 edge=(0.95, 0.62, 0.38), rough=0.26, metal=1.0, cells=4.0, panels=8.0, bump=0.08, ao_dist=0.08, cav_hi=0.6, cav_lo=0.2),
    'CORE': dict(base=(0.004, 0.004, 0.005), base2=(0.004, 0.004, 0.005), mottle_col=(0.004, 0.004, 0.005), grime=(0.002, 0.002, 0.002),
                 edge=(0.05, 0.05, 0.06), rough=0.06, metal=1.0, cells=1.0, panels=1.0, bump=0.0),
    'GLOW': dict(emit=(1.0, 0.36, 0.06)),
    'WINDOW': dict(emit=(1.0, 0.7, 0.36)),
}
