"""WAKE-EATER — a Nacre archive corsair grown as a chambered memory reef.

Original alien anatomy: logarithmic volute, exposed septa, living mantle,
sensory rostra and three organic siphon drives. No humanoid bridge or windows.
Mackenzie Conor James Clark / Lycheetah, authored with Caelorynth.
"""
import math,os,sys
sys.path.insert(0,os.path.dirname(__file__))
from _elite import Forge
from _atelier import mesh,ribbon
from _corsair import solid
from _forge import looks
META={'name':'wake_eater_hero.glb','hull':'nacre_cruiser','tile':4,'bake_size':2048}
L=280.
END=math.pi*4.7


def shell_point(t,a,scale=1):
    r=2.8*math.exp(.151*t)
    width=(2.4+r*.30)*scale;rad=(1.1+r*.215)*scale
    return (math.cos(a)*width,-7+r*math.cos(t)+math.sin(a)*rad*math.cos(t),
            2+r*math.sin(t)+math.sin(a)*rad*math.sin(t))


def volute(F):
    k=F.k;s=F.s;N=240;S=32
    verts=[shell_point(END*i/N,math.tau*j/S) for i in range(N+1) for j in range(S)]
    faces=[tuple(reversed(range(S)))]
    faces.extend((i*S+j,i*S+(j+1)%S,(i+1)*S+(j+1)%S,(i+1)*S+j)
                 for i in range(N) for j in range(S))
    # A short inner wall leaves a true open aperture at the mature end.
    inner_start=len(verts)
    verts.extend(shell_point(END-.7+.7*i/8,math.tau*j/S,.82) for i in range(9) for j in range(S))
    for i in range(8):
        for j in range(S):
            jj=(j+1)%S
            faces.append((inner_start+i*S+j,inner_start+(i+1)*S+j,
                          inner_start+(i+1)*S+jj,inner_start+i*S+jj))
    for j in range(S):
        jj=(j+1)%S
        faces.append((N*S+j,N*S+jj,inner_start+8*S+jj,inner_start+8*S+j))
    ob=mesh(k,'living_volute',[F.p(v) for v in verts],faces,F.M['HULL'])
    k.smooth(ob)
    # Growth rings remain attached to the analytic surface, so there are no free
    # decorative hoops. Irregular spacing suggests successive repair seasons.
    for i in range(35):
        t=.8+(END-.95)*i/34
        pts=[shell_point(t,math.tau*j/32,1.012) for j in range(33)]
        F.beam('mineral_growth_ring',pts,.075+.025*(i%3),'GOLD' if i%4==0 else 'TRIM')
    # Nacre lamellae lift gently over the previous season's shell.
    for band in range(11):
        ta=3.2+band*.93;tb=ta+.72
        for side in (-1,1):
            aa=-.85 if side>0 else math.pi-.85
            points=[]
            for i in range(7):
                for j in range(7):points.append(shell_point(ta+(tb-ta)*i/6,aa+j*1.65/6,1.023))
            fs=[(i*7+j,i*7+j+1,(i+1)*7+j+1,(i+1)*7+j) for i in range(6) for j in range(6)]
            plate=mesh(k,'nacre_lamella',[F.p(v) for v in points],fs,F.M['HULL'])
            k.solidify(plate,.065*s);k.bevel(plate,.025*s,1);k.smooth(plate)
    return ob


def siphon(F,name,x,y,z,r):
    k=F.k;s=F.s;S=28
    # The organ flares aft and folds back inward to a dark throat.
    rings=[(y+5,r*.52),(y+2,r*.80),(y,r),(y-.3,r*1.04),
           (y-.4,r*.79),(y+2,r*.55)]
    verts=[(x+math.cos(a)*rr,yy,z+math.sin(a)*rr*.85)
           for yy,rr in rings for a in (math.tau*j/S for j in range(S))]
    faces=[(i*S+j,i*S+(j+1)%S,(i+1)*S+(j+1)%S,(i+1)*S+j)
           for i in range(len(rings)-1) for j in range(S)]
    ob=mesh(k,'siphon_shell',[F.p(v) for v in verts],faces,F.M['HULL']);k.smooth(ob)
    k.cylinder('siphon_throat',r*.56*s,.10*s,F.p((x,y+1.9,z)),F.M['CORE'],segs=28)
    k.cylinder('siphon_heart',r*.40*s,.11*s,F.p((x,y+1.82,z)),F.M['GLOW'],segs=28)
    F.ring('siphon_ignition',(x,y-.38,z),r*.87,.06,'GLOW')
    k.empty('ENGINE_'+name,F.p((x,y-.5,z)),r*.7*s)


def build(k):
    F=Forge(k,L,'wake_eater');s=F.s;M=F.M
    mantle=k.sphere('memory_mantle',1,F.p((0,-7,-2)),M['CORE'],segs=40)
    mantle.scale=F.p((8.5,22,7))
    volute(F)
    # Thin living rostra establish forward direction and a very different planform
    # from a human pirate cutter. Their roots disappear into the living mantle.
    for side in (-1,1):
        pts=[(side*5,4,-4),(side*10,18,-7),(side*9,35,-8),(side*3,51,-6)]
        ob=ribbon(k,'sensory_rostrum',[F.p(p) for p in pts],
            [v*s for v in (2.7,2.1,1.2,.12)],[v*s for v in (1.2,.8,.45,.06)],M['TRIM'],sides=10)
        k.bevel(ob,.04*s,1);k.smooth(ob)
        F.beam('rostral_signal',[(side*5,4,-2.9),(side*10,18,-6.2),
            (side*9,35,-7.55),(side*3,50,-5.9)],.07,'GLOW')
        # A smaller lower vane sweeps aft, balancing the single coiled upper mass.
        pts=[(side*6,-7,-4),(side*14,-18,-9),(side*13,-33,-10),(side*6,-40,-7)]
        vane=ribbon(k,'ventral_vane',[F.p(p) for p in pts],
            [v*s for v in (2.4,3.5,2,.18)],[v*s for v in (1,.8,.5,.08)],M['HULL'],sides=10)
        k.smooth(vane)
        # Gun organs are supported by living roots, with mineral mounting saddles.
        for bank,y,z in ((('FL' if side<0 else 'FR'),16,-1.2),
                         (('ML' if side<0 else 'MR'),-12,2.0)):
            x=side*(8 if y>0 else 9)
            arm=ribbon(k,'battery_root',[F.p((side*4,y-7,-3)),F.p((side*6,y-3,z-1)),F.p((x,y,z))],
                [2*s,1.8*s,1.6*s],[1.5*s,1.4*s,1.4*s],M['TRIM'],sides=10)
            k.smooth(arm)
            pad=k.sphere('mineral_saddle',1.6*s,F.p((x,y,z)),M['HULL'],segs=24)
            F.gun(bank,(x,y,z+1.4),1.12)
        # Sensory pores replace human windows; every pore is seated in the mantle.
        for i in range(13):
            y=-18+i*2.4
            x=side*8.5*math.sqrt(max(.01,1-((y+7)/22)**2-(1.5/7)**2))*1.006
            ob=k.sphere('sensory_pore',.21*s,F.p((x,y,-.5)),M['GLOW'],segs=12)
            ob.scale=(.45,1,.8)
        # Root nodules physically connect siphons to the rear of the mantle.
        root=k.sphere('siphon_root',3.5*s,F.p((side*5.4,-25,-2.7)),M['HULL'],segs=28)
        root.scale=(1,1.35,1)
        siphon(F,'PORT' if side<0 else 'STARBOARD',side*5.4,-31,-2.7,2.9)
    siphon(F,'VENTRAL',0,-30,-7.0,2.1)
    # A visible memory septum occupies the open end of the shell, with no face or
    # cockpit implied. Its small inner filaments share the shell's local anatomy.
    t=END;r=2.8*math.exp(.151*t)
    cy=-7+r*math.cos(t);cz=2+r*math.sin(t)
    core=k.sphere('archive_septum',1,F.p((0,cy,cz)),M['CORE'],segs=28)
    core.scale=F.p((4.2,2.8,3.4))
    for q in range(9):
        x=-3.2+q*.8
        F.beam('memory_filament',[(x,cy-1.8,cz-1.8),(x,cy-2.0,cz),(x,cy-1.4,cz+1.7)],.035,'GLOW')
    F.done(())


LOOKS=looks('sol_symbiots',L)
LOOKS['HULL'].update(base=(.48,.43,.33),base2=(.55,.50,.40),
    mottle_col=(.43,.40,.33),rough=.34,metal=.35,bump=.10,panels=.16,cells=.20)
LOOKS['TRIM'].update(base=(.035,.061,.052),base2=(.047,.078,.067),rough=.49,metal=.25)
LOOKS['GOLD'].update(base=(.14,.24,.18),base2=(.20,.31,.24),rough=.38,metal=.45)
LOOKS['CORE'].update(base=(.013,.026,.022),base2=(.023,.041,.034),rough=.68,metal=.08)
LOOKS['GLOW']={'emit':(.018,.38,.24)}
