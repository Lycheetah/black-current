"""NIGHTGLASS · Cosmic Darkness reconnaissance frigate.

A folded, cloaked wing; silver astrometry etched into quiet violet armour.
Original design by Caelorynth for Mackenzie Conor James Clark / Lycheetah.
"""
import math
import os
import sys
sys.path.insert(0, os.path.dirname(__file__))
from _atelier import block, line, loft, marker, mesh, nozzle, oval, pbr, ribbon, ring, MATERIAL_LOOKS, save_source

META = {'name': 'nightglass_hero.glb', 'hull': 'cosmic_darkness_specialist_frigate', 'tile': 6.0, 'bake_size': 2048}
LOOKS = MATERIAL_LOOKS


def wing_point(s, v, side, lift=0):
    x = side * (5.0 + 34.0 * s)
    lead = 28 - 43 * s + 2.5 * math.sin(math.pi * s)
    trail = -41 + 24 * s
    y = lead + (trail - lead) * v
    z = 1.8 + 2.2 * math.sin(math.pi * s) - 3.2 * s
    z += 2.3 * math.sin(math.pi * v) ** 0.8 * (1 - s * 0.8)
    return (x, y, z + lift)


def build(k):
    hull = pbr(k, 'NIGHTGLASS_violet_ceramic', (0.032, 0.022, 0.065), 0.72, 0.27)
    plate = pbr(k, 'NIGHTGLASS_iridescent_slate', (0.068, 0.046, 0.102), 0.8, 0.30)
    dark = pbr(k, 'NIGHTGLASS_absorbent_recess', (0.008, 0.010, 0.020), 0.35, 0.51)
    silver = pbr(k, 'NIGHTGLASS_silver_astrometry', (0.42, 0.49, 0.64), 0.91, 0.23)
    glass = pbr(k, 'NIGHTGLASS_obsidian_lens', (0.025, 0.045, 0.10), 0.88, 0.12)
    glow = pbr(k, 'NIGHTGLASS_cold_violet', (0.18, 0.15, 0.4), 0.3, 0.3,
               emit=(0.34, 0.20, 0.85), strength=1.5)
    star = pbr(k, 'NIGHTGLASS_star_points', (0.48, 0.65, 0.85), 0.15, 0.3,
               emit=(0.40, 0.65, 1), strength=2)

    loft(k, 'nightglass_keel', [(52,.2,.2,.2,0),(39,2.2,2,1.6,0),
         (21,6,4.2,2.4,0),(0,7,5,3.5,0),(-28,6,3,2,0),(-47,3.6,1.6,1.3,0)], hull)
    # Closed, cambered wing volumes, followed by individually separated armour feathers.
    for side in (-1, 1):
        verts, faces = [], []
        ns, nv = 24, 14
        for layer in (0, 1):
            for i in range(ns + 1):
                for j in range(nv + 1):
                    p = wing_point(i/ns, j/nv, side)
                    verts.append((p[0], p[1], p[2] - layer * (1.25 * (1-i/ns) + .14)))
        offset = (ns + 1) * (nv + 1)
        for i in range(ns):
            for j in range(nv):
                a = i * (nv + 1) + j
                for off in (0, offset):
                    faces.append((a+off,a+1+off,a+nv+2+off,a+nv+1+off))
        edge = list(range(nv+1)) + [i*(nv+1)+nv for i in range(1,ns+1)]
        edge += [ns*(nv+1)+j for j in range(nv-1,-1,-1)]
        edge += [i*(nv+1) for i in range(ns-1,0,-1)]
        for a,b in zip(edge,edge[1:]+edge[:1]):
            faces.append((a,b,b+offset,a+offset))
        mesh(k, 'cloaked_wing', verts, faces, hull)

        for index, (a,b) in enumerate(((.06,.24),(.26,.46),(.48,.68),(.70,.87),(.89,.985))):
            verts, faces = [], []
            for i in range(7):
                for j in range(10):
                    s = a + (b-a)*i/6
                    v = .10 + .82*j/9
                    verts.append(wing_point(s,v,side,.07+.035*math.sin(j/9*math.pi)))
            for i in range(6):
                for j in range(9):
                    q=i*10+j
                    faces.append((q,q+1,q+11,q+10))
            ob = mesh(k, 'overlapping_mantle_%d'%index, verts, faces, plate if index%2==0 else hull)
            k.solidify(ob,.07)
            # Silver edge deliberately stops before the tip: most of the hull remains quiet.
            line(k,'silver_feather_edge',[wing_point(a,.12+t*.72/6,side,.16) for t in range(7)],.034,silver)

        # Broad inset along the leading edge, with a thin violet slit deep inside it.
        edge=[wing_point(.06+i*.85/12,.045,side,.08) for i in range(13)]
        line(k,'leading_shadow_channel',edge,.18,dark)
        line(k,'leading_silver_edge',[wing_point(.06+i*.85/12,.01,side,.12) for i in range(13)],.045,silver)
        line(k,'muted_sensor_slit',[wing_point(.22+i*.40/8,.05,side,.15) for i in range(9)],.045,glow)

        # The constellation is a navigation instrument, not a sheet of decorative lights.
        points=[wing_point(s,v,side,.18) for s,v in ((.20,.40),(.35,.49),(.45,.36),(.58,.54),(.70,.49),(.80,.65))]
        line(k,'astrometry_inlay',points,.018,silver)
        for n,p in enumerate(points):
            oval(k,'reference_star',p,(.10,.10,.045) if n%2 else (.15,.15,.06),star,12)

        # Short cat-ear sensor fins and recessed, aft-facing drive slots.
        ribbon(k,'sensor_ear',[(side*6,1,4),(side*9,-1,8),(side*10,-5,12),
                              (side*10.4,-10,13)], [1.9,1.4,.7,.06],[.6,.5,.3,.025],hull)
        line(k,'ear_edge',[(side*7,1,4.4),(side*9.5,-3,9),(side*10.4,-10,13)],.045,silver)
        nozzle(k,'wing_'+str(side),side*8,-43,0,1.45,plate,dark,glow)
        # Folds beneath the mantle expose only a few heat radiator vanes.
        for i in range(8):
            block(k,'buried_radiator',(.17,3.8,.32),(side*(9+i*.5),-26-i*.35,.1),dark,.025)
        marker(k,'WPN_FL' if side<0 else 'WPN_FR',(side*4.4,18,4.15),silver,dark,.68)

    # Forebody is a split, long instrument lance, with a protected black optical eye.
    for side in (-1,1):
        ribbon(k,'split_optical_lance',[(side*2.8,18,1.5),(side*3,35,1.1),
               (side*1.7,48,.2),(side*.55,56,-.1)], [1.2,1.1,.55,.035],[.8,.65,.35,.02],plate)
        line(k,'lance_silver',[(side*3,23,2),(side*3,35,1.7),(side*1.7,48,.55)],.035,silver)
    oval(k,'sensor_recess',(0,11,4.4),(2.9,7,.9),dark)
    oval(k,'eclipse_optic',(0,11,4.8),(2.2,5.6,.8),glass,32)
    ring(k,'eclipse_reticle',(0,11,5.32),1.3,.045,silver,rot=(0,0,0))
    oval(k,'central_reference',(0,11,5.56),(.13,.13,.06),star,16)
    nozzle(k,'keel',0,-48,-.25,1.65,silver,dark,glow)
    save_source('nightglass')
