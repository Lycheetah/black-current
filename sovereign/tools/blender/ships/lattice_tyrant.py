"""LATTICE TYRANT — modular uncrewed dreadnought on a completely open frame."""
import math,os,sys
sys.path.insert(0,os.path.dirname(__file__))
from _elite import Forge
from _forge import looks
META={'name':'lattice_tyrant_hero.glb','hull':'ai_dreadnought','tile':4,'bake_size':2048}
L=3000.

def build(k):
    F=Forge(k,L,'lattice_tyrant');s=F.s;M=F.M
    # Four long rails and transverse rectangular frames define the hull itself.
    for side in (-1,1):
        for z in (-7,7):
            F.box('longitudinal_rail',(2.3,85,2.3),(side*12,0,z),'HULL',30)
            F.beam('data_bus',[(side*12,-40,z+1.3),(side*12,40,z+1.3)],.08,'GLOW')
        for y in (-37,-21,-5,11,27,41):
            F.box('vertical_frame',(2.4,2.4,14),(side*12,y,0),'TRIM',12)
        for j in range(5):
            y=-37+j*16
            F.beam('diagonal_lattice',[(side*12,y,-6),(side*12,y+16,6)],.42)
            F.beam('counter_lattice',[(side*12,y,6),(side*12,y+16,-6)],.26,'GOLD')
        # Actual square drive frames surround the recessed circular bells.
        for z in (-7,7):
            F.box('drive_top',(7,7,1.2),(side*12,-42,z+3.3),detail=10)
            F.box('drive_bottom',(7,7,1.2),(side*12,-42,z-3.3),detail=10)
            for dx in (-3.3,3.3):F.box('drive_side',(1.2,7,5.5),(side*12+dx,-42,z),'TRIM',10)
            F.engine(('L' if side<0 else 'R')+('UP' if z>0 else 'DN'),(side*12,-44,z),2.5)
    for y in (-37,-21,-5,11,27,41):
        for z in (-7,7):
            F.box('cross_frame',(24,2.3,2.3),(0,y,z),'TRIM',22)
    # Replaceable machinery cartridges occupy three separated bays.
    for i,y in enumerate((-28,4,34)):
        F.box('compute_cartridge',(15,9,9),(0,y,0),'HULL',60)
        F.box('cartridge_socket',(18,2,11),(0,y-5,0),'TRIM',22)
        for j in range(6):
            F.box('heat_stack',(.65,7,5.5),(-5+j*2,y,6.5),'TRIM',7)
            F.box('stack_indicator',(.16,.5,.25),(-5+j*2,y+3.6,8.9),'GLOW')
        for side in (-1,1):
            F.cable('cartridge_cable',[(side*7,y,3),(side*10,y+2,4),(side*12,y+3,7)],.18)
    F.box('axial_accelerator',(3.5,72,3.5),(0,7,-3),'CORE',46)
    for i in range(18):
        y=-26+i*4
        F.box('accelerator_clamp',(5,1,1),(0,y,-.8),'GOLD',4)
    F.panel('forward_visor',[(-12,0),(-10,8),(-3,15),(3,15),(10,8),(12,0)],
        (0,39,5.8),1.3,'HULL',kit=(0,5,12,4,26))
    for bank,loc in [('FL',(-12,29,8.3)),('FR',(12,29,8.3)),('ML',(-12,0,8.3)),
        ('MR',(12,0,8.3)),('AL',(-12,-29,8.3)),('AR',(12,-29,8.3))]:F.gun(bank,loc,1.5)
    F.done(())

LOOKS=looks('ai',L)
LOOKS['HULL'].update(base=(.105,.13,.145),base2=(.15,.18,.19),rough=.36)
LOOKS['GLOW']={'emit':(.012,.50,.63)}
