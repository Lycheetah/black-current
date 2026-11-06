"""CINDER CATHEDRAL · Pagan AI dreadnought: a furnace carried inside a siege altar.

Original design by Caelorynth for Mackenzie Conor James Clark / Lycheetah.
"""
import math
import os
import sys
sys.path.insert(0,os.path.dirname(__file__))
from _atelier import block,line,loft,marker,nozzle,oval,pbr,ribbon,ring,windows,citadel,MATERIAL_LOOKS,save_source

META={'name':'cinder_cathedral_hero.glb','hull':'pagan_ai_dreadnought','tile':8.0,'bake_size':2048}
LOOKS=MATERIAL_LOOKS


def build(k):
    iron=pbr(k,'CINDER_blackened_iron',(.055,.040,.033),.82,.37)
    bronze=pbr(k,'CINDER_old_bronze',(.31,.17,.064),.86,.29)
    edge=pbr(k,'CINDER_burnished_edges',(.58,.34,.12),.88,.24)
    bone=pbr(k,'CINDER_fired_ivory',(.53,.43,.28),.28,.44)
    dark=pbr(k,'CINDER_furnace_recess',(.008,.006,.005),.35,.61)
    fire=pbr(k,'CINDER_banked_embers',(.34,.045,.006),.3,.4,emit=(1,.16,.018),strength=2.2)
    hot=pbr(k,'CINDER_molten_core',(.8,.28,.045),.15,.36,emit=(1,.42,.07),strength=3)
    loft(k,'siege_keel',[(51,3,3,3,0),(40,12,5,4,0),(18,15,6,5,0),
         (-12,14,6,6,0),(-35,12,5,5,0),(-52,9,4,3,0)],iron,segs=16)

    # Three nested citadel masses; their staggered setbacks make a fortress silhouette.
    citadel(k,'citadel_foundation',(24,48,7),(0,-6,7),iron)
    citadel(k,'citadel_middle',(17,35,6),(0,-13,12.3),bronze)
    citadel(k,'furnace_sanctum',(10,20,7),(0,-19,17.7),iron)
    citadel(k,'crowned_bridge',(7.5,9,3.6),(0,-24,22.4),bronze,.78)
    # Service corridors live in the exposed terraces, leaving broad armour faces calm.
    M={'HULL':iron,'TRIM':dark,'GOLD':bronze}
    for s in (-1,1):
        k.plane_kit('terrace_services',(s*10,-10,10.62),(0,1,0),(1,0,0),(0,0,1),
                    (30,2.2),M,count=14,h=.30,seed=61+(s>0),tiles=False)
        k.plane_kit('aft_machinery',(s*6,-40,5.2),(0,1,0),(1,0,0),(0,0,1),
                    (12,5),M,count=14,h=.42,seed=64+(s>0),tiles=False)
        for y,z,width in ((8,10.65,9),(-2,15.4,6.3),(-14,21.35,3.4)):
            line(k,'armour_terrace_edge',[(s*width,y,z),(s*width,y-10,z)],.075,edge)
        for j in range(8):
            block(k,'citadel_armour_rib',(.24,1.5,4.0),(s*4.7,-25+j*1.65,18),bronze,.045)
    for s in (-1,1):
        # Continuous, load-bearing ribs step down the citadel, then disappear under the keel.
        for i,y in enumerate((32,19,6,-7,-20,-33)):
            ribbon(k,'ivory_buttress',[(s*5,y,13 if i>1 else 7),(s*11,y-1,10),
                   (s*16.5,y-2,4),(s*17,y-2,-2),(s*13.5,y-1,-5)],
                   [.72,1.1,1.25,1,.35],[.55,.85,1,.7,.2],bone,sides=8)
            # Bronze clamps show that these are engineered armour braces.
            block(k,'rib_collar',(.75,2.1,1.2),(s*16.7,y-2,1.1),bronze,.12)
            block(k,'furnace_shutter',(1.1,6.5,3.3),(s*14.2,y-4,2.3),dark,.15)
            for j in range(4):
                block(k,'banked_ember_slit',(.16,.45,1.9),(s*14.83,y-6+j*1.15,2.3),fire,.015)

        # Prow tusks rise rather than spreading into wings: a forward-leaning siege crown.
        ribbon(k,'prow_siege_horn',[(s*12,19,3),(s*16,28,6),(s*17.5,40,13),
               (s*14,51,20),(s*10,57,22)], [2.5,2.8,2.1,1.1,.08],
               [1.7,1.8,1.5,.9,.06],bone,sides=12)
        line(k,'horn_binding',[(s*13.2,24,7),(s*17,34,11),(s*16.5,43,16)],.14,edge)
        for y,z in ((-27,23.8),(-18,21.8),(-9,16),(3,12)):
            # Compact tower finials: no generic forest of spikes.
            block(k,'battlement',(1.6,2,2.5),(s*(5 if z>19 else 9),y,z),bronze,.16)
            k.cylinder('tapered_finial',.5,4,(s*(5 if z>19 else 9),y,z+2.5),bone,
                       segs=8,rot=(0,0,0),r2=.035)

        # Heat radiator stacks and armoured side casemates.
        for j in range(7):
            block(k,'cooling_lamella',(.26,10,3.8),(s*(10+j*.48),-40,3.9),bronze,.035)
        for y in (17,-10,-34):
            block(k,'casemate_sponson',(5,9,3),(s*13,y,5.5),iron,.4)
            line(k,'casemate_lip',[(s*11,y+3.4,7.2),(s*15,y+3.4,7.2),
                                  (s*15,y-3.4,7.2)],.09,edge)
        # A single weighted chain draped between the forward and aft braces.
        for i in range(18):
            y=22-i*2.65
            z=-.7-2.4*math.sin(math.pi*i/17)
            ob=ring(k,'reliquary_chain',(s*17.2,y,z),.52,.09,bronze,
                    rot=(math.pi/2,0,0) if i%2 else (0,math.pi/2,0),segs=12)
            ob.scale.y=1.35
        windows(k,'furnace_galleries',s*8.65,[-26+i*.95 for i in range(25)],13.3,fire,(.13,.35,.64))
        windows(k,'citadel_viewports',s*3.83,[-27+i*.55 for i in range(13)],22.6,hot,(.08,.18,.22))
        for bank,y,z in (('WPN_F',25,7.2),('WPN_M',-1,11),('WPN_A',-34,7.1)):
            marker(k,bank+('L' if s<0 else 'R'),(s*(8.5 if bank=='WPN_M' else 10.8),y,z),edge,dark,1.05)
        nozzle(k,'outer_'+str(s),s*9.5,-52,0,2.65,bronze,dark,fire)
        nozzle(k,'upper_'+str(s),s*5,-49,7,1.8,edge,dark,fire)

    # A deep, armoured axial throat. Baffles keep the orange core a small, hot focal point.
    import bmesh
    bore=k.cylinder('axial_bore',4.6,6,(0,54,1),dark,segs=32)
    bm=bmesh.new();bm.from_mesh(bore.data)
    bmesh.ops.delete(bm,geom=[f for f in bm.faces if len(f.verts)>4],context='FACES_ONLY')
    bm.to_mesh(bore.data);bm.free();k.solidify(bore,.18)
    for i in range(4):
        ring(k,'siege_iris_baffle',(0,57-i*.9,1),4.8-i*.6,.30,bronze,segs=32)
    k.cylinder('buried_furnace',2.4,.12,(0,52.8,1),fire,segs=32)
    for i in range(6):
        a=i*math.tau/6
        block(k,'iris_tooth',(.8,2.3,2.4),(math.sin(a)*3.3,57.5,1+math.cos(a)*3.3),iron,.15,
              rot=(0,a,0))
    # Bronze nose armour is cut around the mouth instead of hiding its negative space.
    for s in (-1,1):
        block(k,'fore_bastion',(5,18,5),(s*8.4,37,4),bronze,.6)
        for i in range(6):
            block(k,'siege_armour_scale',(4.8,4,.32),(s*8.4,41-i*4.2,6.75+i*.08),iron,.15)
    nozzle(k,'axial',0,-54,-1,3.6,edge,dark,hot)
    # The altar mark: one inverse triangle, deliberately legible from far away.
    line(k,'altar_mark',[(-2,-19,21.3),(2,-19,21.3),(0,-13,21.3),(-2,-19,21.3)],.09,edge)
    oval(k,'altar_ember',(0,-17,21.45),(.35,.35,.15),hot,16)
    save_source('cinder_cathedral')
