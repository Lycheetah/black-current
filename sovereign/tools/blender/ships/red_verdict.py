"""RED VERDICT — uncrewed battleship, twin blade hulls around a recessed accelerator."""
import math,os,sys
sys.path.insert(0,os.path.dirname(__file__))
from _elite import Forge
from _forge import looks
META={'name':'red_verdict_hero.glb','hull':'ai_hunters_battleship','tile':4,'bake_size':2048}
L=1000.

def build(k):
    F=Forge(k,L,'red_verdict');s=F.s;M=F.M
    for side in (-1,1):
        F.hull('blade',[(49,.15,.3,.3,0),(34,3.8,2,2,0),(10,6,3.2,2.8,0),
             (-13,7,3.5,3,0),(-38,5,3.2,3,0),(-44,4,2.5,2.5,0)],x=side*9)
        F.panel('outer_chine',[(side*x,y) for x,y in [(0,32),(6,12),(12,-22),(8,-38),(1,-26),(-1,8)]],
                (side*13,0,-1),.8,'TRIM',kit=(side*4,-12,4,12,28))
        # Repeating red interlocks articulate the inward-facing weapon channel.
        for i in range(16):
            y=28-i*3.9
            F.box('induction_tooth',(2.8,1.5,1.7),(side*3.4,y,-1),'TRIM',5)
            F.box('status_seam',(.10,1.0,.30),(side*2.0,y,-.35),'GLOW')
        F.cable('power_trunk',[(side*11,28,2),(side*12,5,3.4),(side*12,-28,3.4)],.12)
        F.vent('cold_sink',(side*9,-23,3.4),5,11,18)
        F.engine('BLADE_L' if side<0 else 'BLADE_R',(side*9,-45,0),3.7)
        for j in range(3):
            F.panel('aft_fin',[(0,0),(6,-3),(7,-15),(1,-9)],
                (side*(12+j*1.7),-22,-1.4-j*.9),.32,'HULL')
    # The three actual cross members leave a long see-through forward slot.
    for y in (-1,-20,-36):
        F.box('crossmember',(17,4,3.4),(0,y,-2),'HULL',30)
        F.box('bus_bar',(16,1,.2),(0,y,-.12),'GOLD')
    F.box('accelerator',(2.5,42,2.0),(0,-10,-1),'CORE',22)
    for y in range(-27,12,3):F.box('accelerator_light',(.4,.7,.15),(0,y,.05),'GLOW')
    F.panel('command_wedge',[(-4,-7),(4,-7),(6,2),(0,12),(-6,2)],
            (0,-30,1),1.7,'TRIM',kit=(0,-1,5,8,20))
    F.engine('REACTOR',(0,-40,-2),2.0)
    for bank,loc in [('FL',(-10,16,3.5)),('FR',(10,16,3.5)),
        ('ML',(-11,-8,3.8)),('MR',(11,-8,3.8)),('AL',(-9,-32,3.5)),('AR',(9,-32,3.5))]:F.gun(bank,loc,1.25)
    F.done(())

LOOKS=looks('ai_hunters',L)
LOOKS['HULL'].update(base=(.014,.017,.022),base2=(.025,.028,.034),rough=.27)
LOOKS['GLOW']={'emit':(.72,.008,.016)}
