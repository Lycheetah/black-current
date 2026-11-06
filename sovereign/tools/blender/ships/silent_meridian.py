"""SILENT MERIDIAN — a broad layered cloaking wing with an observatory heart."""
import math,os,sys
sys.path.insert(0,os.path.dirname(__file__))
from _elite import Forge
from _forge import looks
META={'name':'silent_meridian_hero.glb','hull':'cosmic_darkness_battleship','tile':4,'bake_size':2048}
L=1000.

def build(k):
    F=Forge(k,L,'silent_meridian');s=F.s;M=F.M
    F.hull('body',[(47,.15,.5,.5,0),(28,3,2,1.8,0),(5,7,3.8,3,0),
        (-18,6,2.7,2.3,0),(-38,3.5,2,2,0)])
    for side in (-1,1):
        # Six individually cut and stepped mantles sweep outward and aft.
        outline=[(5,16),(12,13),(37,-4),(45,-20),(30,-16),(9,-6)]
        F.panel('primary_mantle',[(side*x,y) for x,y in outline],(0,0,.3),1.3,
            'HULL',kit=(side*20,-3,12,5,38))
        for i in range(4):
            x=14+i*5;y=-2-i*2
            F.panel('mantle_armour',[(side*x,y),(side*(x+6),y-1.2),
                (side*(x+9),y-6),(side*(x+2),y-4.7)],(0,0,1.62),.18,
                'HULL',kit=(side*(x+4),y-2.6,2.3,1.3,9))
            F.beam('mantle_edge',[(side*x,y,1.84),(side*(x+6),y-1.2,1.84),
                (side*(x+9),y-6,1.84)],.045,'GOLD')
        for j in range(5):
            x=10+j*4.3;y=7-j*4.5
            F.panel('overlapping_cloak',[(side*x,y),(side*(x+8),y-5),
                (side*(x+15),y-24),(side*(x+7),y-18)],(0,0,2.1-j*.35),.55,
                'TRIM' if j%2==0 else 'HULL',kit=(side*(x+7),y-11,3.3,6,18))
            F.beam('silver_seam',[(side*(x+.2),y,2.7-j*.35),
                (side*(x+7.5),y-5,2.7-j*.35),(side*(x+14),y-22,2.7-j*.35)],.055,'GOLD')
        F.spar('spar_wing_root',[(side*5,9,-1),(side*14,0,-2),
            (side*30,-10,-1),(side*40,-18,-.5)],[2.3,2.0,1.2,.4],plates=15)
        # Flared optical sockets carry small dark slits, not oversized glowing eyes.
        F.box('sensor_socket',(3,5,1.6),(side*4,18,1.9),'TRIM',12)
        F.box('optical_slit',(1.9,.15,.24),(side*4,20.55,2.1),'GLOW')
        F.vent('shadow_sink',(side*4,-21,2.7),3,9,18)
        F.engine('WING_L' if side<0 else 'WING_R',(side*15,-28,-1),2.5)
        # The drive is attached to the wing rib by a real tapered housing.
        F.spar('spar_drive_neck',[(side*10,-12,-1),(side*15,-18,-1),
            (side*15,-27,-1)],[2.3,2.6,2.4],plates=9)
    F.engine('MERIDIAN',(0,-40,0),2.8)
    F.ring('astrometry_collar',(0,-2,4),3.2,.18,'GOLD',rot=(0,0,0))
    F.box('observatory',(4,6,1),(0,-2,3.5),'TRIM',16)
    for i in range(12):
        a=math.tau*i/12
        F.box('constellation',(.10,.10,.07),(math.cos(a)*2.8,-2+math.sin(a)*2.8,4.1),'GLOW')
    for bank,loc in [('FL',(-4,25,2.5)),('FR',(4,25,2.5)),
        ('ML',(-13,-2,2.2)),('MR',(13,-2,2.2)),('AL',(-6,-23,2.5)),('AR',(6,-23,2.5))]:F.gun(bank,loc,1.1)
    F.done(('body',))

LOOKS=looks('cosmic_darkness',L)
LOOKS['HULL'].update(base=(.037,.028,.074),base2=(.061,.045,.11),rough=.26)
LOOKS['GOLD'].update(base=(.25,.29,.39),base2=(.39,.42,.52),metal=.9)
