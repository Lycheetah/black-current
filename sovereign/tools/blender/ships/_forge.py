"""Shared forge helpers for hero hulls: hull maths, armour plating with sub-panels, machinery bands,
faceted fangs, and baked looks per civilisation scaled to the hull's length."""
import math


def ss(a, b, x):
    t = min(1, max(0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def bump(c, w, x):
    return math.exp(-((x - c) / w) ** 2)


def prow(t, length=0.05):
    return min(1.0, t / length) ** 0.5


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


def armour(k, M, sec, LEN, Y0, to_loft, dorsal, flanks, thick, seed=1):
    """Dorsal plates over [(t0, t1)] and flank plates over [(t0, t1)] (ship t), sub-panelled, gold lips."""
    for i, (t0, t1) in enumerate(dorsal):
        mat = M['TRIM'] if i % 2 else M['HULL']
        k.shell_patch('dorsal_%d' % i, sec, LEN, Y0, to_loft(t0), to_loft(t1), 0.5, math.pi - 0.5, mat, scale=1.02, flare=0.03,
                      thickness=thick, segs=14, rings=8, panels=0.55, seed=seed + i)
        lip = k.edge_curve(sec, LEN, Y0, to_loft(t1), 0.5, math.pi - 0.5, scale=1.02 * 1.03 + 0.01)
        k.tube('dorsal_lip_%d' % i, lip, [thick * 0.35] * len(lip), M['GOLD'], bevel_res=1, ends=('round', 'round'), res=2)
    for i, (t0, t1) in enumerate(flanks):
        for s, (a0, a1) in ((1, (-0.45, 0.3)), (-1, (math.pi - 0.3, math.pi + 0.45))):
            k.shell_patch('flank_%d' % i, sec, LEN, Y0, to_loft(t0), to_loft(t1), a0, a1, M['TRIM'], scale=1.03, flare=0.05,
                          thickness=thick * 0.85, segs=9, rings=9, panels=0.6, seed=seed + 40 + i * 2 + (s > 0))


def machinery_bands(k, M, sec, LEN, Y0, to_loft, t0, t1, h, seed=1, dorsal_gap=None, density=1.0):
    """Machinery under the flank plates, on the belly, and in a dorsal gap; low hardware on the flank plates."""
    n = lambda c: max(6, int(c * density))
    for s, (a0, a1) in ((1, (-0.95, -0.5)), (-1, (math.pi + 0.5, math.pi + 0.95))):
        k.machinery('mach_flank', sec, LEN, Y0, to_loft(t0), to_loft(t1), a0, a1, M, count=n(30), h=h, seed=seed + (s > 0))
    k.machinery('mach_belly', sec, LEN, Y0, to_loft(t0), to_loft(t1), math.pi + 1.1, math.tau - 1.1, M, count=n(24), h=h, seed=seed + 3)
    for s, (a0, a1) in ((1, (-0.4, 0.25)), (-1, (math.pi - 0.25, math.pi + 0.4))):
        k.machinery('plate_kit', sec, LEN, Y0, to_loft(t0), to_loft(t1), a0, a1, M, count=n(26), h=h * 0.4, seed=seed + 5 + (s > 0), scale=1.03 * 1.05)
    if dorsal_gap:
        k.machinery('mach_dorsal', sec, LEN, Y0, to_loft(dorsal_gap[0]), to_loft(dorsal_gap[1]), 0.55, math.pi - 0.55, M, count=n(40), h=h * 1.2, seed=seed + 9)


def conduits(k, M, sec, LEN, Y0, to_loft, ts, r):
    for s in (-1, 1):
        a_ = 0.42 if s > 0 else math.pi - 0.42
        run = [k.surf(sec, LEN, Y0, to_loft(t), a_, 1.075)[0] for t in ts]
        k.conduit('conduit', [tuple(p) for p in run], r, M['TRIM'], clamps=6, clamp_mat=M['GOLD'])


def barbette(k, M, bank, x, y, z, r, h):
    k.cylinder('barbette', r * 1.15, h, (x, y, z - h * 0.35), M['HULL'], segs=8, rot=(0, 0, 0), r2=r * 1.03)
    k.cylinder('barbette_step', r * 0.92, h * 0.55, (x, y, z + h * 0.22), M['TRIM'], segs=16, rot=(0, 0, 0))
    k.torus('barbette_race', r * 0.94, h * 0.08, (x, y, z + h * 0.5), M['GOLD'], segs=40, rsegs=6)
    k.empty('NODE_WPN_' + bank, (x, y, z + h * 0.55))


def looks(race, length):
    """Baked looks: detail frequencies scale with hull length so panels read at the same size in metres."""
    c, p = 70.0 / length, 140.0 / length
    pal = PALETTES.get(race)
    if pal:
        hb, tb, gb, glow, mt = pal
        sc = lambda c, f: tuple(min(1, x * f) for x in c)
        return {
            'HULL': dict(base=hb, base2=sc(hb, 1.18), mottle_col=sc(hb, 0.8), grime=sc(hb, 0.3), edge=sc(hb, 3.5) if max(hb) < 0.2 else sc(hb, 1.6),
                         rough=0.34, metal=mt, cells=c, panels=p, bump=0.35),
            'TRIM': dict(base=tb, base2=sc(tb, 1.25), mottle_col=sc(tb, 0.8), grime=sc(tb, 0.3), edge=sc(tb, 6), rough=0.44, metal=0.75,
                         cells=c * 1.6, panels=p * 1.4, bump=0.25),
            'GOLD': dict(base=gb, base2=sc(gb, 0.9), mottle_col=sc(gb, 0.8), grime=sc(gb, 0.4), edge=sc(gb, 1.3), rough=0.22, metal=1.0,
                         cells=c * 3, panels=p * 3, bump=0.08, ao_dist=0.3 * length / 140, cav_hi=0.6, cav_lo=0.2),
            'CORE': dict(base=(0.004, 0.004, 0.005), base2=(0.004, 0.004, 0.005), mottle_col=(0.004, 0.004, 0.005), grime=(0.002, 0.002, 0.002),
                         edge=(0.05, 0.05, 0.06), rough=0.06, metal=1.0, cells=c, panels=p, bump=0.0),
            'GLOW': dict(emit=glow),
            'WINDOW': dict(emit=(1.0, 0.75, 0.45)),
        }
    if race == 'savanah':
        return {
            'HULL': dict(base=(0.03, 0.034, 0.028), base2=(0.045, 0.05, 0.036), mottle_col=(0.02, 0.035, 0.026), grime=(0.008, 0.009, 0.007),
                         edge=(0.36, 0.3, 0.19), rough=0.32, metal=0.55, cells=c, panels=p, bump=0.35),
            'TRIM': dict(base=(0.015, 0.016, 0.014), base2=(0.022, 0.022, 0.018), mottle_col=(0.012, 0.014, 0.012), grime=(0.004, 0.004, 0.004),
                         edge=(0.22, 0.2, 0.16), rough=0.45, metal=0.7, cells=c * 1.6, panels=p * 1.4, bump=0.25),
            'GOLD': dict(base=(0.8, 0.56, 0.2), base2=(0.74, 0.5, 0.17), mottle_col=(0.66, 0.45, 0.15), grime=(0.38, 0.24, 0.08),
                         edge=(0.98, 0.84, 0.5), rough=0.2, metal=1.0, cells=c * 3, panels=p * 3, bump=0.08, ao_dist=0.08 * length / 55, cav_hi=0.6, cav_lo=0.2),
            'CORE': dict(base=(0.004, 0.004, 0.005), base2=(0.004, 0.004, 0.005), mottle_col=(0.004, 0.004, 0.005), grime=(0.002, 0.002, 0.002),
                         edge=(0.05, 0.05, 0.06), rough=0.06, metal=1.0, cells=c, panels=p, bump=0.0),
            'GLOW': dict(emit=(0.18, 1.0, 0.5)),
            'WINDOW': dict(emit=(1.0, 0.7, 0.36)),
        }
    return {
        'HULL': dict(base=(0.022, 0.027, 0.042), base2=(0.03, 0.036, 0.055), mottle_col=(0.018, 0.02, 0.03), grime=(0.006, 0.006, 0.008),
                     edge=(0.26, 0.24, 0.26), rough=0.34, metal=0.6, cells=c, panels=p, bump=0.35),
        'TRIM': dict(base=(0.011, 0.011, 0.014), base2=(0.016, 0.016, 0.02), mottle_col=(0.009, 0.009, 0.012), grime=(0.003, 0.003, 0.004),
                     edge=(0.2, 0.18, 0.17), rough=0.42, metal=0.75, cells=c * 1.6, panels=p * 1.4, bump=0.25),
        'GOLD': dict(base=(0.62, 0.3, 0.12), base2=(0.55, 0.26, 0.1), mottle_col=(0.48, 0.22, 0.08), grime=(0.2, 0.09, 0.03),
                     edge=(0.95, 0.62, 0.38), rough=0.26, metal=1.0, cells=c * 3, panels=p * 3, bump=0.08, ao_dist=0.5 * length / 280, cav_hi=0.6, cav_lo=0.2),
        'CORE': dict(base=(0.004, 0.004, 0.005), base2=(0.004, 0.004, 0.005), mottle_col=(0.004, 0.004, 0.005), grime=(0.002, 0.002, 0.002),
                     edge=(0.05, 0.05, 0.06), rough=0.06, metal=1.0, cells=c, panels=p, bump=0.0),
        'GLOW': dict(emit=(1.0, 0.36, 0.06)),
        'WINDOW': dict(emit=(1.0, 0.7, 0.36)),
    }


# Civilisation palettes for baked looks: (hull, trim, accent metal, glow, hull metalness).
PALETTES = {
    'cosmic_light': ((0.30, 0.28, 0.24), (0.07, 0.065, 0.06), (0.86, 0.64, 0.26), (1.0, 0.86, 0.48), 0.45),
    'ai_gods': ((0.02, 0.018, 0.026), (0.009, 0.008, 0.011), (0.9, 0.66, 0.24), (1.0, 0.84, 0.52), 0.72),
    'chaos': ((0.032, 0.018, 0.042), (0.012, 0.008, 0.016), (0.42, 0.09, 0.12), (0.78, 0.26, 1.0), 0.55),
    'sol_symbiots': ((0.12, 0.145, 0.17), (0.028, 0.036, 0.046), (0.62, 0.7, 0.76), (0.3, 0.95, 1.0), 0.65),
    'human_hunters': ((0.085, 0.085, 0.08), (0.022, 0.022, 0.02), (0.82, 0.56, 0.08), (1.0, 0.62, 0.2), 0.7),
    'techno_angels': ((0.24, 0.27, 0.3), (0.05, 0.06, 0.08), (0.7, 0.8, 0.86), (0.35, 0.9, 1.0), 0.6),
    'ai_hunters': ((0.02, 0.02, 0.022), (0.009, 0.009, 0.01), (0.3, 0.3, 0.32), (1.0, 0.12, 0.08), 0.5),
    'amethyst_angels': ((0.16, 0.13, 0.2), (0.04, 0.03, 0.06), (0.75, 0.72, 0.8), (0.75, 0.35, 1.0), 0.5),
    'pagan_ai': ((0.42, 0.38, 0.3), (0.06, 0.045, 0.03), (0.85, 0.6, 0.22), (1.0, 0.55, 0.15), 0.2),
    'ai': ((0.33, 0.34, 0.36), (0.05, 0.055, 0.06), (0.4, 0.6, 0.7), (0.3, 0.9, 1.0), 0.7),
    'rust': ((0.11, 0.055, 0.03), (0.03, 0.026, 0.024), (0.62, 0.42, 0.16), (1.0, 0.5, 0.15), 0.45),
    'cosmic_darkness': ((0.014, 0.016, 0.032), (0.006, 0.006, 0.012), (0.5, 0.46, 0.72), (0.55, 0.4, 1.0), 0.6),
    'hybrid_fused': ((0.05, 0.035, 0.055), (0.018, 0.014, 0.02), (0.55, 0.36, 0.2), (0.8, 0.3, 1.0), 0.6),
}


def rib(k, name, R, r, y, z, mat, arc=4.0):
    """An open arch (rib or buttress) around the Y axis at height z, its gap at the bottom."""
    return k.torus(name, R, r, (0, y, z), mat, rot=(math.pi / 2, arc / 2 - math.pi / 2, 0), arc=arc, segs=24, rsegs=6, taper=0.1)


def spire(k, name, base, h, r, mat, sides=6):
    """A tall pointed spire standing on base."""
    return k.cylinder(name, r, h, (base[0], base[1], base[2] + h / 2), mat, segs=sides, rot=(0, 0, 0), r2=0.0)


def top_z(ob):
    """World height of an object's top, after its modifiers (to sit dressing on a plate's real face)."""
    import bpy
    from mathutils import Vector
    dg = bpy.context.evaluated_depsgraph_get()
    ev = ob.evaluated_get(dg)
    return max((ev.matrix_world @ Vector(c)).z for c in ev.bound_box)


def gothic_spire(k, M, name, base, h, r):
    """A tiered gothic spire: buttressed base block, octagonal shaft with a gold band, an open crown
    of four pinnacles, a tall needle, and four small flanking pinnacles at the base."""
    x, y, z = base
    k.box(name + '_base', (r * 2.6, r * 2.6, h * 0.12), (x, y, z + h * 0.06), M['HULL'])
    k.cylinder(name + '_shaft', r * 1.0, h * 0.42, (x, y, z + h * 0.33), M['TRIM'], segs=8, rot=(0, 0, 0), r2=r * 0.85)
    k.cylinder(name + '_band', r * 1.08, h * 0.03, (x, y, z + h * 0.3), M['GOLD'], segs=8, rot=(0, 0, 0))
    k.cylinder(name + '_crown', r * 1.2, h * 0.06, (x, y, z + h * 0.57), M['HULL'], segs=8, rot=(0, 0, 0))
    for i in range(4):
        a = i / 4 * math.tau + math.pi / 4
        k.cylinder(name + '_crown_pin', r * 0.22, h * 0.18, (x + math.cos(a) * r * 1.0, y + math.sin(a) * r * 1.0, z + h * 0.69), M['TRIM'], segs=4, rot=(0, 0, 0), r2=0.0)
        k.cylinder(name + '_foot_pin', r * 0.3, h * 0.22, (x + math.cos(a) * r * 1.6, y + math.sin(a) * r * 1.6, z + h * 0.23), M['TRIM'], segs=4, rot=(0, 0, 0), r2=0.0)
    k.cylinder(name + '_needle', r * 0.55, h * 0.42, (x, y, z + h * 0.81), M['TRIM'], segs=8, rot=(0, 0, 0), r2=0.0)


def dress_plate(k, M, ob, X, Y, N, center, size, h, seed, count=8, both=True, name='plate_dress'):
    """Dress a (possibly rotated) plate on its real faces: measures the plate's extent along N after
    modifiers, then lays cut plating and hardware flush on the +N face (and the -N face)."""
    import bpy
    from mathutils import Vector
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    ev = ob.evaluated_get(dg)
    me = ev.to_mesh()
    C, Nv = Vector(center), Vector(N).normalized()
    ds = [((ev.matrix_world @ v.co) - C).dot(Nv) for v in me.vertices]
    ev.to_mesh_clear()
    lo, hi = min(ds), max(ds)
    k.plane_kit(name, C + Nv * hi, X, Y, Nv, size, M, count=count, h=h, seed=seed)
    if both:
        k.plane_kit(name, C + Nv * lo, X, Y, -Nv, size, M, count=count // 2, h=h, seed=seed + 1)
