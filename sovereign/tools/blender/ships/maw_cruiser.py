"""Maw Cruiser · Blackhole cruiser (280 m, 4 hardpoints) · Blender hero hull, detail pass 2.

Pass 2 (hand-made depth): segmented faceted jaws with faceted fangs, an armoured collar ring,
ribbed vanes with emitter tips, machinery in the hull gaps, conduit runs, stepped barbettes,
armoured drive cowls, windows only on the inner hull.

Chosen direction (docs/concepts/maw_cruiser_v1.png): The Maw's head on the Gravity Vanes body.
The ship is a mouth: a heavy armoured head, two thick curved jaws (upper and lower) that open forward
and end in fangs, teeth along their inner edges, the singularity burning deep in the throat, a collar
ring behind the head, then a long armoured body carrying four great gravity vanes in an X, and a triple
drive. Family with the Gravity Fang: navy-black armour, copper lips, orange fire seams, the ring.

Built in real metres (EVE scale). Scale cues are real too: 2 m windows every 5 m, running lights every
20 m, 3 m RCS quads, a drone bay door on the belly.
The game mounts its own articulated turrets on the NODE_ markers, so the hull carries barbettes only.
"""
import math

from mathutils import Matrix
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _forge import dress_plate  # noqa: E402

META = {'name': 'maw_cruiser_hero.glb', 'hull': 'blackhole_cruiser', 'tile': 12.0, 'bake_size': 2048}
L = 280.0
Y0 = L / 2
S = L / 50.0          # concept units → metres


def ss(a, b, x):
    t = min(1, max(0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def bump(c, w, x):
    return math.exp(-((x - c) / w) ** 2)


def prow(t, length=0.04):
    return min(1.0, t / length) ** 0.5


def Y(t):
    return Y0 - t * L


def body(t):
    """Body section (metres) for t along the body loft (0 head … 1 tail)."""
    p = prow(t, 0.04)
    head = bump(0.12, 0.1, t)
    w = (2.4 + 3.6 * ss(0.0, 0.3, t) + 1.4 * head) * (1 - 0.22 * ss(0.85, 1, t)) * p * S
    top = (2.2 + 2.8 * ss(0.0, 0.3, t) + 1.2 * head) * p * S
    bot = (2.0 + 2.4 * ss(0.0, 0.35, t) + 0.8 * head) * p * S
    return w, top, bot, 3.0, 0.0


BODY_LEN = L * 0.82
BODY_Y0 = Y(0.18)


def bt(t):
    """Ship t (0 bow … 1 stern) → body loft t."""
    return (t - 0.18) / 0.82


def fang(k, name, a, b, r, mat, sides=4):
    """A faceted fang from base point a to tip b (a pyramid, not a smooth cone)."""
    import bmesh
    from mathutils import Vector
    a, b = Vector(a), Vector(b)
    d = (b - a).normalized()
    x = d.cross(Vector((0, 0, 1)) if abs(d.z) < 0.9 else Vector((1, 0, 0))).normalized()
    y = d.cross(x)
    bm = bmesh.new()
    base = [bm.verts.new(a + (x * math.cos(t) + y * math.sin(t)) * r) for t in (i / sides * math.tau + math.pi / sides for i in range(sides))]
    mid = [bm.verts.new(a.lerp(b, 0.35) + (x * math.cos(t) + y * math.sin(t)) * r * 0.7) for t in (i / sides * math.tau + math.pi / sides for i in range(sides))]
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
    M['FIRE'] = M['GLOW']

    # ---- 1. silhouette ---------------------------------------------------------------------------
    hull = k.loft('body', BODY_LEN, body, rings=36, segs=32, mat=M['HULL'], y0=BODY_Y0)
    k.panelize(hull, 36, 32, skip_row=3, skip_col=4, depth=0.35, thickness=0.4, keep=lambda i, j: 3 <= i <= 33)
    k.bevel(hull, 0.3, 1, 30)
    k.weighted_normals(hull)
    k.smooth(hull)

    yt = Y(0.18)
    # Throat: the singularity burning deep inside, a glowing gullet ring, a dark socket.
    k.cylinder('throat_socket', 3.4 * S, 2.0 * S, (0, yt + 0.4 * S, 0.3 * S), M['TRIM'], segs=48, r2=2.6 * S)
    k.sphere('singularity', 2.6 * S, (0, yt + 0.9 * S, 0.3 * S), M['CORE'], 48)
    k.torus('throat_glow', 3.1 * S, 0.22 * S, (0, yt + 1.3 * S, 0.3 * S), M['GLOW'], rot=(math.pi / 2, 0, 0), segs=72, rsegs=10)

    # Jaws: upper and lower pairs of thick curved arms, fang tips, teeth on the inside edge.
    for sgn in (1, -1):
        for s in (-1, 1):
            pts, radii = [], []
            for i in range(10):
                u = i / 9
                pts.append((s * (2.6 - 1.4 * u) * S, yt + u * 13.0 * S, sgn * (2.4 + 3.4 * math.sin(u * 1.9) - 2.6 * u ** 2.2) * S))
                radii.append((1.5 * (1 - 0.55 * u) + 0.25) * S)
            jaw, J = k.limb('jaw', pts, radii, M['TRIM'], core_mat=M['HULL'], sides=8, squash=0.78, plates=11, up=(0, 0, sgn), flare=1.1, tip=3.0, overlap=0.3)
            # Faceted fangs along the inner edge, longest in the middle of the jaw.
            for j in range(10):
                u = 0.18 + j * 0.065
                pp, rr, (t, sd, upv) = J.at(u)
                base_ = pp - upv * rr * 0.6
                ln = (1.0 + 0.9 * math.sin(math.pi * (j + 0.5) / 10)) * S
                fang(k, 'tooth', tuple(base_), tuple(base_ - upv * ln + t * 0.25 * S), 0.32 * S, M['GOLD'] if j % 3 == 0 else M['TRIM'])
            # Spines along the outer ridge of each jaw.
            for j in range(6):
                pp, rr, (t, sd, upv) = J.at(0.12 + j * 0.12)
                base_ = pp + upv * rr * 0.72
                fang(k, 'jaw_spine', tuple(base_), tuple(base_ + upv * 0.9 * S - t * 0.6 * S), 0.28 * S, M['HULL'], sides=3)
            k.tube('jaw_fire', [(p[0], p[1], p[2] + sgn * r * 0.86) for p, r in zip(pts[1:-2], radii[1:-2])], [0.12 * S] * 7, M['GLOW'], ends=('round', 'round'), res=3)

    # Head armour: layered plates over the dome behind the jaws, a crest down the middle.
    for i, (t0, t1) in enumerate(((0.185, 0.215), (0.205, 0.24), (0.23, 0.27))):
        k.shell_patch('head_plate_%d' % i, body, BODY_LEN, BODY_Y0, bt(t0), bt(t1), 0.25, math.pi - 0.25, M['TRIM'] if i % 2 else M['HULL'], scale=1.03 + 0.012 * i, flare=0.06, thickness=0.8, segs=16, rings=8, panels=0.45, seed=40 + i)
        for s in (-1, 1):
            k.shell_patch('cheek_plate_%d' % i, body, BODY_LEN, BODY_Y0, bt(t0), bt(t1), (-0.6 if s > 0 else math.pi - 0.1), (0.1 if s > 0 else math.pi + 0.6), M['TRIM'], scale=1.04 + 0.012 * i, flare=0.05, thickness=0.7, segs=8, rings=6)
    w_, top_, bot_, n_, zo_ = body(bt(0.24))
    k.wedge('head_crest', (1.6 * S, 9.0 * S, 1.4 * S), (0, Y(0.24), top_ * 1.04), M['TRIM'], slope=0.6, back=0.3)
    k.tube('crest_fire', [(0, Y(0.205), top_ * 1.04 + 0.75 * S), (0, Y(0.28), top_ * 1.04 + 0.75 * S)], [0.12 * S] * 2, M['GLOW'], ends=('round', 'round'))

    # Collar ring behind the head, leaning back.
    yc = Y(0.34)
    k.armour_ring('event_ring', 7.6 * S, 0.8 * S, 1.9 * S, (0, yc, 0.4 * S), M, rot=(math.pi / 2 - 0.25, 0, 0), blocks=18, gap=0.14)
    for s in (-1, 1):
        k.wedge('ring_pylon', (1.2 * S, 2.6 * S, 4.4 * S), (s * 5.6 * S, yc, 0.4 * S), M['HULL'], slope=0.2, rot=(0, s * 1.2, 0))

    # Four gravity vanes in an X along the body.
    yv = Y(0.62)
    for a in (0.75, math.pi - 0.75, math.pi + 0.75, -0.75):
        vane = k.plate('vane', [(0, 7.0 * S), (0, -9.0 * S), (9.5 * S, -12.0 * S), (11.0 * S, -6.0 * S), (6.0 * S, 4.0 * S)], 1.1 * S, M['TRIM'], loc=(0, yv, 0), bevel_w=0.3)
        vane.rotation_euler = (0, -a, 0)
        armour = k.plate('vane_armour', [(3.0 * S, 4.0 * S), (3.0 * S, -7.5 * S), (8.8 * S, -10.0 * S), (9.8 * S, -6.0 * S), (5.8 * S, 3.0 * S)], 0.5 * S, M['HULL'], loc=(0, yv, 0), bevel_w=0.2)
        armour.rotation_euler = (0, -a, 0)
        c_, s_ = math.cos(a), math.sin(a)
        dress_plate(k, M, armour, (c_, 0, s_), (0, 1, 0), (-s_, 0, c_), (c_ * 6.6 * S, yv - 3.0 * S, s_ * 6.6 * S), (4.6 * S, 9.0 * S), 1.1, 3230 + int(a * 10))
        c, sn = math.cos(a), math.sin(a)
        k.tube('vane_fire', [(c * 5.2 * S, yv + 4.6 * S, sn * 5.2 * S), (c * 11.6 * S, yv - 6.2 * S, sn * 11.6 * S)], [0.15 * S] * 2, M['GLOW'], ends=('round', 'round'))
        k.light_strip('vane_lights', (c * 6.5 * S, yv + 2.0 * S, sn * 6.5 * S), (c * 10.5 * S, yv - 9.5 * S, sn * 10.5 * S), 20, 0.6, M['GLOW'])
        # Structural ribs across the vane (both faces) and an emitter pod at the tip.
        for ry, x0, x1 in ((3.0, 1.0, 6.4), (-1.5, 1.0, 9.6), (-6.0, 1.0, 10.6)):
            for face in (1, -1):
                xc, lx = (x0 + x1) / 2 * S, (x1 - x0) * S
                rb = k.box('vane_rib', (lx, 0.45 * S, 0.5 * S), (xc * c - face * 0.75 * S * sn, yv + ry * S, xc * sn + face * 0.75 * S * c), M['TRIM'], rot=(0, -a, 0))
        tip_ = (c * 11.2 * S, yv - 7.0 * S, sn * 11.2 * S)
        k.cylinder('vane_pod', 0.9 * S, 3.4 * S, tip_, M['TRIM'], segs=8, rot=(-math.pi / 2, 0, 0), r2=0.6 * S)
        k.cylinder('vane_pod_eye', 0.5 * S, 0.2 * S, (tip_[0], tip_[1] + 1.75 * S, tip_[2]), M['GLOW'], segs=8, rot=(-math.pi / 2, 0, 0))

    k.wedge('drive_block', (8.0 * S, 6.0 * S, 5.4 * S), (0, Y(0.95), 0.4 * S), M['TRIM'], slope=-0.2, back=0.35)

    # ---- 2. secondary ----------------------------------------------------------------------------
    for i, (t0, t1) in enumerate(((0.22, 0.3), (0.38, 0.46), (0.45, 0.53), (0.74, 0.82), (0.81, 0.89))):
        mat = M['TRIM'] if i % 2 else M['HULL']
        k.shell_patch('dorsal_%d' % i, body, BODY_LEN, BODY_Y0, bt(t0), bt(t1), 0.5, math.pi - 0.5, mat, scale=1.02, flare=0.03, thickness=0.7, segs=16, rings=10, panels=0.55, seed=11 + i)
        lip = k.edge_curve(body, BODY_LEN, BODY_Y0, bt(t1), 0.5, math.pi - 0.5, scale=1.02 * 1.03 + 0.01)
        k.tube('dorsal_lip_%d' % i, lip, [0.25] * len(lip), M['GOLD'], bevel_res=1, ends=('round', 'round'), res=2)
    for i in range(5):
        t0 = 0.22 + i * 0.13
        for s, (a0, a1) in ((1, (-0.45, 0.3)), (-1, (math.pi - 0.3, math.pi + 0.45))):
            k.shell_patch('flank_%d' % i, body, BODY_LEN, BODY_Y0, bt(t0), bt(t0 + 0.1), a0, a1, M['TRIM'], scale=1.03, flare=0.05, thickness=0.6, segs=10, rings=10, panels=0.6, seed=31 + i * 2 + (s > 0))

    # Barbettes: front pair on the head's shoulders, mid pair on the upper vanes.
    for s, bank, t in ((-1, 'FL', 0.42), (1, 'FR', 0.42)):
        w, top, bot, n, zo = body(bt(t))
        bx, by, bz = s * w * 0.55, Y(t), top * 0.93
        k.cylinder('barbette', 2.6 * S * 1.12, 0.9 * S, (bx, by, bz - 0.35 * S), M['HULL'], segs=8, rot=(0, 0, 0), r2=2.6 * S * 1.02)
        k.cylinder('barbette_step', 2.6 * S * 0.9, 0.5 * S, (bx, by, bz + 0.2 * S), M['TRIM'], segs=16, rot=(0, 0, 0))
        k.torus('barbette_race', 2.6 * S * 0.92, 0.07 * S, (bx, by, bz + 0.46 * S), M['GOLD'], segs=48, rsegs=8)
        k.empty('NODE_WPN_' + bank, (bx, by, bz + 0.4 * S))
    for s, bank in ((-1, 'ML'), (1, 'MR')):
        a = 0.75 if s > 0 else math.pi - 0.75
        r = 7.2 * S
        bx, bz, by = math.cos(a) * r, math.sin(a) * r + 0.8 * S, yv - 3.0 * S
        k.cylinder('barbette', 2.4 * S * 1.12, 0.9 * S, (bx, by, bz - 0.35 * S), M['HULL'], segs=8, rot=(0, 0, 0), r2=2.4 * S * 1.02)
        k.cylinder('barbette_step', 2.4 * S * 0.9, 0.5 * S, (bx, by, bz + 0.2 * S), M['TRIM'], segs=16, rot=(0, 0, 0))
        k.torus('barbette_race', 2.4 * S * 0.92, 0.07 * S, (bx, by, bz + 0.46 * S), M['GOLD'], segs=48, rsegs=8)
        k.empty('NODE_WPN_' + bank, (bx, by, bz + 0.4 * S))

    # ---- 3. detail (real metres) -----------------------------------------------------------------
    for s in (-1, 1):
        # Fire seams along the flanks, broken at the plates.
        for a_, b_ in ((0.2, 0.32), (0.4, 0.55), (0.7, 0.88)):
            pts = []
            for t in (a_, (a_ + b_) / 2, b_):
                w, top, bot, n, zo = body(bt(t))
                pts.append((s * w * 1.02, Y(t), 0.15 * top))
            k.tube('flank_fire', pts, [0.35] * 3, M['GLOW'], bevel_res=1, ends=('round', 'round'), res=4)
        # Radiator banks on the drive block.
        fin = k.box('radiator', (0.6, 1.6, 4.2 * S), (s * 4.05 * S, Y(0.89), 0.6 * S), M['TRIM'])
        k.array(fin, 14, (0, -3.0, 0))
        k.box('radiator_frame', (1.2, 46.0, 1.6), (s * 4.05 * S, Y(0.89) - 20.0, 0.6 * S + 2.2 * S), M['GOLD'])
        # RCS quads (3 m) at the head and tail.
        for t in (0.24, 0.86):
            w, top, bot, n, zo = body(bt(t))
            k.box('rcs', (3.0, 3.0, 3.0), (s * (w + 1.0), Y(t), 0.0), M['TRIM'])
            for dz in (-0.8, 0.8):
                k.cylinder('rcs_nozzle', 0.45, 1.0, (s * (w + 2.6), Y(t), dz), M['CORE'], segs=12, rot=(0, math.pi / 2, 0))
        # Hatches (4 m) and access panels.
        for t in (0.3, 0.5, 0.67, 0.8):
            w, top, bot, n, zo = body(bt(t))
            k.box('hatch', (0.4, 4.0, 3.0), (s * w * 1.0, Y(t), -0.3 * bot), M['GOLD'] if t == 0.5 else M['HULL'])
        # Running lights along the dorsal shoulders every 20 m.
        a = body(bt(0.25)); b = body(bt(0.85))
        k.light_strip('dorsal_lights', (s * a[0] * 0.5, Y(0.25), a[1] * 0.92), (s * b[0] * 0.5, Y(0.85), b[1] * 0.92), 20, 0.7, M['GLOW'])

    # Low hardware on the flank armour: hatches, vents and blisters riding on the plates.
    k.machinery('plate_kit', body, BODY_LEN, BODY_Y0, bt(0.24), bt(0.88), -0.4, 0.25, M, count=45, h=0.7, seed=21, scale=1.03 * 1.05)
    k.machinery('plate_kit', body, BODY_LEN, BODY_Y0, bt(0.24), bt(0.88), math.pi - 0.25, math.pi + 0.4, M, count=45, h=0.7, seed=22, scale=1.03 * 1.05)
    # Machinery in the gaps: the dorsal well between the plates, the flank undersides, the belly.
    k.machinery('mach_dorsal', body, BODY_LEN, BODY_Y0, bt(0.54), bt(0.73), 0.55, math.pi - 0.55, M, count=70, h=2.4, seed=3)
    k.machinery('mach_neck', body, BODY_LEN, BODY_Y0, bt(0.3), bt(0.37), 0.6, math.pi - 0.6, M, count=24, h=2.0, seed=4)
    k.machinery('mach_flank', body, BODY_LEN, BODY_Y0, bt(0.25), bt(0.9), -0.95, -0.5, M, count=40, h=1.6, seed=5)
    k.machinery('mach_flank', body, BODY_LEN, BODY_Y0, bt(0.25), bt(0.9), math.pi + 0.5, math.pi + 0.95, M, count=40, h=1.6, seed=6)
    k.machinery('mach_belly', body, BODY_LEN, BODY_Y0, bt(0.3), bt(0.5), math.pi + 1.1, math.tau - 1.1, M, count=30, h=1.8, seed=7)
    # Conduit runs along both dorsal shoulders, over the plates, clamped every few metres.
    for s in (-1, 1):
        a_ = 0.42 if s > 0 else math.pi - 0.42
        run = [k.surf(body, BODY_LEN, BODY_Y0, bt(t), a_, 1.075)[0] for t in (0.22, 0.32, 0.45, 0.58, 0.72, 0.86)]
        k.conduit('conduit', [tuple(p) for p in run], 0.55, M['TRIM'], clamps=8, clamp_mat=M['GOLD'])
        run2 = [k.surf(body, BODY_LEN, BODY_Y0, bt(t), a_ - s * 0.1, 1.07)[0] for t in (0.24, 0.4, 0.56, 0.7, 0.84)]
        k.conduit('conduit', [tuple(p) for p in run2], 0.35, M['HULL'], clamps=5, clamp_mat=M['TRIM'])

    # Drone bay on the belly: a recessed door 40 m long with a frame of lamps.
    w, top, bot, n, zo = body(bt(0.6))
    k.box('drone_bay_frame', (16.0, 44.0, 2.0), (0, Y(0.6), -bot * 0.97), M['TRIM'])
    k.box('drone_bay_door', (13.0, 40.0, 1.0), (0, Y(0.6), -bot * 0.97 - 1.2), M['HULL'])
    k.light_strip('drone_bay_lamps', (-7.5, Y(0.6) + 20, -bot * 0.97 - 1.5), (-7.5, Y(0.6) - 20, -bot * 0.97 - 1.5), 5, 0.4, M['GLOW'])
    k.light_strip('drone_bay_lamps', (7.5, Y(0.6) + 20, -bot * 0.97 - 1.5), (7.5, Y(0.6) - 20, -bot * 0.97 - 1.5), 5, 0.4, M['GLOW'])
    # Sensor crown on the head: masts and a dish, 10-20 m tall.
    w, top, bot, n, zo = body(bt(0.27))
    k.sensor_mast('mast', (-3.0, Y(0.27), top * 0.95), 18.0, M['TRIM'], M['GLOW'], dish=4.0)
    k.sensor_mast('mast', (3.0, Y(0.29), top * 0.95), 12.0, M['TRIM'], M['GLOW'])
    k.vent_grille('reactor_vent', (0, Y(0.9), 3.1 * S), 3.0 * S, 3.6 * S, 9, M['TRIM'], M['HULL'], rot=(0.25, 0, 0))

    # Drives: three deep bells and the markers the game lights.
    for x, z, name in ((-2.4, 0.0, 'PORT'), (0.0, 1.3, 'MAIN'), (2.4, 0.0, 'STARBOARD')):
        k.nozzle('nozzle', (x * S, Y(1.0) - 0.6 * S, z * S), 1.25 * S, 2.2 * S, M, glow='GLOW')
        k.cowl('cowl', (x * S, Y(1.0) - 0.2 * S, z * S), 1.25 * S, 2.6 * S, M)
        k.empty('ENGINE_' + name, (x * S, Y(1.0) - 1.8 * S, z * S), 1.25 * S)

    k.finish(skip=('core', 'singularity', 'body', 'event_ring', 'ring_fire', 'NODE', 'ENGINE', 'windows', 'jaw', 'mach', 'cowl'))
    n = k.deck_windows(('body',), rows=(-0.2, -0.14, -0.08, -0.02, 0.04, 0.1), step=2.4, size=(0.2, 1.2, 0.6))
    print('windows', n)


LOOKS = {
    'HULL': dict(base=(0.022, 0.027, 0.042), base2=(0.03, 0.036, 0.055), mottle_col=(0.018, 0.02, 0.03), grime=(0.006, 0.006, 0.008),
                 edge=(0.26, 0.24, 0.26), rough=0.34, metal=0.6, cells=0.25, panels=0.5, bump=0.35),
    'TRIM': dict(base=(0.011, 0.011, 0.014), base2=(0.016, 0.016, 0.02), mottle_col=(0.009, 0.009, 0.012), grime=(0.003, 0.003, 0.004),
                 edge=(0.2, 0.18, 0.17), rough=0.42, metal=0.75, cells=0.4, panels=0.7, bump=0.25),
    'GOLD': dict(base=(0.62, 0.3, 0.12), base2=(0.55, 0.26, 0.1), mottle_col=(0.48, 0.22, 0.08), grime=(0.2, 0.09, 0.03),
                 edge=(0.95, 0.62, 0.38), rough=0.26, metal=1.0, cells=0.8, panels=1.6, bump=0.08, ao_dist=0.5, cav_hi=0.6, cav_lo=0.2),
    'CORE': dict(base=(0.004, 0.004, 0.005), base2=(0.004, 0.004, 0.005), mottle_col=(0.004, 0.004, 0.005), grime=(0.002, 0.002, 0.002),
                 edge=(0.05, 0.05, 0.06), rough=0.06, metal=1.0, cells=0.2, panels=0.2, bump=0.0),
    'GLOW': dict(emit=(1.0, 0.36, 0.06)),
    'WINDOW': dict(emit=(1.0, 0.7, 0.36)),
}
