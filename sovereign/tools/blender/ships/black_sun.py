"""Black Sun · Blackhole battleship (1 km, 5 hardpoints) · Blender hero hull, detail pass 2.

Pass 2 (hand-made depth): segmented faceted claws with talons and spines, a containment cage of
armoured hoops around the star, an armoured singularity ring, ribbed horizon blades, sub-panelled
armour with hardware, machinery in the gaps, conduit runs, stepped barbettes, drive cowls,
windows only on the inner hull and superstructure.

Codex: "Battleships become dark claws around an artificial star."
Chosen direction (docs/concepts/black_sun_v1.png): the Talon body (the Gravity Fang grown to a
kilometre: knife spine, broad horizon blades, the dorsal ring around a singularity) with the Claw
Crown's four great claws closing around a burning artificial star held at the bow. The star is the
brightest thing on the battlefield.

Built in real metres. Scale cues: 2 m windows in deck runs, running lights every 25 m, 6 m RCS
quads, a 90 m launch bay, 40 m sensor towers, radiator galleries.
The game mounts its own articulated turrets on the NODE_ markers, so the hull carries barbettes only.
"""
import math

from mathutils import Matrix

META = {'name': 'black_sun_hero.glb', 'hull': 'blackhole_battleship', 'tile': 30.0, 'bake_size': 2048}
L = 1000.0
Y0 = L / 2
S = L / 75.0          # concept units → metres


def ss(a, b, x):
    t = min(1, max(0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def bump(c, w, x):
    return math.exp(-((x - c) / w) ** 2)


def prow(t, length=0.06):
    return min(1.0, t / length) ** 0.5


def Y(t):
    return Y0 - t * L


SPINE_LEN = L * 0.85
SPINE_Y0 = Y(0.15)


def spine(t):
    p = prow(t, 0.06)
    w = (2.2 + 5.0 * ss(0.05, 0.45, t) * (1 + 0.2 * bump(0.6, 0.15, t))) * p * S
    top = (1.8 + 5.0 * ss(0.05, 0.5, t)) * p * S
    bot = (1.8 + 4.0 * ss(0.05, 0.55, t)) * p * S
    return w, top, bot, 3.3, 0.0


def st(t):
    """Ship t (0 bow … 1 stern) → spine loft t."""
    return (t - 0.15) / 0.85


def fang(k, name, a, b, r, mat, sides=4):
    """A faceted fang from base point a to tip b."""
    import bmesh
    from mathutils import Vector
    a, b = Vector(a), Vector(b)
    d = (b - a).normalized()
    x = d.cross(Vector((0, 0, 1)) if abs(d.z) < 0.9 else Vector((1, 0, 0))).normalized()
    y = d.cross(x)
    bm = bmesh.new()
    ang = [i / sides * math.tau + math.pi / sides for i in range(sides)]
    base = [bm.verts.new(a + (x * math.cos(t) + y * math.sin(t)) * r) for t in ang]
    mid = [bm.verts.new(a.lerp(b, 0.35) + (x * math.cos(t) + y * math.sin(t)) * r * 0.7) for t in ang]
    tip = bm.verts.new(b)
    bm.faces.new(list(reversed(base)))
    for i in range(sides):
        j = (i + 1) % sides
        bm.faces.new((base[i], base[j], mid[j], mid[i]))
        bm.faces.new((mid[i], mid[j], tip))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return k.obj_from_bmesh(name, bm, mat)


def build(k):
    M = k.palette()
    M['CORE'] = k.material('CORE', (0.0, 0.0, 0.0), 1.0, 0.05)
    M['STAR'] = k.material('STAR', (1.0, 0.85, 0.6), 0.0, 0.5, emit=(1.0, 0.82, 0.5))
    M['FIRE'] = M['GLOW']

    # ---- 1. silhouette ---------------------------------------------------------------------------
    hull = k.loft('spine', SPINE_LEN, spine, rings=40, segs=34, mat=M['HULL'], y0=SPINE_Y0)
    k.panelize(hull, 40, 34, skip_row=3, skip_col=4, depth=1.2, thickness=1.4, keep=lambda i, j: 3 <= i <= 37)
    k.bevel(hull, 1.0, 1, 30)
    k.weighted_normals(hull)
    k.smooth(hull)
    k.wedge('keel', (3.0 * S, 40.0 * S, 2.4 * S), (0, Y(0.58), -5.6 * S), M['TRIM'], slope=-0.25)

    # The artificial star at the bow, wrapped in coronas.
    sy, sz, sr = Y(0.05), 0.8 * S, 5.4 * S
    k.sphere('star', sr, (0, sy, sz), M['STAR'], 64)
    k.torus('corona', sr * 1.12, 0.06 * S, (0, sy, sz), M['GLOW'], rot=(math.pi / 2, 0, 0), segs=96, rsegs=6)
    # Containment cage: three armoured hoops at different tilts hold the star in place.
    for i, (tilt, twist) in enumerate(((0.0, 0.0), (1.05, 0.5), (-1.05, -0.5))):
        k.armour_ring('cage', sr * 1.32, 0.35 * S, 0.9 * S, (0, sy, sz), M, rot=(math.pi / 2 + tilt, twist, 0), blocks=14, gap=0.22, glow=i == 0)
    # Four great claws from the shoulders, closing around the star.
    for a in (0.8, math.pi - 0.8, math.pi + 0.8, -0.8):
        d = (math.cos(a), math.sin(a))
        pts, radii = [], []
        for i in range(11):
            u = i / 10
            spread = 9.0 * math.sin(u * 2.2) * (1 - 0.15 * u) + 5.0 - 3.8 * u ** 2
            pts.append((d[0] * spread * S, Y(0.36) + u * 26.0 * S, (d[1] * spread + 0.8) * S))
            radii.append((2.4 * (1 - 0.6 * u) + 0.4) * S)
        # Hard-faceted cross-section: armour, not a soft tube.
        out = (d[0], 0, d[1])
        claw, C = k.limb('claw', pts, radii, M['TRIM'], core_mat=M['HULL'], sides=8, squash=0.82, plates=13, up=out, flare=1.1, tip=3.2, overlap=0.3)
        k.tube('claw_fire', [(p[0] - d[0] * r * 0.85, p[1], p[2] - d[1] * r * 0.85) for p, r in zip(pts[1:-2], radii[1:-2])], [0.16 * S] * 8, M['GLOW'], ends=('round', 'round'), res=3)
        # Spines on the outer ridge, talons on the inner edge.
        for j in range(8):
            pp, rr, (t, sd, upv) = C.at(0.1 + j * 0.1)
            b_ = pp + upv * rr * 0.75
            fang(k, 'claw_spine', tuple(b_), tuple(b_ + upv * (1.0 + 0.6 * (j % 2)) * S - t * 0.8 * S), 0.32 * S, M['HULL'], sides=3)
        for j in range(5):
            pp, rr, (t, sd, upv) = C.at(0.4 + j * 0.11)
            b_ = pp - upv * rr * 0.7
            fang(k, 'claw_talon', tuple(b_), tuple(b_ - upv * 1.6 * S + t * 0.7 * S), 0.4 * S, M['GOLD'] if j == 2 else M['TRIM'])
        k.wedge('claw_root', (5.0 * S, 7.0 * S, 4.5 * S), (d[0] * 4.6 * S, Y(0.36) - 1.0 * S, (d[1] * 4.2 + 0.8) * S), M['HULL'], slope=0.3, rot=(0, -a + math.pi / 2, 0))

    for s in (-1, 1):
        blade = [(0, 0), (s * 13.0 * S, -8.0 * S), (s * 14.5 * S, 4.0 * S), (s * 9.5 * S, 8.0 * S), (s * 4.0 * S, 5.0 * S)]
        k.plate('horizon_blade', blade, 1.8 * S, M['TRIM'], loc=(0, Y(0.62), 0.3 * S), bevel_w=1.2)
        k.plate('blade_armour', [(s * 4.4 * S, 4.0 * S), (s * 9.0 * S, 6.6 * S), (s * 12.6 * S, 3.4 * S), (s * 11.8 * S, -5.6 * S), (s * 4.4 * S, 0.6 * S)], 0.8 * S, M['HULL'], loc=(0, Y(0.62), 1.4 * S), bevel_w=0.8)
        k.tube('blade_fire', [(s * 4.2 * S, Y(0.62) + 5.05 * S, 1.1 * S), (s * 9.5 * S, Y(0.62) + 8.05 * S, 1.1 * S), (s * 14.5 * S, Y(0.62) + 4.05 * S, 1.1 * S)], [0.16 * S] * 3, M['GLOW'], ends=('round', 'round'))
        k.light_strip('blade_lights', (s * 5.0 * S, Y(0.62) + 4.0 * S, 2.5 * S), (s * 12.5 * S, Y(0.62) + 1.0 * S, 2.5 * S), 25, 1.2, M['GLOW'])
        # Ribs under the blade and a sensor pod at its tip.
        for ry, x0, x1 in ((3.0, 4.0, 10.0), (-1.0, 4.0, 13.0), (-5.0, 4.0, 12.5)):
            k.box('blade_rib', ((x1 - x0) * S, 0.6 * S, 0.9 * S), (s * (x0 + x1) / 2 * S, Y(0.62) + ry * S, -0.6 * S), M['TRIM'])
        k.cylinder('blade_pod', 1.0 * S, 5.0 * S, (s * 14.2 * S, Y(0.62) + 1.0 * S, 0.6 * S), M['TRIM'], segs=8, rot=(-math.pi / 2, 0, 0), r2=0.6 * S)
        k.cylinder('blade_pod_eye', 0.55 * S, 0.25 * S, (s * 14.2 * S, Y(0.62) + 3.6 * S, 0.6 * S), M['GLOW'], segs=8, rot=(-math.pi / 2, 0, 0))

    # The dorsal ring around the singularity, behind the blades.
    ry, rz = Y(0.68), 8.6 * S
    k.cylinder('core_collar', 2.6 * S, 3.0 * S, (0, ry, 6.6 * S), M['TRIM'], segs=48, rot=(0, 0, 0), r2=2.0 * S)
    k.sphere('singularity', 2.6 * S, (0, ry, rz), M['CORE'], 48)
    k.armour_ring('event_ring', 6.0 * S, 0.9 * S, 2.0 * S, (0, ry, rz), M, rot=(math.pi / 2 - 0.3, 0, 0), blocks=20, gap=0.14)

    k.wedge('drive_block', (12.0 * S, 8.0 * S, 8.5 * S), (0, Y(0.95), 0.6 * S), M['TRIM'], slope=-0.2, back=0.35)

    # ---- 2. secondary ----------------------------------------------------------------------------
    for i, (t0, t1) in enumerate(((0.2, 0.28), (0.27, 0.35), (0.4, 0.48), (0.47, 0.55), (0.74, 0.82), (0.81, 0.89))):
        mat = M['TRIM'] if i % 2 else M['HULL']
        k.shell_patch('dorsal_%d' % i, spine, SPINE_LEN, SPINE_Y0, st(t0), st(t1), 0.5, math.pi - 0.5, mat, scale=1.02, flare=0.03, thickness=2.2, segs=18, rings=10, panels=0.55, seed=51 + i)
        lip = k.edge_curve(spine, SPINE_LEN, SPINE_Y0, st(t1), 0.5, math.pi - 0.5, scale=1.02 * 1.03 + 0.005)
        k.tube('dorsal_lip_%d' % i, lip, [0.8] * len(lip), M['GOLD'], bevel_res=1, ends=('round', 'round'), res=2)
    for i in range(6):
        t0 = 0.2 + i * 0.12
        for s, (a0, a1) in ((1, (-0.45, 0.3)), (-1, (math.pi - 0.3, math.pi + 0.45))):
            k.shell_patch('flank_%d' % i, spine, SPINE_LEN, SPINE_Y0, st(t0), st(t0 + 0.09), a0, a1, M['TRIM'], scale=1.03, flare=0.05, thickness=2.0, segs=10, rings=11, panels=0.6, seed=71 + i * 2 + (s > 0))

    # Barbettes for the five heavy batteries.
    def barbette(bank, x, y, z, r):
        k.cylinder('barbette', r * 1.15, 0.9 * S, (x, y, z - 0.3 * S), M['HULL'], segs=8, rot=(0, 0, 0), r2=r * 1.03)
        k.cylinder('barbette_step', r * 0.92, 0.5 * S, (x, y, z + 0.2 * S), M['TRIM'], segs=16, rot=(0, 0, 0))
        k.torus('barbette_race', r * 0.94, 0.08 * S, (x, y, z + 0.46 * S), M['GOLD'], segs=48, rsegs=6)
        k.empty('NODE_WPN_' + bank, (x, y, z + 0.5 * S))
    for s, bank, t in ((-1, 'FL', 0.43), (1, 'FR', 0.43), (-1, 'ML', 0.56), (1, 'MR', 0.56)):
        w, top, bot, n, zo = spine(st(t))
        barbette(bank, s * w * 0.55, Y(t), top * 0.92, 2.2 * S)
    w, top, bot, n, zo = spine(st(0.8))
    barbette('AL', 0, Y(0.8), top * 0.97, 2.6 * S)

    # ---- 3. detail (real metres) -----------------------------------------------------------------
    for s in (-1, 1):
        for a_, b_ in ((0.2, 0.33), (0.4, 0.54), (0.7, 0.9)):
            pts = []
            for t in (a_, (a_ + b_) / 2, b_):
                w, top, bot, n, zo = spine(st(t))
                pts.append((s * w * 1.02, Y(t), 0.12 * top))
            k.tube('flank_fire', pts, [1.0] * 3, M['GLOW'], bevel_res=1, ends=('round', 'round'), res=4)
        # Radiator galleries along the drive section.
        fin = k.box('radiator', (2.0, 5.0, 6.5 * S), (s * 6.1 * S, Y(0.88), 0.8 * S), M['TRIM'])
        k.array(fin, 18, (0, -9.0, 0))
        k.box('radiator_frame', (3.0, 165.0, 4.0), (s * 6.1 * S, Y(0.88) - 76.0, 0.8 * S + 3.4 * S), M['GOLD'])
        # RCS quads (6 m).
        for t in (0.22, 0.5, 0.86):
            w, top, bot, n, zo = spine(st(t))
            k.box('rcs', (6.0, 6.0, 6.0), (s * (w + 2.0), Y(t), 0.0), M['TRIM'])
            for dz in (-1.6, 1.6):
                k.cylinder('rcs_nozzle', 0.9, 2.0, (s * (w + 5.2), Y(t), dz), M['CORE'], segs=12, rot=(0, math.pi / 2, 0))
        # Hatches and access panels (8 m).
        for t in (0.25, 0.38, 0.5, 0.64, 0.78):
            w, top, bot, n, zo = spine(st(t))
            k.box('hatch', (1.0, 8.0, 6.0), (s * w * 1.0, Y(t), -0.3 * bot), M['GOLD'] if t == 0.5 else M['HULL'])
        # Running lights along the dorsal shoulders every 25 m, sensor towers 40 m tall.
        a = spine(st(0.2)); b = spine(st(0.9))
        k.light_strip('dorsal_lights', (s * a[0] * 0.5, Y(0.2), a[1] * 0.92), (s * b[0] * 0.5, Y(0.9), b[1] * 0.92), 25, 1.4, M['GLOW'])
        w, top, bot, n, zo = spine(st(0.3))
        k.sensor_mast('tower', (s * 8.0, Y(0.3), top * 0.95), 40.0 if s > 0 else 28.0, M['TRIM'], M['GLOW'], dish=9.0 if s > 0 else 0)

    # Hardware riding on the flank armour, machinery in the gaps, conduits along the shoulders.
    k.machinery('plate_kit', spine, SPINE_LEN, SPINE_Y0, st(0.2), st(0.9), -0.4, 0.25, M, count=70, h=2.2, seed=81, scale=1.03 * 1.05)
    k.machinery('plate_kit', spine, SPINE_LEN, SPINE_Y0, st(0.2), st(0.9), math.pi - 0.25, math.pi + 0.4, M, count=70, h=2.2, seed=82, scale=1.03 * 1.05)
    k.machinery('mach_dorsal', spine, SPINE_LEN, SPINE_Y0, st(0.56), st(0.73), 0.55, math.pi - 0.55, M, count=90, h=6.0, seed=83)
    k.machinery('mach_neck', spine, SPINE_LEN, SPINE_Y0, st(0.35), st(0.4), 0.55, math.pi - 0.55, M, count=30, h=5.0, seed=84)
    k.machinery('mach_flank', spine, SPINE_LEN, SPINE_Y0, st(0.2), st(0.9), -0.95, -0.5, M, count=60, h=4.5, seed=85)
    k.machinery('mach_flank', spine, SPINE_LEN, SPINE_Y0, st(0.2), st(0.9), math.pi + 0.5, math.pi + 0.95, M, count=60, h=4.5, seed=86)
    k.machinery('mach_belly', spine, SPINE_LEN, SPINE_Y0, st(0.25), st(0.52), math.pi + 1.1, math.tau - 1.1, M, count=50, h=5.0, seed=87)
    for s in (-1, 1):
        a_ = 0.42 if s > 0 else math.pi - 0.42
        run = [k.surf(spine, SPINE_LEN, SPINE_Y0, st(t), a_, 1.075)[0] for t in (0.2, 0.32, 0.45, 0.58, 0.72, 0.88)]
        k.conduit('conduit', [tuple(p) for p in run], 1.6, M['TRIM'], clamps=10, clamp_mat=M['GOLD'])
        run2 = [k.surf(spine, SPINE_LEN, SPINE_Y0, st(t), a_ - s * 0.1, 1.07)[0] for t in (0.22, 0.4, 0.56, 0.7, 0.86)]
        k.conduit('conduit', [tuple(p) for p in run2], 1.0, M['HULL'], clamps=6, clamp_mat=M['TRIM'])

    # Launch bay on the belly: a 90 m door in a lit frame.
    w, top, bot, n, zo = spine(st(0.62))
    k.box('bay_frame', (40.0, 100.0, 5.0), (0, Y(0.62), -bot * 0.97), M['TRIM'])
    k.box('bay_door', (34.0, 90.0, 2.0), (0, Y(0.62), -bot * 0.97 - 2.8), M['HULL'])
    for x in (-19.0, 19.0):
        k.light_strip('bay_lamps', (x, Y(0.62) + 46, -bot * 0.97 - 3.2), (x, Y(0.62) - 46, -bot * 0.97 - 3.2), 8, 0.9, M['GLOW'])
    k.vent_grille('reactor_vent', (0, Y(0.9), 4.6 * S), 4.4 * S, 5.4 * S, 11, M['TRIM'], M['HULL'], rot=(0.25, 0, 0))
    # Deck houses along the shoulders (crewed superstructure, 20-40 m) and a command bridge tower.
    for i, t in enumerate((0.24, 0.31, 0.47, 0.52, 0.86)):
        w, top, bot, n, zo = spine(st(t))
        for s in (-1, 1):
            hx = s * w * (0.72 if i % 2 else 0.8)
            k.wedge('deckhouse', (18.0, 34.0 + 6 * (i % 3), 12.0), (hx, Y(t), top * 0.62 + 6.0), M['HULL'], slope=0.35, back=0.2)
            k.box('deckhouse_roof', (12.0, 20.0, 3.0), (hx, Y(t) - 4.0, top * 0.62 + 13.0), M['TRIM'])
    w, top, bot, n, zo = spine(st(0.76))
    k.wedge('bridge_tower', (26.0, 60.0, 40.0), (0, Y(0.745), top * 0.96 + 18.0), M['HULL'], slope=0.45, back=0.25)
    k.wedge('bridge_deck', (40.0, 24.0, 10.0), (0, Y(0.735), top * 0.96 + 40.0), M['TRIM'], slope=0.6)
    k.box('bridge_glass', (34.0, 1.0, 3.0), (0, Y(0.735) + 11.6, top * 0.96 + 41.0), k.window_material())
    k.sensor_mast('bridge_mast', (0, Y(0.745), top * 0.96 + 45.0), 30.0, M['TRIM'], M['GLOW'], dish=6.0)

    # Drives: three deep bells and the markers the game lights.
    for x, z, name in ((-3.4, -0.2, 'PORT'), (0.0, 2.2, 'MAIN'), (3.4, -0.2, 'STARBOARD')):
        k.nozzle('nozzle', (x * S, Y(1.0) - 1.0 * S, z * S), 1.9 * S, 3.0 * S, M, glow='GLOW')
        k.cowl('cowl', (x * S, Y(1.0) - 0.6 * S, z * S), 1.9 * S, 3.4 * S, M)
        k.empty('ENGINE_' + name, (x * S, Y(1.0) - 2.6 * S, z * S), 1.9 * S)

    k.finish(skip=('core', 'singularity', 'star', 'spine', 'event_ring', 'cage', 'corona', 'NODE', 'ENGINE', 'windows', 'claw', 'mach', 'plate_kit', 'cowl'))
    n = k.deck_windows(('spine', 'deckhouse', 'bridge'), rows=(-0.2, -0.14, -0.08, -0.02, 0.04, 0.1, 0.16, 0.22, 0.3), step=2.6, size=(0.2, 1.3, 0.7))
    print('windows', n)


LOOKS = {
    'HULL': dict(base=(0.022, 0.027, 0.042), base2=(0.03, 0.036, 0.055), mottle_col=(0.018, 0.02, 0.03), grime=(0.006, 0.006, 0.008),
                 edge=(0.26, 0.24, 0.26), rough=0.34, metal=0.6, cells=0.08, panels=0.15, bump=0.35),
    'TRIM': dict(base=(0.011, 0.011, 0.014), base2=(0.016, 0.016, 0.02), mottle_col=(0.009, 0.009, 0.012), grime=(0.003, 0.003, 0.004),
                 edge=(0.2, 0.18, 0.17), rough=0.42, metal=0.75, cells=0.12, panels=0.2, bump=0.25),
    'GOLD': dict(base=(0.62, 0.3, 0.12), base2=(0.55, 0.26, 0.1), mottle_col=(0.48, 0.22, 0.08), grime=(0.2, 0.09, 0.03),
                 edge=(0.95, 0.62, 0.38), rough=0.26, metal=1.0, cells=0.25, panels=0.5, bump=0.08, ao_dist=1.5, cav_hi=0.6, cav_lo=0.2),
    'CORE': dict(base=(0.004, 0.004, 0.005), base2=(0.004, 0.004, 0.005), mottle_col=(0.004, 0.004, 0.005), grime=(0.002, 0.002, 0.002),
                 edge=(0.05, 0.05, 0.06), rough=0.06, metal=1.0, cells=0.05, panels=0.05, bump=0.0),
    'STAR': dict(emit=(1.0, 0.86, 0.55)),
    'GLOW': dict(emit=(1.0, 0.36, 0.06)),
    'WINDOW': dict(emit=(1.0, 0.7, 0.36)),
}
