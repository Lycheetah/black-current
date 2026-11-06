"""PRISM SERAPH — crystalline carrier; six tiers of engineered faceted feathers."""
import math,os,sys
sys.path.insert(0,os.path.dirname(__file__))
from _elite import Forge
from _forge import looks,fang
META={'name':'prism_seraph_hero.glb','hull':'techno_angels_carrier','tile':4,'bake_size':2048}
L=3200.

def build(k):
    F=Forge(k,L,'prism_seraph');s=F.s;M=F.M
    F.hull('body',[(48,.2,1,1,0),(31,3,3,2,0),(8,5,4,3,0),
        (-18,6,5,4,0),(-41,4,3,3,0)])
    for side in (-1,1):
        F.spar('spar_angel_shoulder',[(side*4,15,1),(side*14,8,3),
            (side*25,-4,5),(side*31,-20,4)],[3,3.4,2.5,1.2],plates=15)
        for j in range(6):
            x=8+j*3.4;y=13-j*4.7;z=3+j*.8
            # Diamond sections are raised solid facets, with layered basal armour.
            F.panel('feather_base',[(side*x,y),(side*(x+4),y+2),
                (side*(x+11),y-20),(side*(x+5),y-15)],(0,0,z),.8,
                'TRIM',kit=(side*(x+4),y-6,2.6,7,18))
            F.spar('spar_crystal_feather',[(side*(x+2),y,z+.5),
                (side*(x+8),y-10,z+2),(side*(x+14),y-30,z-1)],
                [1.5,2.3,.25],mat='HULL',plates=8,squash=.9)
            F.beam('feather_circuit',[(side*(x+2),y,z+1.3),
                (side*(x+8),y-10,z+3.8),(side*(x+13),y-28,z)],.065,'GLOW')
        F.box('launch_gallery',(4,26,4),(side*8,-8,-3),detail=32)
        for j in range(6):
            y=2-j*4
            F.box('hangar_throat',(.16,2.8,1.6),(side*10.05,y,-3),'CORE')
            F.box('hangar_lip',(.35,3,.2),(side*10.1,y,-2.05),'GOLD')
        F.spar('spar_drive_support',[(side*5,-22,-1),(side*9,-29,-2),(side*9,-38,-2)],
               [2.5,2.8,2.5],plates=8)
        F.engine('FEATHER_L' if side<0 else 'FEATHER_R',(side*9,-41,-2),3)
    # A shallow axial halo is supported by four elegant arch struts.
    F.ring('seraph_halo',(0,8,13),8,.48,'GOLD',rot=(0,0,0))
    F.ring('seraph_signal',(0,8,13.1),7.3,.09,'GLOW',rot=(0,0,0))
    for side in (-1,1):
        for y in (4,12):
            F.spar('spar_halo_support',[(side*3,y,3),(side*5,y,8),
                (side*7,y,13)],[.9,.75,.4],plates=7)
    fang(k,'prism_sensor',F.p((0,22,2.5)),F.p((0,40,7)),2*s,M['TRIM'],sides=6)
    F.engine('HEART',(0,-44,-1),3.3)
    for bank,loc in [('FL',(-3,25,3.5)),('FR',(3,25,3.5)),('ML',(-6,0,4.3)),
        ('MR',(6,0,4.3)),('AL',(-6,-24,4.5)),('AR',(6,-24,4.5))]:F.gun(bank,loc,1.15)
    F.done(('body','launch_gallery'))

LOOKS=looks('techno_angels',L)
LOOKS['HULL'].update(base=(.49,.62,.70),base2=(.65,.74,.81),rough=.23,metal=.62)
LOOKS['GLOW']={'emit':(.035,.35,.75)}
