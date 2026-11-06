"""DAYBREAK RELIQUARY — a solar carrier with an open supported reactor halo."""
import math,os,sys
sys.path.insert(0,os.path.dirname(__file__))
from _elite import Forge
from _forge import looks
META={'name':'daybreak_reliquary_hero.glb','hull':'cosmic_light_carrier','tile':4,'bake_size':2048}
L=3200.

def build(k):
    F=Forge(k,L,'daybreak_reliquary');s=F.s;M=F.M
    F.hull('body',[(48,.25,1,1,-11),(31,3,2.5,3,-13),(5,4,3,3,-14),
        (-24,5,4,3,-14),(-43,4,3,3,-12)])
    # A twin ring, its load-bearing spokes and its segmented porcelain covers.
    for y in (-8,-14):
        F.ring('halo_frame',(0,y,5),22,.65,'GOLD')
        F.ring('halo_inset',(0,y,5),20.9,.20,'GLOW')
    for i in range(24):
        a=math.tau*i/24;x=22*math.cos(a);z=5+22*math.sin(a)
        segment=k.box('halo_segment',F.p((1.8,7,4.6)),F.p((x,-11,z)),M['HULL'],rot=(0,-a,0))
        k.bevel(segment,.18*s,2);k.weighted_normals(segment)
        # The casing follows the halo tangent; dressing sits on its radial face.
        k.plane_kit('halo_service',F.p((22.93*math.cos(a),-11,5+22.93*math.sin(a))),
            (0,1,0),(-math.sin(a),0,math.cos(a)),(math.cos(a),0,math.sin(a)),
            F.p((5.5,3.3)),M,count=8,h=.14*s,seed=7400+i)
        # Individual keys connect both ring rails, with a fine radial seam.
        F.beam('halo_key',[(x*.965,-7.8,5+(z-5)*.965),(x*.965,-14.2,5+(z-5)*.965)],.16,'GOLD')
    F.ring('reactor_cradle',(0,-11,5),6.0,.8,'TRIM')
    k.sphere('solar_core',4.5*s,F.p((0,-11,5)),M['GLOW'],segs=32)
    for i in range(6):
        a=math.tau*i/6
        F.spar('spar_solar_spoke',[(6*math.cos(a),-11,5+6*math.sin(a)),
            (14*math.cos(a),-11,5+14*math.sin(a)),
            (22*math.cos(a),-11,5+22*math.sin(a))],[.8,1,.6],plates=9)
    for side in (-1,1):
        # Long flight galleries sit below the ring, leaving the upper halo open.
        F.hull('flight_gallery',[(35,.4,1,1,-9),(24,3,2,2,-9),
            (-15,3,2,2,-9),(-36,2.4,2,2,-9)],x=side*14)
        F.spar('spar_gallery_mount',[(side*3,22,-13),(side*9,22,-13),
            (side*14,19,-9)],[1.2,1.3,1.1],plates=7)
        F.spar('spar_halo_mount',[(side*4,-24,-14),(side*14,-22,-12),
            (side*19,-13,-6)],[1.7,1.5,1.0],plates=9)
        for j in range(8):
            y=20-j*6
            F.box('launch_mouth',(.13,3.6,1.4),(side*17.05,y,-9),'CORE')
            F.box('launch_lintel',(.45,4,.2),(side*17.1,y,-8.15),'GOLD')
            F.box('runway_beacon',(.16,.6,.2),(side*17.35,y,-8.12),'GLOW')
        F.engine('GALLERY_L' if side<0 else 'GALLERY_R',(side*14,-38,-9),2.9)
        F.panel('solar_prow',[(side*x,y) for x,y in [(0,0),(6,9),(9,25),(2,19),(-1,6)]],
            (side*3,18,-11),.65,'HULL',kit=(side*3,10,3,7,20))
    F.engine('KEEL',(0,-45,-12),3.5)
    for bank,loc in [('FL',(-14,23,-6.8)),('FR',(14,23,-6.8)),
        ('ML',(-14,0,-6.8)),('MR',(14,0,-6.8)),('AL',(-14,-26,-6.8)),('AR',(14,-26,-6.8))]:F.gun(bank,loc,1.1)
    F.done(('body','flight_gallery'))

LOOKS=looks('cosmic_light',L)
LOOKS['HULL'].update(base=(.67,.65,.56),base2=(.78,.76,.66),rough=.29)
LOOKS['GLOW']={'emit':(.62,.37,.085)}
