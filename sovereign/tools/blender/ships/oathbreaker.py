"""OATHBREAKER — a crew-built Cinderwake pirate cruiser; original chined geometry."""
import math,os,sys
sys.path.insert(0,os.path.dirname(__file__))
from _elite import Forge
from _corsair import chine,casing,facet,drive
from _forge import looks,fang
from _atelier import windows
META={'name':'oathbreaker_hero.glb','hull':'cinderwake_heavy_cruiser','tile':4,'bake_size':2048}
L=330.

def build(k):
    F=Forge(k,L,'oathbreaker');s=F.s;M=F.M
    M['BONE']=k.material('BONE',(.47,.43,.34),.55,.42)
    M['WINDOW']=k.material('WINDOW',(.2,.12,.04),.1,.4,emit=(.2,.12,.04))
    # Every station is authored. Hard shoulder breaks replace the rounded stock loft.
    chine(F,'keel',[(46,.2,.5,-.5,-1),(37,3,2,-2,-1),(25,6,3.7,-3.2,0),
        (12,9,4.3,-4,0),(0,11,5.2,-4.2,0),(-15,10,4.8,-4.2,-1),
        (-28,8,3.3,-3.5,-2),(-40,6,2,-2.8,-3),(-45,4,1.8,-2.5,-4)])
    # The long port cutlass and short starboard beak leave an unequal boarding bite.
    chine(F,'port_cutlass',[(54,.15,.4,-.2,-8),(43,1.8,1.3,-1.2,-13),
        (30,3.5,2,-2,-15),(16,3.9,2.7,-2.2,-13),(3,3,2.3,-2,-10),
        (-8,2,2,-1.5,-8)],mat='TRIM')
    chine(F,'starboard_beak',[(39,.2,1,-.4,7),(28,3.4,2.2,-1.8,10),
        (14,4,3,-2.2,12),(0,3.5,2.8,-2,9),(-10,2.5,2,-1.5,7)])
    for i in range(5):
        y=39-i*5.3
        fang(k,'cutting_jaw',F.p((-11.8,y,-.2)),F.p((-8.6,y+1.2,-.6)),.48*s,M['GOLD'],sides=4)

    # Sculpted swept shoulders carry a few large plates over visible service cuts.
    port=[(-6,12),(-19,8),(-31,-13),(-28,-25),(-14,-22),(-5,-6)]
    starboard=[(6,10),(17,5),(27,-12),(23,-25),(12,-20),(5,-4)]
    for side,outline in ((-1,port),(1,starboard)):
        rim,crown=casing(F,'port_mantle' if side<0 else 'starboard_mantle',outline,-.5,2.6,4,
                         center=(side*17,-9))
        # Two recovered ivory plates act as a crew insignia, not a palette repaint.
        for i in ((2,3) if side<0 else (1,2)):
            j=(i+1)%len(rim)
            facet(F,'reclaimed_ivory',[rim[i],rim[j],crown[j],crown[i]],'BONE',outward=(0,0,1))
        F.cable('mantle_feed',[(side*7,4,-1),(side*14,-2,-2),
            (side*22,-13,-2.2),(side*20,-21,-1)],.16)
        F.box('root_truss',(9,3,2.4),(side*11,-11,-1),'TRIM')
        for q in range(6):
            F.box('heat_exchanger',(.18,7,2.5),(side*(21+q*.4),-19,-.8),'TRIM')
    # Offset command blister merges into the starboard shoulder instead of sitting
    # on a generic cube. Its visor faces the open boarding quarter.
    chine(F,'bridge',[(9,1.4,6.7,4.1,3.5),(5,3.5,8.1,4.2,3.5),
        (-4,3.7,8.6,4.3,3.5),(-13,2.8,7,4.1,3),(-18,1.5,5.2,3.8,2)],plate=True)
    for side in (-1,1):
        F.box('visor',(.12,4,.32),(3.5+side*3.56,-1.5,6.3),'WINDOW')
    F.box('forward_visor',(2.5,.10,.30),(3.5,9.05,5.5),'WINDOW')
    k.sensor_mast('pirate_tracker',F.p((5,-8,8.6)),3.7*s,M['TRIM'],M['GLOW'],dish=.8*s)

    # A recessed engineering trench has actual pipes, isolation collars and clamps.
    F.box('reactor_well',(4.8,13,1),(0,-17,4.2),'CORE')
    for side in (-1,1):
        F.beam('well_coaming',[(side*2.5,-10,4.7),(side*2.5,-24,4.1)],.22,'TRIM')
        F.cable('reactor_bus',[(side*1.3,-11,4.9),(side*1.3,-17,4.9),
            (side*2.2,-23,4.4),(side*4,-30,3.4)],.19)
    for i in range(6):
        F.box('reactor_cell',(2.4,.8,.55),(0,-12-i*1.8,4.8),'TRIM')
        F.box('cell_status',(.4,.12,.05),(0,-12-i*1.8,5.11),'GLOW')
    # Boarding collar and cargo locks are kept at crew scale.
    F.ring('boarding_collar',(-4,31,-2),2.0,.24,'TRIM')
    F.ring('boarding_warning',(-4,31.12,-2),1.72,.08,'GOLD')
    k.cylinder('airlock',1.65*s,.16*s,F.p((-4,30.9,-2)),M['CORE'],segs=16)
    for q in (-1,1):F.box('airlock_lock',(.35,.32,1.2),(-4+q*1.5,31.2,-2),'TRIM')
    for y in (16,5,-6):
        F.box('cargo_latch',(1.3,1.0,.4),(-7.7,y,2.8),'GOLD')
    # Unequal propulsion is buried in properly connected root casings.
    chine(F,'port_drive_root',[(-23,4.2,3,-3,-6),(-32,5,2.8,-4,-6),
        (-41,4.5,2,-4,-6),(-45,4.3,1.8,-4,-6)],plate=True)
    chine(F,'starboard_drive_root',[(-17,3.1,2.3,-3,11),(-27,3.6,2,-3.4,12),
        (-35,3.2,1.5,-3.3,12),(-38,3,1.2,-3.2,12)],plate=True)
    drive(F,'MAIN',(-6,-45,-1.1),4.1)
    drive(F,'OFFSET',(12,-38,-1),2.9)
    drive(F,'TRIM',(0,-41,-4),1.5)
    # Broken-circle crew sigil is built from four metal strokes on a real flat hatch.
    F.box('crew_hatch',(4.4,4.4,.18),(-2,7,4.75),'TRIM')
    for a in (0,math.pi/2,math.pi,math.pi*1.5):
        F.beam('unowned_sigil',[(-2+math.cos(a)*1.5,7+math.sin(a)*1.5,4.88),
            (-2+math.cos(a+.9)*1.5,7+math.sin(a+.9)*1.5,4.88)],.08,'BONE')
    for bank,loc in [('FL',(-12,22,3)),('FR',(11,17,3.6)),
        ('ML',(-12,-8,4)),('MR',(14,-11,4))]:F.gun(bank,loc,1.55)
    # Few warm window strips mark the inhabited crew spine, not every machine surface.
    for side in (-1,1):
        windows(k,'crew_windows',side*6.7*s,[q*s for q in (-14,-12,-10,-8,-6)],.6*s,M['WINDOW'],F.p((.07,.28,.17)))
    F.done(())

LOOKS=looks('human_hunters',L)
LOOKS['HULL'].update(base=(.043,.077,.071),base2=(.061,.099,.091),rough=.38)
LOOKS['TRIM'].update(base=(.025,.038,.038),base2=(.037,.054,.054),rough=.32)
LOOKS['GOLD'].update(base=(.36,.17,.055),base2=(.48,.24,.08),rough=.4)
LOOKS['BONE']={**LOOKS['HULL'],'base':(.43,.40,.32),'base2':(.54,.50,.41),'metal':.55}
LOOKS['GLOW']={'emit':(.55,.11,.012)}
LOOKS['WINDOW']={'emit':(.24,.14,.035)}
