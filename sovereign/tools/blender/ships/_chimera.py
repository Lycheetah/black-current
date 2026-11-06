"""Hybrid Fused parts: sinew bundles that knit machine to flesh, and bio-valves."""
import math


def sinew(k, M, a, b, r, strands=3, twist=1.5):
    """Twisted strands between two points (a living cable), with clamp rings at both ends."""
    from mathutils import Vector
    A, B = Vector(a), Vector(b)
    d = (B - A)
    n = d.normalized()
    u = n.cross(Vector((0, 0, 1)) if abs(n.z) < 0.9 else Vector((1, 0, 0))).normalized()
    v = n.cross(u)
    for s in range(strands):
        pts = []
        for q in range(8):
            f = q / 7
            ang = s / strands * math.tau + f * twist * math.tau
            sag = math.sin(f * math.pi) * d.length * 0.06
            pts.append(tuple(A + d * f + (u * math.cos(ang) + v * math.sin(ang)) * r * 1.6 - Vector((0, 0, sag))))
        k.tube('sinew', pts, [r] * 8, M['HULL'] if s % 2 else M['TRIM'], bevel_res=2, ends=('round', 'round'), res=3)
    k.tube('sinew_glow', [tuple(A + d * f - Vector((0, 0, math.sin(f * math.pi) * d.length * 0.06))) for f in (0.0, 0.33, 0.66, 1.0)], [r * 0.5] * 4, M['GLOW'], bevel_res=1, ends=('round', 'round'), res=3)
    for p in (A, B):
        k.sphere('sinew_clamp', r * 2.8, tuple(p), M['GOLD'], 10)


def bio_valve(k, M, c, r, N=(0, 0, 1)):
    """An organic valve pod: a squashed bulb with a glowing slit and lips."""
    bulb = k.sphere('valve', r, c, M['HULL'], 16)
    bulb.scale = (1.0, 1.4, 0.75)
    k.box('valve_slit', (r * 0.18, r * 2.2, r * 0.3), (c[0], c[1], c[2] + r * 0.7), M['GLOW'])
    for s in (-1, 1):
        lip = k.sphere('valve_lip', r * 0.35, (c[0] + s * r * 0.25, c[1], c[2] + r * 0.66), M['TRIM'], 10)
        lip.scale = (0.6, 3.0, 0.6)
