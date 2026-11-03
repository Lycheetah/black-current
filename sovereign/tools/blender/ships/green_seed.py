"""Green Seed · Savanah Starter Frigate · Blender hero hull (pass 3: hard-surface detail).

Codex: black predatory armour folds like layered chitin; gold filigree like vascular structure;
emerald nodes everywhere; at the centre the great eye; hooked silhouettes, predatory bows.

Passes, big to small:
  1. silhouette: hunched predatory body with a dorsal spine ridge, pinched waist, pincer mandibles
     reaching past the bow, outboard drive pods
  2. layered chitin plates that wrap the hull and overlap, gold lips following each plate edge,
     hooked fins, keel blade
  3. detail: veins, seams, vents, distributed eyes, running lights, drive collars and nozzles
"""
import math

META = {'name': 'green_seed_hero.glb', 'hull': 'savanah_starter', 'tile': 3.0}
L = 34.0
Y0 = L / 2


def ss(a, b, x):
    t = min(1, max(0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def bump(c, w, x):
    return math.exp(-((x - c) / w) ** 2)


def body(t):
    """Hull section at t (0 nose → 1 tail): (half-width, top, bottom, superellipse n, z offset)."""
    w = 3.2 * ss(0.0, 0.3, t) ** 0.7 * (1 - 0.3 * bump(0.62, 0.09, t)) * (1 + 0.12 * bump(0.86, 0.07, t)) + 0.12
    top = 1.35 * ss(0.0, 0.36, t) ** 0.8 * (1 + 0.7 * bump(0.36, 0.13, t)) + 0.1
    bot = 1.5 * ss(0.0, 0.45, t) ** 0.85 * (1 - 0.3 * ss(0.8, 1.0, t)) + 0.1
    return w, top, bot, 2.4, -0.35 * (1 - ss(0, 0.4, t))


def build(k):
    M = k.palette()
    Y = lambda t: Y0 - t * L  # noqa: E731

    hull = k.loft('body', L, body, rings=26, segs=24, mat=M['HULL'], y0=Y0)
    # Recessed armour panels with crisp seams, skipping the nose taper and the drive end.
    k.panelize(hull, 26, 24, skip_row=3, skip_col=6, depth=0.06, thickness=0.07, keep=lambda i, j: 4 <= i <= 23)
    k.subsurf(hull, 1)
    k.weighted_normals(hull)
    k.smooth(hull)

    # Dorsal spine ridge running from the eye to the drive.
    ridge = [(0, Y(t), body(t)[4] + body(t)[1] * 1.02 + 0.15 * bump(0.4, 0.2, t)) for t in [0.32, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]]
    k.tube('spine_ridge', ridge, [0.22, 0.3, 0.32, 0.26, 0.22, 0.18, 0.08], M['TRIM'])

    # Keel blade under the shoulders.
    k.plate('keel_blade', [(0, 9), (0, -8), (-2.4, -6), (-2.0, 4)], 0.3, M['TRIM'], loc=(0.15, Y(0.45) + 0.5, -1.25), rot=(0, math.pi / 2, 0))

    # Layered chitin: wrapped dorsal plates, each overlapping the next, gold lip along the trailing edge.
    for i in range(6):
        t0 = 0.3 + i * 0.085
        t1 = t0 + 0.11
        mat = M['HULL'] if i % 2 else M['TRIM']
        k.shell_patch('chitin_%d' % i, body, L, Y0, t0, t1, 0.35, math.pi - 0.35, mat, scale=1.05, flare=0.12, thickness=0.16, segs=16, rings=10, panels=0.5, seed=3100 + i)
        lip = k.edge_curve(body, L, Y0, t1, 0.35, math.pi - 0.35, scale=1.05 * 1.12 + 0.02)
        k.tube('chitin_lip_%d' % i, lip, [0.035] * len(lip), M['GOLD'], bevel_res=2)
    # Flank plates lower down, staggered against the dorsal ones.
    for i in range(4):
        t0 = 0.34 + i * 0.12
        for s, (a0, a1) in ((1, (-0.55, 0.25)), (-1, (math.pi - 0.25, math.pi + 0.55))):
            k.shell_patch('flank_%d' % i, body, L, Y0, t0, t0 + 0.1, a0, a1, M['TRIM'], scale=1.04, flare=0.1, thickness=0.14, segs=10, rings=10, panels=0.6, seed=3110 + i * 2 + (s > 0))

    # Pincer mandibles reaching past the bow, with a smaller lower pair, gold teeth and tip eyes.
    for s in (-1, 1):
        for lower, (r0, zbase, reach, spread) in enumerate(((0.95, -0.2, 13.5, 2.9), (0.55, -1.3, 9.5, 2.2))):
            pts, radii = [], []
            for i in range(10):
                u = i / 9
                pts.append((s * (spread - (spread - 0.55) * u ** 1.5), Y(0.22) + u * reach, zbase + math.sin(u * 2.4) * (1.1 - lower * 0.6)))
                radii.append(r0 * (1 - 0.9 * u))
            k.limb('mandible', pts, [max(0.08, r) for r in radii], M['HULL'] if not lower else M['TRIM'], core_mat=M['TRIM'], sides=6, squash=0.75, plates=8 if not lower else 6, up=(0, 0, 1), flare=1.12, tip=2.4)
            k.sphere('mandible_eye', 0.22 - lower * 0.08, (pts[-2][0] - s * 0.05, pts[-2][1], pts[-2][2] + 0.25), M['GLOW'], 12)
            if not lower:
                for j in range(4):
                    p = pts[2 + j * 2]
                    k.box('tooth', (0.14, 0.4, 0.14), (p[0] - s * radii[2 + j * 2], p[1], p[2] - 0.1), M['GOLD'], rot=(0, 0, s * 0.7))
    k.tube('prow_spike', [(0, Y(0.08), 0.3), (0, Y(0.0), 0.45), (0, Y(0.0) + 5.0, 0.25)], [0.65, 0.42, 0.03], M['TRIM'])

    # The great eye: an emerald orb half sunk into the hull in a gold socket with six spurs.
    ey = Y(0.3)
    ez = body(0.3)[4] + body(0.3)[1] * 1.05
    k.sphere('great_eye', 0.95, (0, ey, ez), M['GLOW'], 32)
    k.torus('eye_socket', 1.12, 0.2, (0, ey, ez), M['GOLD'], rot=(math.radians(-12), 0, 0))
    for i in range(6):
        a = i / 6 * math.tau
        k.tube('eye_spur', [(math.cos(a) * 1.15, ey + math.sin(a) * 1.15, ez), (math.cos(a) * 1.9, ey + math.sin(a) * 1.9, ez + 0.35)], [0.11, 0.015], M['GOLD'])

    # Hooked fins off the waist, eyes parented to their tips.
    for s in (-1, 1):
        outline = [(0, 0), (5.2, -3.0), (7.0, -4.6), (5.6, -6.6), (4.6, -4.4), (0, -5.0)]
        w = body(0.58)[0]
        fin = k.plate('hook_fin', [(x * s, y) for x, y in outline], 0.18, M['TRIM'], loc=(s * (w - 0.3), Y(0.56), -0.1), rot=(0, s * math.radians(-10), 0), bevel_w=0.05)
        k.parent(k.sphere('fin_eye', 0.18, (s * 7.0, -4.6, 0.12), M['GLOW'], 10), fin)
        k.parent(k.tube('fin_vein', [(s * 0.3, -0.5, 0.14), (s * 5.0, -3.1, 0.14), (s * 6.7, -4.5, 0.14)], [0.05, 0.04, 0.01], M['GOLD'], bevel_res=2), fin)

    # Drive section: outboard pods on swept pylons, a central drive, gold collars, recessed nozzles.
    for s in (-1, 1):
        def pod(t):
            r = 1.0 * ss(0, 0.35, t) ** 0.6 * (1 - 0.12 * ss(0.85, 1, t)) + 0.05
            return r, r, r, 2.2, 0
        px = s * (body(0.8)[0] + 1.5)
        p = k.loft('drive_pod', 9.5, pod, rings=10, segs=16, mat=M['HULL'], y0=Y(0.63))
        k.subsurf(p, 2)
        k.smooth(p)
        p.location = (px, 0, -0.35)
        k.plate('pylon', [(0, 1.5), (0, -2.2), (s * 1.9, -3.0), (s * 1.9, 0.6)], 0.32, M['TRIM'], loc=(s * (body(0.78)[0] - 0.4), Y(0.72), -0.45))
        k.torus('drive_collar', 1.0, 0.13, (px, Y(0.63) - 9.0, -0.35), M['GOLD'], rot=(math.pi / 2, 0, 0))
        k.cylinder('nozzle', 0.8, 0.7, (px, Y(0.63) - 9.45, -0.35), M['TRIM'], r2=0.98)
        k.empty('ENGINE_' + ('PORT' if s < 0 else 'STARBOARD'), (px, Y(0.63) - 9.85, -0.35), 0.85)
    k.cylinder('main_nozzle', 0.95, 0.8, (0, Y(1.0) - 0.3, -0.1), M['TRIM'], r2=1.15)
    k.cowl('cowl', (0, Y(1.0) - 0.2, -0.1), 0.95, 1.2, M)
    k.empty('ENGINE_MAIN', (0, Y(1.0) - 0.75, -0.1), 0.95)

    # Detail: gold veins wandering along the flanks, a lower seam, vents, distributed eyes.
    for s in (-1, 1):
        for b in range(2):
            pts = []
            for i in range(11):
                t = 0.26 + i * 0.055
                w, top, bot, n, zo = body(t)
                a = (0.1 + 0.12 * b + 0.05 * math.sin(i * 0.9 + b)) * (1 if s > 0 else -1)
                x = w * 1.01 * math.cos(a) * s
                pts.append((x if s > 0 else -abs(x), Y(t), zo + top * 1.01 * math.sin(abs(a)) - 0.1 * b))
            k.tube('vein', pts, [0.045] * len(pts), M['GOLD'], bevel_res=2)
        seam = [(s * body(t)[0] * 1.005, Y(t), body(t)[4] - body(t)[2] * 0.35) for t in [0.3, 0.4, 0.5, 0.6, 0.7, 0.8]]
        k.tube('seam', seam, [0.05] * len(seam), M['TRIM'], bevel_res=2)
        for i in range(6):
            t = 0.28 + i * 0.08
            w, top, bot, n, zo = body(t)
            k.sphere('flank_eye', 0.19, (s * w * 1.0, Y(t), zo + 0.15), M['GLOW'], 12)
        vent = k.box('vent', (0.1, 0.55, 0.14), (s * body(0.74)[0] * 0.95, Y(0.71), 0.45), M['TRIM'])
        k.array(vent, 6, (0, -0.4, 0))

    # Purposeful detail: conduits to the drives, vent grilles over the reactor, sensor masts by the eye,
    # and a short row of warm crew windows low on the flanks (scale cue: a crewed, living ship).
    WIN = k.window_material()
    for s in (-1, 1):
        run = [(s * body(t)[0] * 0.78, Y(t), body(t)[4] - body(t)[2] * 0.62) for t in (0.5, 0.58, 0.66, 0.74, 0.82, 0.9)]
        k.conduit('conduit', run, 0.12, M['TRIM'], clamps=3, clamp_mat=M['GOLD'])
        k.vent_grille('reactor_vent', (s * 1.15, Y(0.76), body(0.76)[4] + body(0.76)[1] * 0.98), 0.7, 2.2, 6, M['TRIM'], M['HULL'], rot=(0, s * 0.35, 0))
        k.sensor_mast('mast', (s * 0.9, Y(0.27), body(0.27)[4] + body(0.27)[1] * 0.9), 1.6, M['TRIM'], M['GLOW'], dish=0.25 if s > 0 else 0)
        pts = [(s * body(t)[0] * 0.985, Y(t), body(t)[4] - body(t)[2] * 0.12) for t in (0.44, 0.47, 0.5, 0.53, 0.56)]
        k.windows('window', pts, (0.06, 0.32, 0.12), WIN)

    # Pass 3: machinery in the gaps, hardware on the plates, conduits, windows.
    for s, (a0, a1) in ((1, (-1.0, -0.6)), (-1, (math.pi + 0.6, math.pi + 1.0))):
        k.machinery('mach_flank', body, L, Y0, 0.3, 0.86, a0, a1, M, count=24, h=0.3, seed=3120 + (s > 0))
        k.machinery('plate_kit', body, L, Y0, 0.34, 0.8, -0.5 if s > 0 else math.pi - 0.2, 0.2 if s > 0 else math.pi + 0.5, M, count=18, h=0.1, seed=3122 + (s > 0), scale=1.04 * 1.1)
    k.machinery('mach_belly', body, L, Y0, 0.3, 0.85, math.pi + 1.1, math.tau - 1.1, M, count=22, h=0.3, seed=3124)
    for s in (-1, 1):
        a_ = 0.3 if s > 0 else math.pi - 0.3
        run = [k.surf(body, L, Y0, t, a_, 1.12)[0] for t in (0.3, 0.45, 0.6, 0.75, 0.86)]
        k.conduit('conduit', [tuple(p) for p in run], 0.06, M['TRIM'], clamps=5, clamp_mat=M['GOLD'])
    # Hardpoint nodes on the forward shoulders, just aft of the eye.
    for name, s in (('NODE_WPN_FL', -1), ('NODE_WPN_FR', 1)):
        w, top, bot, n, zo = body(0.37)
        k.empty(name, (s * w * 0.62, Y(0.37), zo + top * 0.92))
    k.finish(skip=('core', 'body', 'eye', 'NODE', 'ENGINE', 'mach', 'plate_kit', 'cowl', 'windows', 'drive_pod'))
    print('windows', k.deck_windows(('body',), rows=(-0.1, 0.0, 0.1), step=0.9, size=(0.06, 0.4, 0.22)))


# Baked texture looks (tools/blender/shipkit.py bake_textures): the Savanah black-chitin finish.
LOOKS = {
    'HULL': dict(base=(0.03, 0.034, 0.028), base2=(0.045, 0.05, 0.036), mottle_col=(0.02, 0.035, 0.026), grime=(0.008, 0.009, 0.007),
                 edge=(0.36, 0.3, 0.19), rough=0.32, metal=0.55, cells=1.2, panels=2.4, bump=0.35),
    'TRIM': dict(base=(0.015, 0.016, 0.014), base2=(0.022, 0.022, 0.018), mottle_col=(0.012, 0.014, 0.012), grime=(0.004, 0.004, 0.004),
                 edge=(0.22, 0.2, 0.16), rough=0.45, metal=0.7, cells=2.0, panels=3.5, bump=0.25),
    # Gold sits tight against the hull: short occlusion distance so only real crevices tarnish.
    'GOLD': dict(base=(0.8, 0.56, 0.2), base2=(0.74, 0.5, 0.17), mottle_col=(0.66, 0.45, 0.15), grime=(0.38, 0.24, 0.08),
                 edge=(0.98, 0.84, 0.5), rough=0.2, metal=1.0, cells=4.0, panels=8.0, bump=0.08, ao_dist=0.08, cav_hi=0.6, cav_lo=0.2),
    'GLOW': dict(emit=(0.18, 1.0, 0.5)),
    'WINDOW': dict(emit=(1.0, 0.7, 0.36)),
}
