"""IRON JACKAL — industrial pursuit cruiser, an asymmetric inhabited engine frame."""
import math,os,sys
sys.path.insert(0,os.path.dirname(__file__))
from _elite import Forge
from _forge import looks
META={'name':'iron_jackal_hero.glb','hull':'human_hunters_heavy_cruiser','tile':4,'bake_size':2048}
L=330.

def build(k):
    F=Forge(k,L,'iron_jackal');s=F.s;M=F.M
    F.hull('body',[(46,1.6,2,2,0),(36,6,4,3,0),(20,7,5,4,0),
        (0,6,5,4,0),(-25,7,4,4,0),(-42,5,3,3,0)])
    # A blunt starboard shoulder and a long port barrel establish unequal mass.
    F.hull('port_barrel',[(31,1.5,1.8,1.8,-1),(20,3.6,3.4,3,-1),
        (-12,3.8,3.4,3,-1),(-39,3.2,2.8,2.8,-1)],x=-16)
    shoulder=k.wedge('shoulder',F.p((11,25,8)),F.p((13,0,-1)),M['HULL'],slope=.26,back=.10)
    k.bevel(shoulder,.24*s,2);k.weighted_normals(shoulder)
    k.plane_kit('shoulder_service',F.p((13,-2,3.03)),(1,0,0),(0,1,0),(0,0,1),
                F.p((8,13)),M,count=24,h=.22*s,seed=7180)
    for i in range(6):
        F.box('shoulder_vent',(.18,10,2.3),(18.55,-4+i*.3,-.4),'TRIM')
    F.panel('ram',[(-7,-8),(-9,2),(-6,10),(5,12),(9,5),(7,-8)],
            (0,34,-2),2,'TRIM',kit=(0,1,10,10,24))
    for side in (-1,1):
        for y in (19,4,-13,-29):
            # Closed triangular load paths across an open service corridor.
            F.beam('frame',[(side*5,y,-2),(side*16,y-3,-2)],.6)
            F.beam('brace',[(side*5,y,3),(side*16,y-3,-2)],.28,'GOLD')
        F.cable('fuel',[(side*6,25,-2),(side*11,17,-4),(side*16,-20,-4),(side*16,-35,-1)],.24)
        for i in range(12):
            F.box('radiator',(.22,7,3),(side*20,-14-i*1.7,-1),'TRIM')
        shroud=k.wedge('forward_shroud',F.p((5,12,4)),F.p((side*12,19,0)),M['TRIM'],slope=.32,back=.12)
        k.bevel(shroud,.16*s,2);k.weighted_normals(shroud)
        k.plane_kit('shroud_service',F.p((side*12,17.8,2.02)),(1,0,0),(0,1,0),(0,0,1),
                    F.p((3.5,4.5)),M,count=12,h=.16*s,seed=7181+side)
    F.engine('PORT',(-16,-42,-1),4.3)
    F.engine('STARBOARD',(13,-30,-1),3.0)
    F.engine('KEEL',(0,-43,-2),2.7)
    # Stepped bridge, orange pursuit stripes and a proper aft service deck.
    F.box('bridge_base',(8,12,3),(-1,0,6),detail=22)
    F.box('bridge',(6,8,2.7),(-2,1,8.6),'TRIM',18)
    for i in range(8):F.box('bridge_glass',(.4,.12,.35),(-4+i*.6,5.05,8.8),'GLOW')
    k.sensor_mast('tracker',F.p((2,-4,8)),6*s,M['TRIM'],M['GLOW'],dish=1.2*s)
    for i in range(5):
        F.panel('pursuit_mark',[(0,0),(1.5,.6),(1.5,1.6),(0,1)],
                (-4+i*1.7,36,.04),.05,'GOLD')
    F.box('aft_deck',(8,11,2),(0,-26,5.3),detail=28)
    for bank,loc in [('FL',(-4,24,4.5)),('FR',(4,24,4.5)),
                     ('ML',(-15,4,2.5)),('MR',(13,-1,3.2))]:F.gun(bank,loc)
    F.done(('body','port_barrel','bridge','shoulder'))

LOOKS=looks('human_hunters',L)
LOOKS['HULL'].update(base=(.063,.072,.043),base2=(.084,.092,.059))
LOOKS['GOLD'].update(base=(.63,.25,.04),base2=(.76,.34,.06))
