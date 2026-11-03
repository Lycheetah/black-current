"""Sovereign Eclipse Blender ship kit.

Helpers for modelling hulls with Blender's own tools (subdivision, bevel, solidify, array, curves)
from a script, and exporting a game-ready .glb.

Conventions (match the game's model markers, docs/MAKING_SHIPS.md):
  - metres; the nose points along Blender +Y (exports as glTF −Z), up is +Z
  - materials named HULL / TRIM / GOLD / GLOW take the civilisation palette in game
  - empties NODE_WPN_xx are hardpoints, ENGINE_* are drives (empty scale = nozzle radius)
"""
import math

import bpy  # must load before bmesh
import bmesh


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


_mats = {}


def material(name, color, metal=0.7, rough=0.45, emit=None):
    if name in _mats:
        return _mats[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Metallic'].default_value = metal
    b.inputs['Roughness'].default_value = rough
    if emit:
        b.inputs['Emission Color'].default_value = (*emit, 1)
        b.inputs['Emission Strength'].default_value = 4.0
    _mats[name] = m
    return m


def palette():
    """The four palette materials the game recolours."""
    return {
        'HULL': material('HULL', (0.06, 0.065, 0.055), 0.75, 0.42),
        'TRIM': material('TRIM', (0.02, 0.022, 0.018), 0.8, 0.5),
        'GOLD': material('GOLD', (0.83, 0.6, 0.22), 1.0, 0.28),
        'GLOW': material('GLOW', (0.1, 1.0, 0.45), 0.0, 0.5, emit=(0.15, 1.0, 0.5)),
    }


def obj_from_bmesh(name, bm, mat=None):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    if mat:
        ob.data.materials.append(mat)
    return ob


def superellipse(w, top, bottom, n, segs):
    """Cross-section points (x, z) of a superellipse with separate top and bottom heights."""
    pts = []
    for j in range(segs):
        a = j / segs * math.tau
        c, s = math.cos(a), math.sin(a)
        x = w * math.copysign(abs(c) ** (2 / n), c)
        z = (top if s >= 0 else bottom) * math.copysign(abs(s) ** (2 / n), s)
        pts.append((x, z))
    return pts


def loft(name, length, sections, rings=14, segs=16, mat=None, y0=None, cap=True):
    """Hull cage: rings of superellipse sections along Y, nose at +Y.
    sections(t) -> (width, top, bottom, n, zoffset) with t from nose 0 to tail 1."""
    bm = bmesh.new()
    y0 = length / 2 if y0 is None else y0
    loops = []
    for i in range(rings + 1):
        t = i / rings
        w, top, bottom, n, zo = sections(t)
        ring = [bm.verts.new((x, y0 - t * length, z + zo)) for x, z in superellipse(max(w, 1e-3), max(top, 1e-3), max(bottom, 1e-3), n, segs)]
        loops.append(ring)
    for a, b in zip(loops, loops[1:]):
        for j in range(segs):
            bm.faces.new((a[j], a[(j + 1) % segs], b[(j + 1) % segs], b[j]))
    if cap:
        bm.faces.new(list(reversed(loops[0])))
        bm.faces.new(loops[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return obj_from_bmesh(name, bm, mat)


def subsurf(ob, levels=2):
    m = ob.modifiers.new('Subsurf', 'SUBSURF')
    m.levels = levels
    m.render_levels = levels
    return m


def bevel(ob, width=0.05, segments=2, angle=35):
    m = ob.modifiers.new('Bevel', 'BEVEL')
    m.width = width
    m.segments = segments
    m.limit_method = 'ANGLE'
    m.angle_limit = math.radians(angle)
    m.harden_normals = True
    return m


def solidify(ob, thickness):
    m = ob.modifiers.new('Solidify', 'SOLIDIFY')
    m.thickness = thickness
    m.offset = 1
    return m


def array(ob, count, offset):
    m = ob.modifiers.new('Array', 'ARRAY')
    m.count = count
    m.use_relative_offset = False
    m.use_constant_offset = True
    m.constant_offset_displace = offset
    return m


def mirror_x(ob):
    m = ob.modifiers.new('Mirror', 'MIRROR')
    m.use_axis = (True, False, False)
    return m


def smooth(ob):
    for p in ob.data.polygons:
        p.use_smooth = True


def box(name, size, loc, mat, rot=(0, 0, 0)):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x *= size[0]; v.co.y *= size[1]; v.co.z *= size[2]
    ob = obj_from_bmesh(name, bm, mat)
    ob.location = loc
    ob.rotation_euler = rot
    return ob


def cylinder(name, r, depth, loc, mat, segs=24, rot=(math.pi / 2, 0, 0), r2=None):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=segs, radius1=r, radius2=r if r2 is None else r2, depth=depth)
    ob = obj_from_bmesh(name, bm, mat)
    ob.location = loc
    ob.rotation_euler = rot
    return ob


def sphere(name, r, loc, mat, segs=24):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=segs, v_segments=segs // 2, radius=r)
    ob = obj_from_bmesh(name, bm, mat)
    ob.location = loc
    smooth(ob)
    return ob


def torus(name, R, r, loc, mat, rot=(0, 0, 0), arc=math.tau, segs=48, rsegs=10, taper=0.12):
    """Ring or arc. A partial arc tapers to rounded, closed ends instead of stopping with a flat cut."""
    bm = bmesh.new()
    rings = []
    full = arc >= math.tau - 1e-6
    steps = segs if full else segs + 1
    for i in range(steps):
        a = arc * i / segs
        u = i / segs
        k = 1.0 if full or taper <= 0 else 0.15 + 0.85 * min(1.0, math.sin(min(u, 1 - u) / taper * math.pi / 2) if min(u, 1 - u) < taper else 1.0)
        ring = []
        for j in range(rsegs):
            b = j / rsegs * math.tau
            ring.append(bm.verts.new(((R + r * k * math.cos(b)) * math.cos(a), (R + r * k * math.cos(b)) * math.sin(a), r * k * math.sin(b))))
        rings.append(ring)
    pairs = list(zip(rings, rings[1:])) + ([(rings[-1], rings[0])] if full else [])
    for A, B in pairs:
        for j in range(rsegs):
            bm.faces.new((A[j], A[(j + 1) % rsegs], B[(j + 1) % rsegs], B[j]))
    if not full:
        bm.faces.new(list(reversed(rings[0])))
        bm.faces.new(rings[-1])
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = obj_from_bmesh(name, bm, mat)
    ob.location = loc
    ob.rotation_euler = rot
    smooth(ob)
    return ob


def _tip(points, radii, end, at_start):
    """Extend a tube past its end so it closes: 'round' (a domed cap) or 'point' (a fang)."""
    if end not in ('round', 'point'):
        return points, radii
    i0, i1 = (0, 1) if at_start else (-1, -2)
    p0, p1, r = points[i0], points[i1], radii[i0]
    d = [a - b for a, b in zip(p0, p1)]
    n = math.sqrt(sum(c * c for c in d)) or 1
    d = [c / n for c in d]
    steps = ((0.45, 0.8), (0.8, 0.45), (1.0, 0.06)) if end == 'round' else ((1.2, 0.62), (2.4, 0.3), (3.6, 0.04))
    ext = [tuple(c + dc * r * k for c, dc in zip(p0, d)) for k, _ in steps]
    er = [r * f for _, f in steps]
    if at_start:
        return list(reversed(ext)) + list(points), list(reversed(er)) + list(radii)
    return list(points) + ext, list(radii) + er


def tube(name, points, radii, mat, bevel_res=4, ends=('flat', 'flat'), res=7):
    """Tapered curve tube through points [(x,y,z)], one radius per point, converted to mesh.
    ends: ('flat'|'round'|'point', same) for the start and end of the tube."""
    points, radii = _tip(list(points), list(radii), ends[0], True)
    points, radii = _tip(points, radii, ends[1], False)
    cu = bpy.data.curves.new(name, 'CURVE')
    cu.dimensions = '3D'
    cu.bevel_depth = 1.0
    cu.bevel_resolution = bevel_res
    cu.use_fill_caps = True
    sp = cu.splines.new('NURBS')
    sp.points.add(len(points) - 1)
    for p, (x, y, z), r in zip(sp.points, points, radii):
        p.co = (x, y, z, 1)
        p.radius = r
    sp.use_endpoint_u = True
    sp.order_u = 4
    sp.resolution_u = res
    ob = bpy.data.objects.new(name, cu)
    bpy.context.collection.objects.link(ob)
    ob.data.materials.append(mat)
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)
    bpy.ops.object.convert(target='MESH')
    ob.select_set(False)
    smooth(ob)
    return ob


def plate(name, outline, thickness, mat, loc=(0, 0, 0), rot=(0, 0, 0), bevel_w=0.04):
    """Flat outline [(x,y)] extruded to a bevelled plate."""
    bm = bmesh.new()
    vs = [bm.verts.new((x, y, 0)) for x, y in outline]
    f = bm.faces.new(vs)
    bmesh.ops.recalc_face_normals(bm, faces=[f])
    ob = obj_from_bmesh(name, bm, mat)
    solidify(ob, thickness)
    bevel(ob, bevel_w, 2, 30)
    ob.location = loc
    ob.rotation_euler = rot
    return ob


def empty(name, loc, scale=1.0):
    e = bpy.data.objects.new(name, None)
    e.location = loc
    e.scale = (scale, scale, scale)
    e.empty_display_size = 0.5
    bpy.context.collection.objects.link(e)
    return e


def uv_cube(ob, tile=4.0):
    """World-scaled box projection so the game's hull plating tiles evenly across every part."""
    if ob.type != 'MESH':
        return
    bpy.context.view_layer.objects.active = ob
    for o in bpy.context.selected_objects:
        o.select_set(False)
    ob.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.cube_project(cube_size=tile, scale_to_bounds=False, correct_aspect=False)
    bpy.ops.object.mode_set(mode='OBJECT')
    ob.select_set(False)


def export(path, tile=4.0, baked=False):
    if not baked:
        for ob in list(bpy.context.scene.objects):
            uv_cube(ob, tile)
    extra = {'export_image_format': 'WEBP', 'export_image_quality': 86} if baked else {}
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_apply=True, export_yup=True,
                              export_materials='EXPORT', export_extras=False, **extra)
    tris = 0
    deps = bpy.context.evaluated_depsgraph_get()
    for ob in bpy.context.scene.objects:
        if ob.type == 'MESH':
            me = ob.evaluated_get(deps).to_mesh()
            me.calc_loop_triangles()
            tris += len(me.loop_triangles)
            ob.evaluated_get(deps).to_mesh_clear()
    return tris


def shell_patch(name, sections, length, y0, t0, t1, a0, a1, mat, scale=1.06, lift=0.0, rings=10, segs=14, thickness=0.18, flare=0.25, panels=0.0, seed=0):
    """A curved armour plate that wraps the hull: a patch of the hull surface between t0..t1 and
    section angles a0..a1 (radians, 0 = starboard, pi/2 = dorsal), pushed outward by `scale`,
    with its trailing edge flared up so consecutive plates overlap like chitin."""
    bm = bmesh.new()
    grid = []
    for i in range(rings + 1):
        u = i / rings
        t = t0 + (t1 - t0) * u
        w, top, bottom, n, zo = sections(t)
        k = scale * (1 + flare * u * u)
        row = []
        for j in range(segs + 1):
            a = a0 + (a1 - a0) * j / segs
            c, s = math.cos(a), math.sin(a)
            x = w * k * math.copysign(abs(c) ** (2 / n), c)
            z = (top if s >= 0 else bottom) * k * math.copysign(abs(s) ** (2 / n), s)
            row.append(bm.verts.new((x, y0 - t * length, z + zo + lift * u)))
        grid.append(row)
    quads = []
    for A, B in zip(grid, grid[1:]):
        for j in range(segs):
            quads.append(bm.faces.new((A[j], A[j + 1], B[j + 1], B[j])))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    if panels > 0:
        # Sub-panels: merge random 2x1 / 1x2 / 2x2 cells and inset them, so the plate carries an
        # irregular pattern of recessed panels like hand-cut armour, not a regular grid.
        import random
        rnd = random.Random(seed or hash(name) & 0xffff)
        used, pick = set(), []
        for i in range(rings):
            for j in range(segs):
                if (i, j) in used or rnd.random() > panels or i in (0, rings - 1) or j in (0, segs - 1):
                    continue
                di, dj = rnd.choice(((1, 1), (2, 1), (1, 2), (2, 2), (1, 3)))
                cells = [(i + x, j + y) for x in range(di) for y in range(dj) if i + x < rings - 1 and j + y < segs - 1]
                if any(c in used for c in cells):
                    continue
                used.update(cells)
                fs = [quads[c[0] * segs + c[1]] for c in cells]
                if len(fs) > 1:
                    r = bmesh.ops.dissolve_faces(bm, faces=fs, use_verts=False)
                    fs = r['region']
                pick += fs
        if pick:
            bmesh.ops.inset_individual(bm, faces=pick, thickness=thickness * 0.3, depth=-thickness * 0.4, use_even_offset=True)
    ob = obj_from_bmesh(name, bm, mat)
    solidify(ob, thickness)
    bevel(ob, thickness * 0.3, 1, 30)
    smooth(ob)
    return ob


def edge_curve(sections, length, y0, t, a0, a1, scale=1.06, lift=0.0, steps=14):
    """Points along a hull section arc (for gold lips and seams that follow the surface)."""
    w, top, bottom, n, zo = sections(t)
    pts = []
    for j in range(steps + 1):
        a = a0 + (a1 - a0) * j / steps
        c, s = math.cos(a), math.sin(a)
        x = w * scale * math.copysign(abs(c) ** (2 / n), c)
        z = (top if s >= 0 else bottom) * scale * math.copysign(abs(s) ** (2 / n), s)
        pts.append((x, y0 - t * length, z + zo + lift))
    return pts


def parent(child, par):
    child.parent = par
    return child


# ---------------------------------------------------------------- hard-surface techniques

def _crease_edges(me, edges_idx, value=1.0):
    attr = me.attributes.get('crease_edge') or me.attributes.new('crease_edge', 'FLOAT', 'EDGE')
    for i in edges_idx:
        attr.data[i].value = value


def panelize(ob, rings, segs, skip_row=3, skip_col=4, depth=0.05, thickness=0.06, keep=None):
    """Cut recessed armour panels into a loft cage: faces are inset individually and pushed in, leaving
    raised seams between panels. Every `skip_row`-th ring band and `skip_col`-th column stay whole, so
    panels group into readable plates. Seam edges are creased so subdivision keeps them sharp.
    keep(i_ring, j_seg) -> bool can exclude faces (e.g. the nose or the underside)."""
    me = ob.data
    bm = bmesh.new()
    bm.from_mesh(me)
    bm.faces.ensure_lookup_table()
    pick = []
    for f in bm.faces:
        if len(f.verts) != 4:
            continue
        i, j = divmod(f.index, segs)
        if i >= rings:
            continue
        if i % skip_row == 0 or j % skip_col == 0:
            continue
        if keep and not keep(i, j):
            continue
        pick.append(f)
    before = set(e.index for e in bm.edges)
    bmesh.ops.inset_individual(bm, faces=pick, thickness=thickness, depth=-depth, use_even_offset=True)
    bm.edges.index_update()
    new_edges = [e.index for e in bm.edges if e.index not in before]
    bm.to_mesh(me)
    bm.free()
    _crease_edges(me, new_edges, 0.85)
    return ob


def weighted_normals(ob):
    m = ob.modifiers.new('WeightedNormal', 'WEIGHTED_NORMAL')
    m.keep_sharp = True
    return m


def window_material():
    """Warm crew windows: not a palette material, so it keeps its own glow in game."""
    return material('WINDOW_WARM', (0.05, 0.04, 0.03), 0.0, 0.6, emit=(1.0, 0.72, 0.38))


def windows(name, points, size, mat):
    """A row of small lit windows at the given points (scale cue)."""
    obs = []
    for i, p in enumerate(points):
        obs.append(box('%s_%d' % (name, i), size, p, mat))
    return obs


def vent_grille(name, loc, w, l, slots, mat_frame, mat_slot, rot=(0, 0, 0)):
    """A framed vent: a recessed panel with evenly spaced slats."""
    frame = box(name + '_frame', (w, l, 0.06), loc, mat_frame, rot)
    bevel(frame, 0.015, 1, 40)
    slat = box(name + '_slat', (w * 0.82, l / (slots * 2.2), 0.08), (loc[0], loc[1] + l * 0.4, loc[2] + 0.02), mat_slot, rot)
    array(slat, slots, (0, -l * 0.8 / max(1, slots - 1), 0))
    return frame


def conduit(name, points, r, mat, clamps=0, clamp_mat=None):
    """A pipe run along the hull with optional clamps: purposeful surface detail."""
    pipe = tube(name, points, [r] * len(points), mat, bevel_res=3)
    for k in range(clamps):
        p = points[min(len(points) - 1, 1 + k * max(1, (len(points) - 2) // max(1, clamps)))]
        cylinder(name + '_clamp', r * 1.7, r * 1.6, p, clamp_mat or mat, segs=10)
    return pipe


def sensor_mast(name, base, height, mat, glow_mat, dish=0.0):
    mast = cylinder(name, 0.05, height, (base[0], base[1], base[2] + height / 2), mat, segs=8, rot=(0, 0, 0), r2=0.03)
    tip = sphere(name + '_tip', 0.09, (base[0], base[1], base[2] + height), glow_mat, 10)
    if dish:
        d = cylinder(name + '_dish', dish, dish * 0.18, (base[0], base[1], base[2] + height * 0.6), mat, segs=20, rot=(math.radians(60), 0, 0), r2=dish * 0.25)
        return mast, tip, d
    return mast, tip


# ---------------------------------------------------------------- texture baking
#
# Bake a unique texture set for a hero hull, the way hand-textured ships get their life:
#   base colour (with crevice shadow and grime), roughness, metalness, a detail normal map and emission.
# Each palette material is given a procedural "look" (edge wear from Cycles pointiness, cavity grime from
# ambient occlusion, plate-to-plate variation from Voronoi cells, panel lines and grain as bump), then
# everything is baked into one UV atlas and the hull gets a single BAKED material the game keeps as authored.

def _nodes(mat):
    mat.use_nodes = True
    nt = mat.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    return nt, nt.nodes, nt.links


def _look(mat, kind, look):
    """Replace a palette material's nodes with its procedural look. kind: HULL, TRIM, GOLD, GLOW, WINDOW."""
    nt, N, Lk = _nodes(mat)
    out = N.new('ShaderNodeOutputMaterial')
    bsdf = N.new('ShaderNodeBsdfPrincipled')
    Lk.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    tex = N.new('ShaderNodeTexCoord')
    geo = N.new('ShaderNodeNewGeometry')
    ao = N.new('ShaderNodeAmbientOcclusion'); ao.inputs['Distance'].default_value = look.get('ao_dist', 0.6); ao.samples = 8

    def mix(a, b, fac, blend='MIX'):
        m = N.new('ShaderNodeMix'); m.data_type = 'RGBA'; m.blend_type = blend
        Lk.new(fac, m.inputs['Factor']) if not isinstance(fac, (int, float)) else m.inputs['Factor'].__setattr__('default_value', fac)
        for sock, v in ((m.inputs[6], a), (m.inputs[7], b)):
            if isinstance(v, tuple): sock.default_value = (*v, 1)
            else: Lk.new(v, sock)
        return m.outputs[2]

    def ramp(src, lo, hi):
        r = N.new('ShaderNodeMapRange'); r.inputs['From Min'].default_value = lo; r.inputs['From Max'].default_value = hi; r.clamp = True
        Lk.new(src, r.inputs['Value'])
        return r.outputs['Result']

    def noise(scale, detail=6, rough=0.55, dist=0.0):
        n = N.new('ShaderNodeTexNoise'); n.inputs['Scale'].default_value = scale; n.inputs['Detail'].default_value = detail
        n.inputs['Roughness'].default_value = rough; n.inputs['Distortion'].default_value = dist
        Lk.new(tex.outputs['Object'], n.inputs['Vector'])
        return n

    if kind in ('GLOW', 'WINDOW'):
        bsdf.inputs['Base Color'].default_value = (0.02, 0.02, 0.02, 1)
        bsdf.inputs['Emission Color'].default_value = (*look['emit'], 1)
        bsdf.inputs['Emission Strength'].default_value = 1.0
        bsdf.inputs['Roughness'].default_value = 0.4
        return

    base, edge, grime = look['base'], look['edge'], look['grime']
    # Plate-to-plate variation: Voronoi cells nudge the tone of each armour plate.
    vor = N.new('ShaderNodeTexVoronoi'); vor.inputs['Scale'].default_value = look.get('cells', 1.4)
    Lk.new(tex.outputs['Object'], vor.inputs['Vector'])
    cell = ramp(vor.outputs['Color'], 0.0, 1.0) if False else None
    sep = N.new('ShaderNodeSeparateColor'); Lk.new(vor.outputs['Color'], sep.inputs['Color'])
    var = ramp(sep.outputs['Red'], 0.0, 1.0)
    c = mix(base, look.get('base2', base), var)
    # Fine grain and broad mottling.
    mot = noise(look.get('mottle', 3.0))
    c = mix(c, look.get('mottle_col', base), ramp(mot.outputs['Fac'], 0.45, 0.75))
    # Cavity grime from occlusion, and edge wear from curvature (pointiness).
    cav = ramp(ao.outputs['AO'], look.get('cav_hi', 0.85), look.get('cav_lo', 0.35))  # 0 open … 1 deep crevice
    c = mix(c, grime, cav)
    wear_n = noise(18.0, 8, 0.7)
    pt = ramp(geo.outputs['Pointiness'], look.get('edge_lo', 0.5), look.get('edge_hi', 0.56))
    wearf = N.new('ShaderNodeMath'); wearf.operation = 'MULTIPLY'
    Lk.new(pt, wearf.inputs[0]); Lk.new(ramp(wear_n.outputs['Fac'], 0.35, 0.6), wearf.inputs[1])
    c = mix(c, edge, wearf.outputs['Value'])
    Lk.new(c, bsdf.inputs['Base Color'])
    # Roughness: base, rougher in grime, polished on worn edges, a little noise.
    rr = N.new('ShaderNodeMath'); rr.operation = 'MULTIPLY_ADD'
    Lk.new(ramp(mot.outputs['Fac'], 0.3, 0.7), rr.inputs[0]); rr.inputs[1].default_value = 0.15; rr.inputs[2].default_value = look['rough']
    r2 = N.new('ShaderNodeMath'); r2.operation = 'MULTIPLY_ADD'
    Lk.new(cav, r2.inputs[0]); r2.inputs[1].default_value = 0.3; Lk.new(rr.outputs['Value'], r2.inputs[2])
    r3 = N.new('ShaderNodeMath'); r3.operation = 'MULTIPLY_ADD'
    Lk.new(wearf.outputs['Value'], r3.inputs[0]); r3.inputs[1].default_value = -0.25; Lk.new(r2.outputs['Value'], r3.inputs[2])
    Lk.new(r3.outputs['Value'], bsdf.inputs['Roughness'])
    bsdf.inputs['Metallic'].default_value = look['metal']
    # Detail normal: panel lines from Voronoi edges plus fine grain.
    pl = N.new('ShaderNodeTexVoronoi'); pl.feature = 'DISTANCE_TO_EDGE'; pl.inputs['Scale'].default_value = look.get('panels', 2.2)
    Lk.new(tex.outputs['Object'], pl.inputs['Vector'])
    lines = ramp(pl.outputs['Distance'], 0.0, 0.035)
    grain = noise(60.0, 4, 0.5)
    h = N.new('ShaderNodeMath'); h.operation = 'MULTIPLY_ADD'
    Lk.new(grain.outputs['Fac'], h.inputs[0]); h.inputs[1].default_value = 0.08; Lk.new(lines, h.inputs[2])
    bump = N.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = look.get('bump', 0.35); bump.inputs['Distance'].default_value = 0.02
    Lk.new(h.outputs['Value'], bump.inputs['Height'])
    Lk.new(bump.outputs['Normal'], bsdf.inputs['Normal'])


def _bake_target(mat, img):
    nt = mat.node_tree
    for n in nt.nodes:
        n.select = False
    node = nt.nodes.new('ShaderNodeTexImage')
    node.image = img
    node.select = True
    nt.nodes.active = node
    return node


def bake_textures(looks, size=1024, samples=12, name='HullBaked'):
    """Join all meshes, unwrap one atlas, bake the procedural looks, and swap in one BAKED material.
    looks: {palette name: dict(base, edge, grime, rough, metal, ...) or dict(emit=...)}."""
    scene = bpy.context.scene
    meshes = [o for o in scene.objects if o.type == 'MESH']
    for o in scene.objects:
        o.select_set(False)
    for o in meshes:
        o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.convert(target='MESH')
    meshes = [o for o in scene.objects if o.type == 'MESH']
    for o in meshes:
        o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.join()
    hull = bpy.context.view_layer.objects.active
    hull.name = name
    # One atlas for the whole hull.
    me = hull.data
    while me.uv_layers:
        me.uv_layers.remove(me.uv_layers[0])
    me.uv_layers.new(name='atlas')
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.004, area_weight=0.0, scale_to_bounds=True)
    bpy.ops.object.mode_set(mode='OBJECT')
    # Looks on every palette slot.
    for slot in hull.material_slots:
        m = slot.material
        key = next((k for k in looks if m.name.upper().startswith(k)), None)
        if key:
            _look(m, 'GLOW' if 'emit' in looks[key] and key.startswith('GLOW') else ('WINDOW' if 'emit' in looks[key] else key), looks[key])
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = samples
    scene.render.bake.margin = 6
    imgs = {}
    def bake(kind, label, colorspace='sRGB', **kw):
        img = bpy.data.images.new(f'{name}_{label}', size, size, alpha=False, float_buffer=False)
        img.colorspace_settings.name = colorspace
        added = [(s.material, _bake_target(s.material, img)) for s in hull.material_slots]
        bpy.ops.object.bake(type=kind, **kw)
        for m, n in added:
            m.node_tree.nodes.remove(n)
        imgs[label] = img
        return img
    # Cycles' diffuse colour of a metal is near black: bake colour with metalness off, restore after.
    saved = {}
    for sl in hull.material_slots:
        b = sl.material.node_tree.nodes.get('Principled BSDF')
        if b:
            saved[sl.material.name] = b.inputs['Metallic'].default_value
            b.inputs['Metallic'].default_value = 0.0
    bake('DIFFUSE', 'base', pass_filter={'COLOR'})
    for sl in hull.material_slots:
        b = sl.material.node_tree.nodes.get('Principled BSDF')
        if b and sl.material.name in saved:
            b.inputs['Metallic'].default_value = saved[sl.material.name]
    bake('ROUGHNESS', 'rough', 'Non-Color')
    bake('NORMAL', 'normal', 'Non-Color')
    bake('EMIT', 'emit')
    bake('AO', 'ao', 'Non-Color')
    # Metalness: temporarily make every material emit its metal value, then bake emission.
    for s in hull.material_slots:
        b = s.material.node_tree.nodes.get('Principled BSDF')
        if b:
            met = b.inputs['Metallic'].default_value
            b.inputs['Emission Color'].default_value = (met, met, met, 1); b.inputs['Emission Strength'].default_value = 1
    bake('EMIT', 'metal', 'Non-Color')
    # Crevice shadow multiplied into base colour (glTF has no separate AO in our loader path).
    base, ao, metal = imgs['base'], imgs['ao'], imgs['metal']
    bp, ap, mp = list(base.pixels), list(ao.pixels), list(metal.pixels)
    for i in range(0, len(bp), 4):
        k = 0.5 + 0.5 * ap[i]
        k = k + (1 - k) * max(0.0, (mp[i] - 0.8) / 0.2)  # pure metal (gold) keeps its colour
        bp[i] *= k; bp[i + 1] *= k; bp[i + 2] *= k
    base.pixels = bp
    # Final authored material.
    final = bpy.data.materials.new('BAKED_HULL')
    nt, N, Lk = _nodes(final)
    out = N.new('ShaderNodeOutputMaterial'); b = N.new('ShaderNodeBsdfPrincipled')
    Lk.new(b.outputs['BSDF'], out.inputs['Surface'])
    def img_node(label):
        n = N.new('ShaderNodeTexImage'); n.image = imgs[label]; return n
    Lk.new(img_node('base').outputs['Color'], b.inputs['Base Color'])
    Lk.new(img_node('rough').outputs['Color'], b.inputs['Roughness'])
    Lk.new(img_node('metal').outputs['Color'], b.inputs['Metallic'])
    nm = N.new('ShaderNodeNormalMap'); Lk.new(img_node('normal').outputs['Color'], nm.inputs['Color']); Lk.new(nm.outputs['Normal'], b.inputs['Normal'])
    Lk.new(img_node('emit').outputs['Color'], b.inputs['Emission Color']); b.inputs['Emission Strength'].default_value = 4.0
    me.materials.clear()
    me.materials.append(final)
    import os
    outdir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out')
    for label, img in imgs.items():
        img.filepath_raw = os.path.join(outdir, f'{name}_{label}.png'); img.file_format = 'PNG'; img.save()
        img.pack()
    return hull


# ---------------------------------------------------------------- refined parts (shared by every hull)

def wedge(name, size, loc, mat, slope=0.45, rot=(0, 0, 0), back=0.0):
    """Armour block with a sloped glacis: the top front edge is pulled back (and optionally the top rear)."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x *= size[0]; v.co.y *= size[1]; v.co.z *= size[2]
        if v.co.z > 0 and v.co.y > 0:
            v.co.y -= size[1] * slope
        if back and v.co.z > 0 and v.co.y < 0:
            v.co.y += size[1] * back
    ob = obj_from_bmesh(name, bm, mat)
    ob.location = loc
    ob.rotation_euler = rot
    return ob


def turret(name, loc, M, scale=1.0, barrels=2, up=0.0):
    """Blockout turret: base ring, sloped housing, mantlet, barrels with shrouds, muzzle brakes and
    hollow bores. Points +Y; 'up' turns its mounting face around the Y axis (0 = mounted on top)."""
    s = scale
    root = empty(name, loc)
    root.rotation_euler = (0, up, 0)
    parts = [
        cylinder(name + '_base', 1.15 * s, 0.4 * s, (0, 0, 0.2 * s), M['TRIM'], segs=32, rot=(0, 0, 0)),
        torus(name + '_race', 1.15 * s, 0.07 * s, (0, 0, 0.42 * s), M['HULL'], segs=40, rsegs=8),
        wedge(name + '_housing', (1.8 * s, 2.1 * s, 0.95 * s), (0, -0.1 * s, 0.85 * s), M['HULL'], slope=0.4, back=0.2),
        wedge(name + '_mantlet', (1.3 * s, 0.6 * s, 0.7 * s), (0, 1.05 * s, 0.8 * s), M['TRIM'], slope=0.25),
    ]
    xs = [0.0] if barrels == 1 else [(-0.32 + 0.64 * i / (barrels - 1)) * s for i in range(barrels)]
    for i, x in enumerate(xs):
        parts += [
            cylinder(f'{name}_shroud{i}', 0.22 * s, 0.9 * s, (x, 1.75 * s, 0.82 * s), M['TRIM'], segs=16),
            cylinder(f'{name}_barrel{i}', 0.13 * s, 2.5 * s, (x, 3.2 * s, 0.82 * s), M['TRIM'], segs=16),
            cylinder(f'{name}_brake{i}', 0.19 * s, 0.45 * s, (x, 4.45 * s, 0.82 * s), M['TRIM'], segs=16),
            cylinder(f'{name}_bore{i}', 0.09 * s, 0.06 * s, (x, 4.69 * s, 0.82 * s), M['CORE'], segs=12),
        ]
    for p in parts:
        parent(p, root)
    return root


def nozzle(name, loc, r, length, M, glow='FIRE'):
    """Deep engine bell: hollow flared shell, lip ring, the glow sunk well inside. Mouth faces -Y."""
    root = empty(name, loc)
    bell = cylinder(name + '_bell', r * 0.82, length, (0, 0, 0), M['TRIM'], segs=32, r2=r * 1.08)
    bm = bmesh.new()
    bm.from_mesh(bell.data)
    caps = [f for f in bm.faces if len(f.verts) > 4]
    bmesh.ops.delete(bm, geom=caps, context='FACES_ONLY')
    bm.to_mesh(bell.data)
    bm.free()
    solidify(bell, r * 0.12)
    smooth(bell)
    parts = [
        bell,
        torus(name + '_lip', r * 1.1, r * 0.09, (0, -length / 2, 0), M['TRIM'], rot=(math.pi / 2, 0, 0), segs=40, rsegs=8),
        cylinder(name + '_back', r * 0.86, r * 0.2, (0, length / 2, 0), M['TRIM'], segs=32),
        cylinder(name + '_glow', r * 0.8, r * 0.05, (0, length * 0.25, 0), M[glow], segs=32),
        cylinder(name + '_cone', r * 0.32, length * 0.5, (0, length * 0.05, 0), M['TRIM'], segs=24, r2=r * 0.05),
    ]
    for p in parts:
        parent(p, root)
    return root


def finish(skip=('core', 'singularity'), round_parts=('lip', 'fire', 'seam', 'vein', 'edge', 'claw', 'antenna', 'race', 'lights', 'lamps', 'conduit', 'glow', 'rail', 'band')):
    """Hard-surface finishing on every mesh: bevel the hard edges and weight the normals, so nothing
    reads as a raw primitive. Smooth curved parts keep their shape (angle-limited bevel)."""
    for ob in list(bpy.context.scene.objects):
        if ob.type != 'MESH' or any(ob.name.startswith(k) for k in skip):
            continue
        if not any(m.type == 'BEVEL' for m in ob.modifiers) and not any(r in ob.name for r in round_parts):
            dims = sorted(ob.dimensions)
            w = max(0.015, min(0.09, dims[0] * 0.08 if dims[0] > 0 else 0.03))
            # Small parts get a single-segment chamfer: it catches light just as well at a fraction of the triangles.
            bevel(ob, w, 1 if dims[2] < 1.5 else 2, 30)
        if not any(m.type == 'WEIGHTED_NORMAL' for m in ob.modifiers):
            weighted_normals(ob)
        smooth(ob)
        # Hard edges stay hard (Blender 5 has no auto smooth): sharp by angle, kept by the normals.
        if not any(r in ob.name for r in round_parts) and not ob.name.startswith(('body', 'spine', 'event', 'star')):
            ob.data.set_sharp_from_angle(angle=math.radians(38))


def scatter_windows(rows=(-0.12, 0.02, 0.16), step=5.0, gap=0.28, size=(0.3, 2.0, 1.2), seed=7,
                    skip=('core', 'singularity', 'star', 'fire', 'glow', 'ring', 'lip', 'seam', 'tooth', 'jaw', 'vane', 'blade', 'nozzle')):
    """Real-metre scale cues: rows of lit windows cast onto the hull flanks (2 m by default, every `step`
    metres, some dark), joined into one mesh. Density in metres is what makes a big hull read as big."""
    import random
    from mathutils import Vector
    rnd = random.Random(seed)
    scene = bpy.context.scene
    dg = bpy.context.evaluated_depsgraph_get()
    obs = [o for o in scene.objects if o.type == 'MESH']
    pts = [o.matrix_world @ Vector(c) for o in obs for c in o.bound_box]
    mn = Vector([min(p[i] for p in pts) for i in range(3)])
    mx = Vector([max(p[i] for p in pts) for i in range(3)])
    h = mx.z - mn.z
    bm = bmesh.new()
    n = 0
    # Windows come in runs (decks with lit rooms), not a grid: each row toggles between lit runs and
    # dark stretches of random length, and rows are offset from each other.
    runs = {}
    y = mn.y + step
    while y < mx.y - step:
        for side in (-1, 1):
            for frac in rows:
                key = (side, frac)
                lit, left = runs.get(key, (rnd.random() < 0.5, rnd.randint(1, 6)))
                left -= 1
                if left <= 0:
                    lit = not lit
                    left = rnd.randint(3, 9) if lit else rnd.randint(2, 7)
                runs[key] = (lit, left)
                if not lit or rnd.random() < gap * 0.3:
                    continue
                o = Vector((side * (max(abs(mx.x), abs(mn.x)) + 20), y, (mn.z + mx.z) / 2 + frac * h))
                hit, loc, nrm, _, ob, _ = scene.ray_cast(dg, o, Vector((-side, 0, 0)))
                if not hit or any(k in ob.name.lower() for k in skip) or abs(nrm.x) < 0.5:
                    continue
                c = loc + nrm * (size[0] * 0.4)
                g = bmesh.ops.create_cube(bm, size=1.0)
                for v in g['verts']:
                    v.co = Vector((c.x + v.co.x * size[0], c.y + v.co.y * size[1], c.z + v.co.z * size[2]))
                n += 1
        y += step
    me = bpy.data.meshes.new('windows')
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new('windows', me)
    ob.data.materials.append(window_material())
    scene.collection.objects.link(ob)
    return n


def light_strip(name, a, b, every, radius, mat):
    """Running lights in a line from a to b, one every `every` metres (spheres joined into one mesh)."""
    from mathutils import Vector
    a, b = Vector(a), Vector(b)
    d = (b - a).length
    bm = bmesh.new()
    k = max(1, int(d / every))
    for i in range(k + 1):
        p = a.lerp(b, i / k)
        g = bmesh.ops.create_uvsphere(bm, u_segments=6, v_segments=3, radius=radius)
        for v in g['verts']:
            v.co += p
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    ob.data.materials.append(mat)
    bpy.context.scene.collection.objects.link(ob)
    return ob


# ---------------------------------------------------------------- pass 2: hand-made depth
#
# The tools that make a hull read as hand-built instead of lofted: limbs made of overlapping faceted
# armour sleeves (not soft tubes), machinery living in the gaps between plates, structural rings made
# of armour blocks, armoured drive cowls, and windows that only sit where crew would be.

def _catmull(pts, n_per):
    """Smooth path through pts (Catmull-Rom), n_per samples per span, plus the parameter of each sample."""
    from mathutils import Vector
    P = [Vector(p) for p in pts]
    P = [P[0] * 2 - P[1]] + P + [P[-1] * 2 - P[-2]]
    out, us = [], []
    spans = len(pts) - 1
    for i in range(spans):
        p0, p1, p2, p3 = P[i], P[i + 1], P[i + 2], P[i + 3]
        for j in range(n_per):
            t = j / n_per
            t2, t3 = t * t, t * t * t
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
            us.append((i + t) / spans)
    out.append(P[-2].copy()); us.append(1.0)
    return out, us


def _frames(path, up):
    """Parallel-transport frames along a path: (tangent, side, up) per point."""
    from mathutils import Vector
    T = []
    for i in range(len(path)):
        a, b = path[max(0, i - 1)], path[min(len(path) - 1, i + 1)]
        T.append((b - a).normalized())
    U = Vector(up)
    U = (U - T[0] * U.dot(T[0])).normalized()
    out = []
    for i, t in enumerate(T):
        if i:
            U = (U - t * U.dot(t)).normalized()
        out.append((t, t.cross(U).normalized(), U.copy()))
    return out


class Limb:
    """A sampled limb path: position, radius and frame at any u (0 root … 1 tip), for placing details."""
    def __init__(self, path, us, radii, frames):
        self.path, self.us, self.radii, self.frames = path, us, radii, frames

    def at(self, u):
        i = min(range(len(self.us)), key=lambda k: abs(self.us[k] - u))
        return self.path[i], self.radii[i], self.frames[i]


def limb(name, pts, radii, mat, core_mat=None, sides=6, squash=0.78, plates=8, up=(0, 0, 1), overlap=0.35,
         flare=1.16, tip=2.6, twist=0.0, n_per=10):
    """An armoured limb: `plates` overlapping faceted sleeves along a smooth path, each flaring at its
    tip-ward edge over the next (like a lobster's tail), a dark core under them, and a faceted fang tip.
    radii: one per point. Returns (object, Limb) for placing teeth, spines and seams."""
    from mathutils import Vector
    path, us = _catmull(pts, n_per)
    R = []
    for u in us:
        x = u * (len(radii) - 1)
        i = min(len(radii) - 2, int(x))
        f = x - i
        R.append(radii[i] * (1 - f) + radii[i + 1] * f)
    fr = _frames(path, up)
    L = Limb(path, us, R, fr)

    def ring(bm, u, k_r):
        p, r, (t, sd, upv) = L.at(u)
        # interpolate exactly between samples for smooth plate edges
        x = u * (len(path) - 1)
        i = min(len(path) - 2, int(x)); f = x - i
        p = path[i].lerp(path[i + 1], f)
        r = (R[i] * (1 - f) + R[i + 1] * f) * k_r
        t, sd, upv = fr[i]
        out = []
        for j in range(sides):
            a = j / sides * math.tau + math.pi / sides + twist
            out.append(bm.verts.new(p + sd * (math.cos(a) * r) + upv * (math.sin(a) * r * squash)))
        return out

    bm = bmesh.new()
    seg = 1.0 / plates
    for kk in range(plates):
        u0 = kk * seg
        u1 = min(1.0, (kk + 1 + overlap) * seg)
        last = kk == plates - 1
        if last:
            u1 = 1.0
        # rings: tucked start, body, flared lip (or the fang for the last plate)
        prof = [(u0, 0.9), (u0 + (u1 - u0) * 0.12, 1.0), (u0 + (u1 - u0) * 0.78, 1.04)]
        prof += [(u1, 0.55)] if last else [(u1 - (u1 - u0) * 0.04, flare), (u1, flare * 0.9)]
        rings = [ring(bm, u, k) for u, k in prof]
        for A, B in zip(rings, rings[1:]):
            for j in range(sides):
                jn = (j + 1) % sides
                bm.faces.new((A[j], A[jn], B[jn], B[j]))
        bm.faces.new(list(reversed(rings[0])))
        if last:
            # Faceted fang: extend along the tangent to a point.
            p, r, (t, sd, upv) = L.at(1.0)
            apex = bm.verts.new(p + t * r * tip)
            for j in range(sides):
                bm.faces.new((rings[-1][j], rings[-1][(j + 1) % sides], apex))
        else:
            bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = obj_from_bmesh(name, bm, mat)
    bevel(ob, max(0.02, min(R) * 0.05), 1, 30)
    weighted_normals(ob)
    if core_mat:
        core = tube(name + '_core', [tuple(p) for p in pts], [r * 0.8 for r in radii], core_mat, bevel_res=1, res=4)
    return ob, L


def surf(sections, length, y0, t, a, scale=1.0):
    """Point and outward normal on a superellipse loft at loft t and section angle a."""
    from mathutils import Vector
    def P(t_, a_):
        w, top, bottom, n, zo = sections(t_)
        c, s = math.cos(a_), math.sin(a_)
        x = w * scale * math.copysign(abs(c) ** (2 / n), c)
        z = (top if s >= 0 else bottom) * scale * math.copysign(abs(s) ** (2 / n), s)
        return Vector((x, y0 - t_ * length, z + zo))
    p = P(t, a)
    du = P(min(1, t + 0.002), a) - P(max(0, t - 0.002), a)
    da = P(t, a + 0.01) - P(t, a - 0.01)
    nrm = da.cross(du).normalized()
    if nrm.dot(p - Vector((0, p.y, 0))) < 0:
        nrm = -nrm
    return p, nrm


def _place(bm, size, center, X, Y, Z, kind='box', segs=8):
    """Add a box or a cylinder (axis along Y) to bm in the local frame X, Y, Z (unit vectors)."""
    if kind == 'box':
        g = bmesh.ops.create_cube(bm, size=1.0)
        for v in g['verts']:
            c = v.co.copy()
            v.co = center + X * (c.x * size[0]) + Y * (c.y * size[1]) + Z * (c.z * size[2])
    else:
        g = bmesh.ops.create_cone(bm, cap_ends=True, segments=segs, radius1=0.5, radius2=0.5, depth=1.0)
        for v in g['verts']:
            c = v.co.copy()
            v.co = center + X * (c.x * size[0]) + Y * (c.z * size[1]) + Z * (c.y * size[2])


def machinery(name, sections, length, y0, t0, t1, a0, a1, M, count=40, h=2.0, seed=1, scale=1.0):
    """Machinery in a band of hull surface (the gaps between armour plates): stacked equipment
    boxes, tanks lying along the hull, pipe runs with clamps, vent blocks, small dishes.
    h is the typical height in metres. Joined into one mesh per material."""
    import random
    from mathutils import Vector
    rnd = random.Random(seed)
    bms = {k: bmesh.new() for k in ('HULL', 'TRIM', 'GOLD')}
    for _ in range(count):
        t = t0 + (t1 - t0) * rnd.random()
        a = a0 + (a1 - a0) * rnd.random()
        p, N = surf(sections, length, y0, t, a, scale)
        Yv = Vector((0, -1, 0))
        Xv = Yv.cross(N).normalized()
        Yv = N.cross(Xv).normalized()
        kind = rnd.random()
        s = h * (0.5 + rnd.random())
        if kind < 0.4:      # equipment stack
            w, l = s * (0.8 + rnd.random()), s * (1.2 + rnd.random() * 2)
            _place(bms['TRIM' if rnd.random() < 0.6 else 'HULL'], (w, l, s * 0.6), p + N * s * 0.3, Xv, Yv, N)
            if rnd.random() < 0.6:
                _place(bms['HULL'], (w * 0.6, l * 0.5, s * 0.4), p + N * s * 0.75 + Yv * l * 0.15, Xv, Yv, N)
        elif kind < 0.62:   # tank along the hull
            r, l = s * 0.45, s * (2 + rnd.random() * 2)
            _place(bms['TRIM'], (r * 2, l, r * 2), p + N * r, Xv, Yv, N, 'cyl', 10)
            for k in (-0.35, 0.35):
                _place(bms['GOLD'], (r * 2.2, s * 0.12, r * 2.2), p + N * r + Yv * l * k, Xv, Yv, N, 'cyl', 10)
        elif kind < 0.82:   # pipe run with clamps
            r, l = s * 0.12, s * (4 + rnd.random() * 5)
            off = Xv * s * 0.3
            for q in (-1, 1):
                _place(bms['TRIM'], (r * 2, l, r * 2), p + N * r * 1.2 + off * q, Xv, Yv, N, 'cyl', 6)
            for k in (-0.4, 0.0, 0.4):
                _place(bms['HULL'], (s * 0.9, s * 0.15, r * 3), p + N * r * 1.2 + Yv * l * k, Xv, Yv, N)
        elif kind < 0.94:   # vent block
            w, l = s * 1.2, s * 1.4
            _place(bms['HULL'], (w, l, s * 0.3), p + N * s * 0.15, Xv, Yv, N)
            for k in range(4):
                _place(bms['TRIM'], (w * 0.8, l * 0.08, s * 0.1), p + N * s * 0.33 + Yv * l * (-0.3 + k * 0.2), Xv, Yv, N)
        else:               # small dish on a stalk
            _place(bms['TRIM'], (s * 0.2, s * 0.2, s * 1.2), p + N * s * 0.6, Xv, Yv, N)
            _place(bms['HULL'], (s * 1.1, s * 0.25, s * 1.1), p + N * s * 1.25, Xv, N, Yv, 'cyl', 12)
    obs = []
    for k, bm in bms.items():
        if not bm.verts:
            bm.free()
            continue
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)   # mirrored frames would leave parts inside out
        ob = obj_from_bmesh(f'{name}_{k.lower()}', bm, M[k])
        bevel(ob, max(0.02, h * 0.03), 1, 30)
        weighted_normals(ob)
        obs.append(ob)
    return obs


def armour_ring(name, R, thick, depth, loc, M, rot=(0, 0, 0), blocks=16, gap=0.12, glow=True):
    """A structural ring: a faceted core band carrying armour blocks with gaps, gold rails at both
    faces and a glowing inner seam. Axis is local Z (rotate it to lean)."""
    from mathutils import Matrix, Vector
    parts = [torus(name + '_band', R, thick * 0.55, (0, 0, 0), M['TRIM'], segs=blocks * 4, rsegs=6, taper=0)]
    bm = bmesh.new()
    for i in range(blocks):
        a0 = i / blocks * math.tau
        a1 = (i + 1 - gap) / blocks * math.tau
        verts = []
        for a in (a0, a1):
            for rr, zz in ((R - thick * 0.55, -depth / 2), (R + thick, -depth * 0.42), (R + thick, depth * 0.42), (R - thick * 0.55, depth / 2)):
                verts.append(bm.verts.new((rr * math.cos(a), rr * math.sin(a), zz)))
        A, B = verts[:4], verts[4:]
        for j in range(4):
            jn = (j + 1) % 4
            bm.faces.new((A[j], A[jn], B[jn], B[j]))
        bm.faces.new(list(reversed(A))); bm.faces.new(B)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    blk = obj_from_bmesh(name + '_blocks', bm, M['HULL'])
    bevel(blk, thick * 0.08, 1, 30)
    parts.append(blk)
    for zz in (-depth * 0.46, depth * 0.46):
        parts.append(torus(name + '_rail', R + thick * 1.02, thick * 0.07, (0, 0, zz), M['GOLD'], segs=blocks * 6, rsegs=6, taper=0))
    if glow:
        parts.append(torus(name + '_seam', R - thick * 0.5, thick * 0.12, (0, 0, 0), M['GLOW'], segs=blocks * 6, rsegs=6, taper=0))
    for p in parts:
        p.location = loc
        p.rotation_euler = rot
    return parts


def cowl(name, loc, r, length, M, sides=8, fins_n=12):
    """An armoured drive cowl around a nozzle: an octagonal shroud with a chamfered lip and
    radial heat-sink fins at its root. Axis along Y, mouth toward -Y."""
    parts = []
    bm = bmesh.new()
    rings = []
    for y, rr in ((length * 0.5, r * 1.18), (-length * 0.3, r * 1.3), (-length * 0.5, r * 1.22)):
        rings.append([bm.verts.new((rr * math.cos(a), y, rr * math.sin(a))) for a in (j / sides * math.tau + math.pi / sides for j in range(sides))])
    inner = [[bm.verts.new((r * 1.1 * math.cos(a), y, r * 1.1 * math.sin(a))) for a in (j / sides * math.tau + math.pi / sides for j in range(sides))] for y in (-length * 0.5, length * 0.5)]
    seq = rings + inner + [rings[0]]
    for A, B in zip(seq, seq[1:]):
        for j in range(sides):
            jn = (j + 1) % sides
            bm.faces.new((A[j], A[jn], B[jn], B[j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    sh = obj_from_bmesh(name + '_shroud', bm, M['HULL'])
    bevel(sh, r * 0.04, 1, 30)
    sh.location = loc
    parts.append(sh)
    bm = bmesh.new()
    for i in range(fins_n):
        a = i / fins_n * math.tau
        g = bmesh.ops.create_cube(bm, size=1.0)
        for v in g['verts']:
            c = v.co.copy()
            x, z = c.x * r * 0.06, c.z * r * 0.32 + r * 1.45
            v.co = (loc[0] + x * math.cos(a) - z * math.sin(a), loc[1] + length * 0.38 + c.y * length * 0.22, loc[2] + x * math.sin(a) + z * math.cos(a))
    parts.append(obj_from_bmesh(name + '_fins', bm, M['TRIM']))
    return parts


def deck_windows(targets, rows, step, size, seed=7, side_only=True):
    """Lit windows cast only onto the named target objects (inner hull, deckhouses), in deck runs.
    targets: name prefixes; rows: heights as fractions of the hull height; step: metres."""
    import random
    from mathutils import Vector
    rnd = random.Random(seed)
    scene = bpy.context.scene
    dg = bpy.context.evaluated_depsgraph_get()
    obs = [o for o in scene.objects if o.type == 'MESH']
    pts = [o.matrix_world @ Vector(c) for o in obs for c in o.bound_box]
    mn = Vector([min(p[i] for p in pts) for i in range(3)])
    mx = Vector([max(p[i] for p in pts) for i in range(3)])
    h = mx.z - mn.z
    bm = bmesh.new()
    n = 0
    runs = {}
    y = mn.y + step
    while y < mx.y - step:
        for side in (-1, 1):
            for frac in rows:
                key = (side, frac)
                lit, left = runs.get(key, (rnd.random() < 0.4, rnd.randint(1, 6)))
                left -= 1
                if left <= 0:
                    lit = not lit
                    left = rnd.randint(2, 7) if lit else rnd.randint(4, 12)
                runs[key] = (lit, left)
                if not lit or rnd.random() < 0.15:
                    continue
                o = Vector((side * (max(abs(mx.x), abs(mn.x)) + 20), y, (mn.z + mx.z) / 2 + frac * h))
                hit, loc, nrm, _, ob, _ = scene.ray_cast(dg, o, Vector((-side, 0, 0)))
                if not hit or not any(ob.name.startswith(t) for t in targets) or abs(nrm.x) < 0.55:
                    continue
                c = loc + nrm * (size[0] * 0.3)
                g = bmesh.ops.create_cube(bm, size=1.0)
                for v in g['verts']:
                    v.co = Vector((c.x + v.co.x * size[0], c.y + v.co.y * size[1], c.z + v.co.z * size[2]))
                n += 1
        y += step
    me = bpy.data.meshes.new('windows')
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new('windows', me)
    ob.data.materials.append(window_material())
    scene.collection.objects.link(ob)
    return n


def plane_kit(name, center, X, Y, N, size, M, count=30, h=1.0, seed=1, tiles=True):
    """Dress a flat face: a layer of flush plate tiles in mixed sizes (cut-armour look), then
    hardware on top (equipment boxes, vent blocks, short clamped pipes, hatches).
    center: face centre; X, Y: unit axes across the face; N: outward normal; size: (width, length)."""
    import random
    from mathutils import Vector
    rnd = random.Random(seed)
    X, Y, N, C = Vector(X).normalized(), Vector(Y).normalized(), Vector(N).normalized(), Vector(center)
    W, Lg = size
    bms = {k: bmesh.new() for k in ('HULL', 'TRIM', 'GOLD')}
    if tiles:
        # Tiles: walk the face in rows of random lengths, leaving thin gaps that read as seams.
        y = -Lg / 2
        while y < Lg / 2 - h * 0.5:
            ly = min(Lg / 2 - y, h * rnd.uniform(3.5, 8.0))
            x = -W / 2
            while x < W / 2 - h * 0.5:
                lx = min(W / 2 - x, h * rnd.uniform(3.5, 9.0))
                if rnd.random() < 0.85:
                    c = C + X * (x + lx / 2) + Y * (y + ly / 2) + N * h * 0.06
                    _place(bms['HULL' if rnd.random() < 0.93 else 'TRIM'], (lx - h * 0.14, ly - h * 0.14, h * 0.1), c, X, Y, N)
                x += lx
            y += ly
    for _ in range(count):
        p = C + X * rnd.uniform(-W / 2, W / 2) * 0.9 + Y * rnd.uniform(-Lg / 2, Lg / 2) * 0.9 + N * h * 0.12
        s = h * (0.5 + rnd.random())
        kind = rnd.random()
        if kind < 0.35:
            w_, l_ = s * (0.8 + rnd.random()), s * (1.2 + rnd.random() * 2)
            _place(bms['TRIM'], (w_, l_, s * 0.5), p + N * s * 0.25, X, Y, N)
            if rnd.random() < 0.5:
                _place(bms['HULL'], (w_ * 0.6, l_ * 0.5, s * 0.35), p + N * s * 0.6, X, Y, N)
        elif kind < 0.55:
            w_, l_ = s * 1.2, s * 1.6
            _place(bms['HULL'], (w_, l_, s * 0.22), p + N * s * 0.11, X, Y, N)
            for q in range(4):
                _place(bms['TRIM'], (w_ * 0.8, l_ * 0.08, s * 0.1), p + N * s * 0.26 + Y * l_ * (-0.3 + q * 0.2), X, Y, N)
        elif kind < 0.75:
            r, l_ = s * 0.12, s * (3 + rnd.random() * 4)
            for qq in (-1, 1):
                _place(bms['TRIM'], (r * 2, l_, r * 2), p + N * r * 1.2 + X * s * 0.25 * qq, X, Y, N, 'cyl', 6)
            for q in (-0.35, 0.35):
                _place(bms['GOLD'], (s * 0.8, s * 0.14, r * 3), p + N * r * 1.2 + Y * l_ * q, X, Y, N)
        elif kind < 0.9:
            _place(bms['TRIM'], (s * 1.4, s * 1.4, s * 0.12), p + N * s * 0.06, X, Y, N)
            _place(bms['GOLD'], (s * 0.3, s * 0.3, s * 0.18), p + N * s * 0.12 + X * s * 0.5, X, Y, N)
        else:
            _place(bms['HULL'], (s * 0.9, s * 0.9, s * 0.4), p + N * s * 0.2, X, Y, N, 'cyl', 8)
    obs = []
    for k, bm in bms.items():
        if not bm.verts:
            bm.free()
            continue
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)   # mirrored frames would leave parts inside out
        ob = obj_from_bmesh(f'{name}_{k.lower()}', bm, M[k])
        bevel(ob, max(0.02, h * 0.03), 1, 30)
        weighted_normals(ob)
        obs.append(ob)
    return obs


def box_kit(name, center, size, M, rot_z=0.0, faces=('top', 'left', 'right'), count=20, h=1.0, seed=1):
    """plane_kit on the faces of an axis box (optionally turned about Z): top, left, right, front, back."""
    from mathutils import Vector
    c, s_ = math.cos(rot_z), math.sin(rot_z)
    X, Y, Z = Vector((c, s_, 0)), Vector((-s_, c, 0)), Vector((0, 0, 1))
    C = Vector(center)
    w, l, ht = size
    obs = []
    for i, f in enumerate(faces):
        if f == 'top':
            obs += plane_kit(f'{name}_t', C + Z * ht / 2, X, Y, Z, (w, l), M, count, h, seed + i)
        elif f in ('left', 'right'):
            sg = -1 if f == 'left' else 1
            obs += plane_kit(f'{name}_{f[0]}', C + X * sg * w / 2, Y, Z, X * sg, (l, ht), M, count // 2, h, seed + i)
        elif f in ('front', 'back'):
            sg = 1 if f == 'front' else -1
            obs += plane_kit(f'{name}_{f[0]}', C + Y * sg * l / 2, X, Z, Y * sg, (w, ht), M, count // 3, h, seed + i)
    return obs
