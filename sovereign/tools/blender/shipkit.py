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


def torus(name, R, r, loc, mat, rot=(0, 0, 0), arc=math.tau, segs=48, rsegs=10):
    bm = bmesh.new()
    rings = []
    steps = segs if arc >= math.tau - 1e-6 else segs + 1
    for i in range(steps):
        a = arc * i / segs
        ring = []
        for j in range(rsegs):
            b = j / rsegs * math.tau
            ring.append(bm.verts.new(((R + r * math.cos(b)) * math.cos(a), (R + r * math.cos(b)) * math.sin(a), r * math.sin(b))))
        rings.append(ring)
    pairs = list(zip(rings, rings[1:])) + ([(rings[-1], rings[0])] if arc >= math.tau - 1e-6 else [])
    for A, B in pairs:
        for j in range(rsegs):
            bm.faces.new((A[j], A[(j + 1) % rsegs], B[(j + 1) % rsegs], B[j]))
    ob = obj_from_bmesh(name, bm, mat)
    ob.location = loc
    ob.rotation_euler = rot
    smooth(ob)
    return ob


def tube(name, points, radii, mat, bevel_res=4):
    """Tapered curve tube through points [(x,y,z)], one radius per point, converted to mesh."""
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
    sp.resolution_u = 7
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


def export(path, tile=4.0):
    for ob in list(bpy.context.scene.objects):
        uv_cube(ob, tile)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_apply=True, export_yup=True,
                              export_materials='EXPORT', export_extras=False)
    tris = 0
    deps = bpy.context.evaluated_depsgraph_get()
    for ob in bpy.context.scene.objects:
        if ob.type == 'MESH':
            me = ob.evaluated_get(deps).to_mesh()
            me.calc_loop_triangles()
            tris += len(me.loop_triangles)
            ob.evaluated_get(deps).to_mesh_clear()
    return tris


def shell_patch(name, sections, length, y0, t0, t1, a0, a1, mat, scale=1.06, lift=0.0, rings=10, segs=14, thickness=0.18, flare=0.25):
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
    for A, B in zip(grid, grid[1:]):
        for j in range(segs):
            bm.faces.new((A[j], A[j + 1], B[j + 1], B[j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = obj_from_bmesh(name, bm, mat)
    solidify(ob, thickness)
    bevel(ob, thickness * 0.35, 2, 30)
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
