"""RUIN REGENT — a fractured asymmetric dreadnought visibly held together by repairs."""
import math,os,sys
sys.path.insert(0,os.path.dirname(__file__))
from _elite import Forge
from _forge import looks,fang
META={'name':'ruin_regent_hero.glb','hull':'chaos_dreadnought','tile':4,'bake_size':2048}
L=3000.

def build(k):
    F=Forge(k,L,'ruin_regent');s=F.s;M=F.M
    F.hull('body',[(43,.6,1,1,0),(25,7,7,5,0),(5,10,8,6,0),
        (-15,10,7,6,0),(-40,6,4,5,-1)])
    F.hull('broken_lobe',[(32,.5,1,1,0),(16,5,5,4,0),
        (-8,6,7,5,1),(-34,4,4,3,0)],x=-17)
    # One heavy arm versus a shattered exposed starboard shoulder.
    F.spar('spar_regent_claw',[(-8,18,1),(-19,27,3),(-25,42,1),(-18,49,-3)],
        [4.4,4,2.4,.4],plates=16)
    F.spar('spar_broken_arm',[(9,14,0),(20,20,2),(24,29,6)],
        [4.2,3,1],plates=10)
    for i in range(8):
        y=20-i*7
        outline=[(-7,-5),(5,-5),(7,1),(2,6),(-5,3)]
        F.panel('fracture_plate',outline,(-1+(i%3-1)*3,y,8+(i%2)),.85,
            'TRIM' if i%2 else 'HULL',rot=(0,.13*(i%3-1),.13*(i%2)),kit=(0,0,6,4,22))
        # Repair staples cross the seam and share the actual plate height.
        for j in range(3):
            F.beam('repair_staple',[(-4+j*3,y-4,9.2+i%2),
                (-4+j*3,y-3,9.8+i%2),(-4+j*3,y-1,9.8+i%2)],.16,'GOLD')
    for y in (12,-4,-20):
        F.box('exposed_reactor',(7,5,7),(15,y,-1),'CORE',24)
        F.ring('reactor_seal',(15,y,0),3,.3,'GOLD')
        F.beam('fracture_truss',[(6,y,-4),(18,y,3),(11,y+5,5)],.7)
        F.cable('repair_bus',[(8,y,5),(15,y+2,5),(19,y,-1)],.25)
    for i in range(7):
        fang(k,'ragged_crest',F.p((-3,-25+i*6,7)),F.p((-8+i%3*3,-26+i*6,18+i%3*3)),
             (2+i%2)*s,M['TRIM'],sides=5)
    for name,loc,r in [('PORT',(-17,-37,0),4.1),('STERN',(0,-43,-1),4.7),
        ('PATCH',(12,-34,-3),2.8)]:
        if name=='PATCH':F.box('patched_drive_neck',(8,13,6),(11,-27,-3),detail=20)
        F.engine(name,loc,r)
    for bank,loc in [('FL',(-5,23,6.6)),('FR',(6,21,6.7)),('ML',(-17,-1,7.5)),
        ('MR',(16,-4,5)),('AL',(-7,-26,7)),('AR',(6,-28,7))]:F.gun(bank,loc,1.8)
    F.done(('body','broken_lobe'))

LOOKS=looks('chaos',L)
LOOKS['HULL'].update(base=(.095,.028,.10),base2=(.145,.038,.14),rough=.48)
LOOKS['GOLD'].update(base=(.56,.31,.034),base2=(.72,.42,.05))
