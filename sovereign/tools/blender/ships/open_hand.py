"""OPEN HAND · Sol Symbiots carrier, an inhabited shelter around an open flight bay.

The rescue role is art direction; this adds no unimplemented rescue mechanic.
Original design by Caelorynth for Mackenzie Conor James Clark / Lycheetah.
"""
import math
import os
import sys
sys.path.insert(0,os.path.dirname(__file__))
from _atelier import block,line,loft,marker,nozzle,oval,pbr,ribbon,ring,windows,station_section,MATERIAL_LOOKS,save_source

META={'name':'open_hand_hero.glb','hull':'sol_symbiots_carrier','tile':7.0,'bake_size':2048}
LOOKS=MATERIAL_LOOKS


def build(k):
    shell=pbr(k,'OPEN_HAND_porcelain_titanium',(.68,.75,.76),.43,.25)
    pearl=pbr(k,'OPEN_HAND_pearl_secondary',(.42,.55,.59),.58,.29)
    gold=pbr(k,'OPEN_HAND_champagne_alloy',(.60,.40,.16),.85,.22)
    dark=pbr(k,'OPEN_HAND_bay_depth',(.012,.032,.045),.65,.42)
    silver=pbr(k,'OPEN_HAND_structural_silver',(.25,.35,.41),.80,.32)
    cyan=pbr(k,'OPEN_HAND_neural_channels',(.03,.40,.46),.15,.3,
             emit=(.10,.83,1),strength=1.7)
    warm=pbr(k,'OPEN_HAND_inhabited_windows',(.55,.30,.10),.05,.4,
             emit=(1,.65,.25),strength=2)

    # A short aft heart joins two very long shells; the ship is built around empty space.
    loft(k,'aft_heart',[(3,10,5,5,-1),(-15,17,7,6,-1),(-36,15,6,5,-1),
         (-55,8,4,3,-1)],shell,rings=24)
    loft(k,'ventral_bay_keel',[(50,1.8,.5,.6,-5),(28,4,.9,.9,-5),
         (-9,5,1,1,-5),(-40,7,1.8,1.5,-4)],silver,rings=28)
    block(k,'bay_floor',(11,52,.28),(0,11,-3.8),dark,.18)
    # Sparse landing chevrons, service rails and an illuminated approach axis.
    for s in (-1,1):
        line(k,'bay_edge_guidance',[(s*4.8,-14,-3.5),(s*4.8,12,-3.5),
                                  (s*3.4,33,-3.9),(s*1.2,45,-4.2)],.07,cyan)
        for y in range(-9,30,7):
            line(k,'landing_chevron',[(s*3.6,y-1,-3.5),(s*2.8,y,-3.5),(s*3.6,y+1,-3.5)],.055,gold)

    for s in (-1,1):
        # Bow petals taper into open fingers. Hull sections carry real curvature in all axes.
        stations=[(60,.15,.15,.2,0),(49,2.4,2.1,2.2,0),
                  (27,5.5,5,4.5,0),(0,6.7,6,5,0),(-25,6.2,5.4,4.3,0),
                  (-48,3.6,2.9,2.4,0)]
        sec=station_section(stations)
        body=loft(k,'sheltering_shell',stations,shell,loc=(s*16,0,0),rings=48,segs=28)
        # Raised armoured scales sweep over the outside, leaving the bay wall open and legible.
        for i,(a,b) in enumerate(((.18,.32),(.34,.48),(.50,.64),(.66,.80),(.82,.94))):
            ob=k.shell_patch('petal_plate',sec,108,60,a,b,.42,math.pi-.42,
                pearl if i%3==1 else shell,scale=1.035,flare=.025,thickness=.12,
                segs=12,rings=7,panels=.28,seed=701+i)
            ob.location.x=s*16
            lip=k.edge_curve(sec,108,60,b,.42,math.pi-.42,scale=1.065)
            line(k,'petal_gold_lip',[(x+s*16,y,z) for x,y,z in lip],.055,gold)

        # These three arching ribs are the silhouette: a protective hand, with a clear empty palm.
        for i,y in enumerate((29,6,-17)):
            points=[(s*18,y,3),(s*14,y+2,8),(s*8,y+3,11.5-i*.5),(s*2.1,y+2,10.8-i*.5)]
            ribbon(k,'protective_arch',points,[1.6,1.4,1,.20],[.70,.65,.45,.12],shell,sides=12)
            line(k,'arch_neural_inlay',[(x,y_,z+.58) for x,y_,z in points],.09,cyan)
            line(k,'arch_gold_border',[(x+s*.65,y_,z+.36) for x,y_,z in points[:-1]],.055,gold)

        # Inner bay doors are recessed; amber windows give the 3.2 km carrier a human scale.
        for i,y in enumerate((24,12,0,-12)):
            wall=s*(16-sec((60-y)/108)[0]*.98)
            block(k,'hangar_shadow',(.35,7,3.5),(wall,y,.1),dark,.3)
            for z in (-1.25,1.45):
                line(k,'hangar_lintel',[(wall-s*.22,y-2.8,z),(wall-s*.22,y+2.8,z)],.065,gold)
            block(k,'hangar_beacon',(.12,.22,.18),(wall-s*.25,y-2.9,1.65),cyan,.015)
            # Tiny service launches are inert deck detail, not independent simulated craft.
            loft(k,'berthed_service_launch',[(2.3,.04,.04,.04,0),(1.1,.5,.35,.25,0),
                 (-1.8,.45,.25,.2,0)],pearl,rings=8,segs=8,loc=(s*8.4,y,-1.65))
        for row,z in enumerate((-.3,.5,1.3)):
            windows(k,'inner_habitation_strip',lambda y:s*(16-sec((60-y)/108)[0]*1.005),
                    [-23+i*.65 for i in range(85)],z,warm,(.055,.18,.11))
        windows(k,'outer_habitation_strip',lambda y:s*(16+sec((60-y)/108)[0]*1.005),
                [-22+i*.75 for i in range(54)],.1,warm,(.06,.18,.10))

        # Long, inset neural channels describe the shell curvature without washing it in bloom.
        line(k,'outer_neural_recess',[(s*19,39,2.7),(s*22,20,2.2),(s*22.8,-2,1.8),
              (s*21,-24,1.7),(s*18,-40,1.8)],.22,dark)
        line(k,'outer_neural_channel',[(s*19,39,2.9),(s*22,20,2.4),(s*22.8,-2,2),
              (s*21,-24,1.9),(s*18,-40,2)],.085,cyan)
        line(k,'ventral_trim',[(s*15,48,-2),(s*20,22,-4),(s*20,-10,-4),
              (s*17,-38,-2.7)],.095,gold)
        nozzle(k,'main_'+str(s),s*15.8,-50,-.5,3.15,gold,dark,cyan)
        nozzle(k,'aux_'+str(s),s*8,-53,-2.5,1.55,silver,dark,cyan)
        for bank,y,z in (('WPN_F',29,5.9),('WPN_M',-22,6.0)):
            marker(k,bank+('L' if s<0 else 'R'),(s*17,y,z),gold,dark,.80)

    # A bridge that watches the bay, protected between broad porcelain shoulders.
    oval(k,'witness_bridge_shell',(0,-28,7.5),(6.2,9.3,3.3),shell,32)
    oval(k,'witness_bridge_recess',(0,-22,8.9),(4.7,4.5,1.7),dark,24)
    oval(k,'witness_lens',(0,-21.7,9.4),(3.6,3.9,.9),pearl,24)
    line(k,'bridge_neural_brow',[(-4,-23,9.3),(-2,-19,9.7),(0,-18,9.9),
                                (2,-19,9.7),(4,-23,9.3)],.11,cyan)
    for x in (-2.8,-1.4,0,1.4,2.8):
        block(k,'bridge_observation_window',(.72,.15,.24),(x,-19.2,8.6),warm,.03)
    # One connected dorsal ribbon links the bridge into the living neural architecture.
    ribbon(k,'dorsal_crest',[(0,-42,5),(0,-34,11),(0,-25,13),(0,-12,10)],
           [1,.8,.7,.12],[.45,.4,.35,.08],gold,sides=10)
    line(k,'crest_channel',[(0,-41,5.4),(0,-34,11.4),(0,-25,13.4),(0,-13,10.4)],.10,cyan)
    save_source('open_hand')
