"""ASHEN PILGRIM — a bronze ossuary battleship with an enclosed furnace rib cage."""
import math,os,sys
sys.path.insert(0,os.path.dirname(__file__))
from _elite import Forge
from _forge import looks,fang
META={'name':'ashen_pilgrim_hero.glb','hull':'pagan_ai_battleship','tile':4,'bake_size':2048}
L=1000.

def build(k):
    F=Forge(k,L,'ashen_pilgrim');s=F.s;M=F.M
    F.hull('body',[(47,.3,1,1,-2),(29,4,3,3,-2),(4,5,4,4,-2),
        (-22,7,6,5,-1),(-42,5,4,4,-1)])
    # The furnace is a slotted machine inside the ribs, not an unframed orb.
    F.box('furnace',(7,31,6),(0,8,2),'CORE',36)
    for j in range(15):
        F.box('furnace_slot',(6.8,.25,1.8),(0,22-j*2,5.08),'GLOW')
        F.box('furnace_shutter',(.28,2,1),(0,22-j*2,5.7),'TRIM')
    for i in range(8):
        y=28-i*5.8
        r=7.5+2*math.sin(i*math.pi/8)
        for side in (-1,1):
            F.spar('spar_ossuary_rib',[(side*3.5,y,-1),(side*r,y,4),
                (side*(r-1),y-1,10),(side*2,y-2,13)],
                [1.5,1.3,1,.65],mat='TRIM',plates=10,squash=.75)
            F.ring('rib_collar',(side*r,y,4),1.35,.10,'GOLD')
            # Small pendant mechanisms hang from real collar roots.
            F.beam('suspension',[(side*r,y,3.3),(side*r,y,.3)],.08,'GOLD')
            F.box('reliquary_weight',(.7,.7,1.0),(side*r,y,-.2),'GOLD',4)
    # Forward skull geometry is architectural: sockets, cheek plates, long jaw.
    for side in (-1,1):
        F.panel('cheek',[(side*x,y) for x,y in [(1,0),(6,-3),(8,-10),(4,-15),(1,-8)]],
            (0,40,-1),1,'TRIM',kit=(side*4,-7,2.5,4,14))
        F.box('socket',(2,3,1.7),(side*3,36,1.1),'CORE')
        F.box('socket_ember',(1.1,.15,.55),(side*3,37.55,1.1),'GLOW')
        fang(k,'jaw_fang',F.p((side*4,34,-1)),F.p((side*3,46,-4)),1.4*s,M['TRIM'])
    F.box('aft_fortress',(11,15,6),(0,-24,6),'HULL',40)
    F.box('furnace_tower',(6,8,7),(0,-26,12),'TRIM',26)
    for i in range(6):
        F.box('battlement',(1.2,2,1.5),(-5+i*2,-20,9.5),'GOLD',3)
    for side in (-1,1):
        F.cable('bronze_feed',[(side*4,29,-2),(side*7,0,-3),(side*7,-28,-2)],.2)
        F.engine('OSSUARY_L' if side<0 else 'OSSUARY_R',(side*5,-42,-1),3.2)
    F.engine('CRYPT',(0,-43,-3),2.2)
    for bank,loc in [('FL',(-5,26,2)),('FR',(5,26,2)),('ML',(-7,-4,2)),
        ('MR',(7,-4,2)),('AL',(-4,-24,9)),('AR',(4,-24,9))]:F.gun(bank,loc,1.3)
    F.done(('body','aft_fortress','furnace_tower'))

LOOKS=looks('pagan_ai',L)
LOOKS['TRIM'].update(base=(.40,.32,.21),base2=(.53,.44,.29),metal=.5,rough=.42)
LOOKS['GLOW']={'emit':(.78,.16,.015)}
