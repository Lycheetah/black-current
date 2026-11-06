"""RIVET HOUND · Human Hunters assault frigate · 70 metres.

An inhabited pursuit engine: asymmetric cowled drives, trussed outriggers,
layered olive glacis and maintenance corridors through an exposed frame.
Designed by Caelorynth for Mac / Lycheetah, using the established Apex ship kit.
"""
import math,os,sys
sys.path.insert(0,os.path.dirname(__file__))
from _forge import ss,bump,prow,looks,top_z,dress_plate
from _foundry import body,skin,drive,fittings,finish

META={'name':'rivet_hound_hero.glb','hull':'human_hunters_assault_frigate','tile':4.0,'bake_size':2048}
L=70.;S=L/80.;Y=lambda t:L*(.5-t)


def sec(t):
    p=prow(t,.07)
    w=(2.2+2.8*ss(.1,.36,t)+.9*bump(.42,.12,t))*(1-.35*ss(.72,.95,t))*p*S
    top=(1.4+1.5*ss(.1,.4,t)+1.3*bump(.5,.14,t))*p*S
    return w,top,(1.5+1.1*ss(.1,.6,t))*p*S,3.1,-.3*S


def build(k):
    M=k.palette();M['CORE']=k.material('CORE',(.006,.008,.006),.6,.55)
    hull,length,y0,local,conv=body(k,M,L,sec,rings=44,segs=30)
    skin(k,M,L,local,length,y0,conv,5100,density=1.15)

    # The broad hammerhead and its ventral ram distinguish it from a paired-boom frigate.
    outline=[(-8.5*S,-2.8*S),(-7.6*S,1.8*S),(-3.8*S,4*S),
             (3.8*S,4*S),(7.6*S,1.8*S),(8.5*S,-2.8*S),
             (4*S,-2*S),(2*S,-4*S),(-2*S,-4*S),(-4*S,-2*S)]
    prow_plate=k.plate('hammerhead',list(reversed(outline)),2.4*S,M['TRIM'],
                       loc=(0,Y(.12),-1*S),bevel_w=.14*S)
    k.weighted_normals(prow_plate)
    k.plane_kit('hammerhead_service',(0,Y(.12),1.44*S),(1,0,0),(0,1,0),(0,0,1),
                (10*S,4*S),M,count=20,h=.23*S,seed=5110)
    keel=k.plate('ventral_ram',[(0,10*S),(-1.2*S,3*S),(-1.6*S,-14*S),
                 (0,-19*S),(1.6*S,-14*S),(1.2*S,3*S)],.65*S,M['TRIM'],
                 loc=(0,Y(.35),-3*S),bevel_w=.08*S)

    for side in (-1,1):
        px=side*(10.0 if side<0 else 8.7)*S
        # Pods have a panelled, tapered cage rather than a primitive cylinder.
        def pod(t):
            p=prow(t,.13)
            r=(1.5+.75*ss(.08,.45,t))*(1-.16*ss(.82,1,t))*p*S
            return r,r*.9,r*.9,3.0,0
        podbody=k.loft('outrigger',43*S,pod,rings=26,segs=20,mat=M['HULL'],y0=18*S)
        k.panelize(podbody,26,20,skip_row=3,skip_col=4,depth=.065*S,thickness=.075*S,
                   keep=lambda i,j:3<=i<=23)
        k.bevel(podbody,.07*S,1);k.weighted_normals(podbody);k.smooth(podbody)
        podbody.location.x=px;podbody.location.z=-.5*S
        # Three open triangular trusses preserve the negative space through the ship.
        for n,y in enumerate((12*S,-3*S,-17*S)):
            for z in (-1.3*S,1.5*S):
                k.tube('load_strut',[(side*3*S,y,z),(px,y-3*S,z-.5*S)],
                       [.33*S,.29*S],M['TRIM'],bevel_res=1,res=1)
            k.tube('diagonal_strut',[(side*3*S,y,1.5*S),(px,y-3*S,-1.8*S)],
                   [.19*S,.19*S],M['GOLD'],bevel_res=1,res=1)
        # Local machinery is grouped into actual maintenance bays on top of each pod.
        for i,y in enumerate((8*S,-3*S,-14*S)):
            k.plane_kit('service_pod',(px,y,1.9*S),(1,0,0),(0,1,0),(0,0,1),
                        (3.3*S,8*S),M,count=16,h=.23*S,seed=5120+i+(side>0)*10)
        k.conduit('fuel_trunk',[(side*3.5*S,9*S,-1*S),(px,5*S,-1.8*S),
                   (px,-11*S,-2.2*S),(px,-21*S,-1*S)],.18*S,M['TRIM'],clamps=7,clamp_mat=M['GOLD'])
        for i in range(14):
            ob=k.box('radiator_vane',(.14*S,5*S,2.3*S),(px+side*2.1*S,(-9-i*.8)*S,-.2*S),M['TRIM'],rot=(0,side*.12,0))
            k.bevel(ob,.025*S,1)
        drive(k,M,'PORT' if side<0 else 'STARBOARD',(px,-25*S,-.5*S),
              (2.6 if side<0 else 2.05)*S)
        # Pursuit stripes are inset armoured strips rather than giant luminous panels.
        for q in range(4):
            k.plate('pursuit_stripe',[(0,0),(1.3*S,.5*S),(1.3*S,1.1*S),(0,.6*S)],
                    .045*S,M['GOLD'],loc=(side*(5.1+q*.5)*S,Y(.12)-.8*S,1.44*S),bevel_w=.015*S)

    # Offset, glazed bridge and sensor cradle, with a denser silhouette around its root.
    cabin=k.wedge('bridge', (4.5*S,9*S,3*S),(-1.4*S,Y(.49),4.5*S),M['TRIM'],slope=.40,back=.2)
    k.bevel(cabin,.12*S,2);k.weighted_normals(cabin)
    k.box_kit('bridge_hardware',(-1.4*S,Y(.49),4.5*S),(4.5*S,9*S,3*S),M,
              count=18,h=.20*S,seed=5150,faces=('top','left','right'))
    for q in range(7):
        k.box('bridge_glass',(.28*S,.08*S,.33*S),(-2.7*S+q*.40*S,Y(.49)+3.25*S,5*S),M['GLOW'])
    k.sensor_mast('tracking_mast',(1.7*S,Y(.57),5.5*S),4.8*S,M['TRIM'],M['GLOW'],dish=1.1*S)
    drive(k,M,'KEEL',(0,Y(.94),-1.4*S),1.65*S)
    fittings(k,M,L,sec,[('FL',.24,-1),('FR',.24,1),('ML',.70,-.25)])
    finish(k,L,'rivet_hound',targets=('body','outrigger'),rows=(-.10,.02,.12))


LOOKS=looks('human_hunters',L)
LOOKS['HULL'].update(base=(.065,.071,.042),base2=(.087,.091,.055),mottle_col=(.048,.055,.033))
LOOKS['GOLD'].update(base=(.64,.31,.065),base2=(.52,.22,.04),edge=(.9,.64,.25))
