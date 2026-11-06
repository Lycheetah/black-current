"""Geometry helpers for Caelorynth's three original hulls, commissioned by Mac.

Blender coordinates: +Y bow, +Z dorsal. Materials are authored PBR and deliberately
keep their names, so the game's palette substitution preserves these finishes.
"""
import math
import bpy
import bmesh
from mathutils import Vector

MATERIAL_LOOKS = {}


def mix(a, b, t):
    return a + (b - a) * t


def mesh(k, name, verts, faces, mat, smooth=True):
    bm = bmesh.new()
    vs = [bm.verts.new(p) for p in verts]
    for face in faces:
        bm.faces.new([vs[i] for i in face])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = k.obj_from_bmesh(name, bm, mat)
    if smooth:
        k.smooth(ob)
    return ob


def block(k, name, size, loc, mat, chamfer=0.1, rot=(0, 0, 0)):
    ob = k.box(name, size, loc, mat, rot)
    if chamfer:
        k.bevel(ob, chamfer, 2)
        k.weighted_normals(ob)
    return ob


def line(k, name, points, radius, mat, smooth=3):
    return k.tube(name, points, [radius] * len(points), mat,
                  bevel_res=1, res=smooth, ends=('round', 'round'))


def oval(k, name, loc, scale, mat, segs=24):
    ob = k.sphere(name, 1, loc, mat, segs)
    ob.scale = scale
    return ob


def ring(k, name, loc, radius, tube, mat, rot=(math.pi / 2, 0, 0), segs=40):
    return k.torus(name, radius, tube, loc, mat, rot=rot, segs=segs, rsegs=6)


def loft(k, name, stations, mat, rings=32, segs=20, loc=(0, 0, 0)):
    """Stations: y, half-width, dorsal height, ventral height, vertical centre."""
    stations = sorted(stations, reverse=True)
    y0, yn = stations[0][0], stations[-1][0]
    section = station_section(stations)
    ob = k.loft(name, y0 - yn, section, rings=rings, segs=segs, mat=mat, y0=y0)
    ob.location = loc
    k.smooth(ob)
    ob.data.set_sharp_from_angle(angle=math.radians(55))
    k.bevel(ob,.045,2,55)
    k.weighted_normals(ob)
    return ob


def station_section(stations):
    stations=sorted(stations,reverse=True)
    y0,yn=stations[0][0],stations[-1][0]
    def section(t):
        y = mix(y0, yn, t)
        for a, b in zip(stations, stations[1:]):
            if a[0] >= y >= b[0]:
                u = (a[0] - y) / max(0.00001, a[0] - b[0])
                u = u * u * (3 - 2 * u)
                w, top, bot, z = [mix(a[i], b[i], u) for i in range(1, 5)]
                return w, top, bot, 3.2, z
        return (*stations[-1][1:4], 3.2, stations[-1][4])

    return section


def citadel(k,name,size,loc,mat,taper=.86):
    w,l,h=size
    cut=min(w,l)*.20
    outline=[(-w/2+cut,l/2),(w/2-cut,l/2),(w/2,l/2-cut),
             (w/2,-l/2+cut),(w/2-cut,-l/2),(-w/2+cut,-l/2),
             (-w/2,-l/2+cut),(-w/2,l/2-cut)]
    verts=[(x,y,-h/2) for x,y in outline]+[(x*taper,y*taper,h/2) for x,y in outline]
    faces=[tuple(reversed(range(8))),tuple(range(8,16))]
    faces += [(i,(i+1)%8,(i+1)%8+8,i+8) for i in range(8)]
    ob=mesh(k,name,verts,faces,mat,smooth=False)
    ob.location=loc
    k.bevel(ob,.14,2)
    k.weighted_normals(ob)
    return ob


def ribbon(k, name, points, widths, depths, mat, sides=10):
    """A curved structural spar with an elliptical section and closed ends."""
    path, us = k._catmull(points, 6)
    old_widths, old_depths = widths, depths
    def interp(values, u):
        v = min(len(values)-1.000001, u*(len(values)-1))
        i = int(v)
        return mix(values[i],values[i+1],v-i)
    points = [tuple(p) for p in path]
    widths = [interp(old_widths,u) for u in us]
    depths = [interp(old_depths,u) for u in us]
    verts, faces = [], []
    for i, p in enumerate(points):
        a = Vector(points[max(0, i - 1)])
        b = Vector(points[min(len(points) - 1, i + 1)])
        tangent = (b - a).normalized()
        cross = tangent.cross(Vector((0, 0, 1)))
        if cross.length < 0.1:
            cross = tangent.cross(Vector((0, 1, 0)))
        cross.normalize()
        up = cross.cross(tangent).normalized()
        for j in range(sides):
            angle = j * math.tau / sides
            v = Vector(p) + cross * math.cos(angle) * widths[i] + up * math.sin(angle) * depths[i]
            verts.append(tuple(v))
    for i in range(len(points) - 1):
        for j in range(sides):
            a = i * sides + j
            b = i * sides + (j + 1) % sides
            faces.append((a, b, b + sides, a + sides))
    faces += [tuple(reversed(range(sides))), tuple((len(points) - 1) * sides + j for j in range(sides))]
    return mesh(k, name, verts, faces, mat)


def nozzle(k, name, x, y, z, radius, shell, dark, glow):
    k.cylinder(name + '_casing', radius, radius * 1.5, (x, y + radius * 0.35, z), shell,
               r2=radius * 1.16, segs=24)
    k.cylinder(name + '_well', radius * 0.82, radius * 0.10, (x, y - radius * 0.43, z), dark, segs=24)
    ring(k, name + '_rim', (x, y - radius * 0.48, z), radius * 0.93, radius * 0.09, shell, segs=32)
    ring(k, name + '_igniter', (x, y - radius * 0.51, z), radius * 0.58, radius * 0.035, glow, segs=32)
    k.empty('ENGINE_' + name.upper(), (x, y - radius * 0.65, z), radius * 0.65)


def marker(k, bank, pos, shell, dark, radius=0.85):
    x, y, z = pos
    k.cylinder('hardpoint_' + bank, radius, 0.18, (x, y, z - 0.08), shell,
               rot=(0, 0, 0), segs=16)
    k.cylinder('recess_' + bank, radius * 0.78, 0.06, (x, y, z + 0.02), dark,
               rot=(0, 0, 0), segs=16)
    k.empty('NODE_' + bank, (x, y, z + 0.12))


def windows(k, name, x, ys, z, mat, size=(0.08, 0.24, 0.12)):
    # One mesh per strip: tiny crew-scale geometry without hundreds of draw calls.
    verts, faces = [], []
    for y in ys:
        n = len(verts)
        dx, dy, dz = (q / 2 for q in size)
        xp=x(y) if callable(x) else x
        verts += [(xp + a * dx, y + b * dy, z + c * dz)
                  for a, b, c in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),
                                  (-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
        faces += [tuple(n + j for j in f) for f in [(0,3,2,1),(4,5,6,7),(0,1,5,4),
                                                    (1,2,6,5),(2,3,7,6),(3,0,4,7)]]
    return mesh(k, name, verts, faces, mat, smooth=False)


def pbr(k, name, color, metal=0.7, rough=0.32, emit=None, strength=2):
    mat = k.material(name, color, metal, rough, emit)
    if emit:
        mat.node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value = strength
        MATERIAL_LOOKS[name.upper()] = {'emit': tuple(c * strength / 4 for c in emit)}
    else:
        # The same Cycles atlas baker as the cloud hulls: restrained panel variation,
        # crevice dirt, polished edges and a baked detail normal, not a flat colour export.
        clean = 'porcelain' in name or 'lens' in name
        MATERIAL_LOOKS[name.upper()] = dict(
            base=color, base2=tuple(min(1,c*1.08) for c in color),
            mottle_col=tuple(c*.94 for c in color), grime=tuple(c*.48 for c in color),
            edge=tuple(min(1,c*1.24+.015) for c in color), rough=rough, metal=metal,
            cells=.46, panels=.65, bump=.07 if clean else .14,
            ao_dist=.25, cav_hi=.78, cav_lo=.18, edge_lo=.52, edge_hi=.61)
    return mat


def save_source(slug):
    """Keep editable Blender geometry before the shared baker joins the hull."""
    import os
    folder=os.path.abspath(os.path.join(os.path.dirname(__file__),'..','out'))
    os.makedirs(folder,exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(folder,slug+'.blend'),check_existing=False)
