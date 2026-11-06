"""THORN SOVEREIGN · Savanah carrier · 3.2 kilometres.

A broad predatory ark: four plated mandibles, paired cathedral crown blades,
recessed launch galleries and a luminous living-machine valley down its back.
Original design by Caelorynth for Mackenzie Conor James Clark / Lycheetah.
"""
import math,os,sys
sys.path.insert(0,os.path.dirname(__file__))
from _forge import ss,bump,prow,looks,fang,top_z,dress_plate
from _foundry import body,skin,drive,fittings,finish

META={'name':'thorn_sovereign_hero.glb','hull':'savanah_carrier','tile':40.,'bake_size':2048}
L=3200.;S=L/90.;Y=lambda t:L*(.5-t)


def sec(t):
    p=prow(t,.08)
    w=(3.5+4.8*ss(.04,.32,t)+2.7*bump(.57,.20,t))*(1-.50*ss(.75,1,t))*p*S
    top=(2.5+3.4*ss(.06,.35,t)+1.5*bump(.5,.20,t))*p*S
    return w,top,(2.0+2.7*ss(.08,.4,t))*p*S,2.5,-.65*S


def build(k):
    M=k.palette();M['CORE']=k.material('CORE',(.003,.005,.003),.85,.12)
    hull,length,y0,local,conv=body(k,M,L,sec,start=.10,end=.90,rings=46,segs=34)
    skin(k,M,L,local,length,y0,conv,7100,density=1.35)

    # Four segmented mandibles turn up around a long, open, armoured throat.
    for side in (-1,1):
        for low in (0,1):
            z=(-.6-3.2*low)*S
            pts=[(side*5*S,Y(.24),z),(side*(11-low)*S,Y(.14),z-.7*S),
                 (side*(12-low*2)*S,Y(.025),z+(.6-low)*S),
                 (side*6*S,Y(-.055),z+2.5*S),(side*(1.4+low)*S,Y(-.08),z+4*S)]
            r=(2.7 if not low else 1.6)*S
            mand,path=k.limb('mandible',pts,[r,r*.95,r*.65,r*.38,r*.10],
                M['TRIM'] if low else M['HULL'],core_mat=M['TRIM'],sides=8,
                plates=13 if not low else 10,up=(side,0,.7),flare=1.10,tip=2.4)
            for q in range(7 if not low else 4):
                p,r_,(t,sd,up)=path.at(.17+q*.105)
                a=p+up*r_*.78
                fang(k,'mandible_talon',tuple(a),tuple(a+up*(1.6-low*.5)*S-t*.8*S),
                     .36*S,M['GOLD'] if q%3==0 else M['TRIM'],sides=4)
        # Paired sentry eyes, deeply seated in an armoured forward skull.
        eye=(side*4.4*S,Y(.115),2.4*S)
        k.armour_ring('sentry_socket',2.15*S,.42*S,1.2*S,eye,M,
                      rot=(math.pi/2,0,side*.25),blocks=12,gap=.10)
        k.sphere('sentry_eye',1.5*S,(eye[0],eye[1]-.3*S,eye[2]),M['GLOW'],24)

    # A recessed reactor valley between paired, leaning crown blades. Unlike Apex's
    # single central sail, its divided crown leaves the working spine exposed.
    k.tube('living_spine',[(0,Y(.31),6*S),(0,Y(.54),7*S),(0,Y(.80),4*S)],
           [1.1*S,1.4*S,.6*S],M['CORE'],bevel_res=2,res=3)
    for side in (-1,1):
        for q in range(5):
            t=.34+q*.095;w,top,bot,n,zo=sec(t)
            h=(9+8*math.sin(math.pi*(q+.5)/5))*S
            outline=[(0,3*S),(0,-4*S),(h*.32,-7*S),(h*.98,-10*S),
                     (h*.70,-1*S),(h*.36,4*S)]
            crown=k.plate('paired_crown',outline,.65*S,M['TRIM'] if q%2 else M['HULL'],
                 loc=(side*w*.60,Y(t),zo+top*.86),
                 rot=(0,-math.pi/2,0),bevel_w=.12*S)
            dress_plate(k,M,crown,(0,1,0),(0,0,1),(side,0,0),
                        (side*w*.60,Y(t)-1.5*S,zo+top+h*.31),
                        (5*S,h*.48),.28*S,7140+q+(side>0)*10,count=13)
            k.tube('crown_vein',[(side*(w*.60+.35*S),Y(t)+2*S,zo+top),
                 (side*(w*.60+.35*S),Y(t)-3*S,zo+top+h*.70),
                 (side*(w*.60+.35*S),Y(t)-9*S,zo+top+h*.98)],
                 [.10*S,.08*S,.025*S],M['GLOW'],bevel_res=1,res=3)

    # Four swept, heavily dressed launch wings. Dark galleries live under the armour.
    for side in (-1,1):
        for q,(span,sweep) in enumerate(((26,-7),(20,-5))):
            origin=(side*6.5*S,Y(.48+q*.16),-.6*S-q*.9*S)
            outline=[(0,5*S),(side*span*S,(3+sweep)*S),
                     (side*(span+1)*S,(sweep-1)*S),(side*(span-3)*S,(sweep-7)*S),
                     (side*2*S,-11*S)]
            wing=k.plate('launch_wing',outline,1.4*S,M['TRIM'] if q==0 else M['HULL'],
                         loc=origin,bevel_w=.16*S)
            z=top_z(wing)
            k.plane_kit('wing_services',(origin[0]+side*span*.44*S,origin[1]+(sweep*.4-1)*S,z),
                        (1,0,0),(0,1,0),(0,0,1),(span*.58*S,7*S),M,
                        count=25,h=.33*S,seed=7180+q+(side>0)*10)
            for v in range(9):
                u=.1+v*.085
                k.box('wing_pressure_vane',(.3*S,(6-u*2)*S,.4*S),
                      (origin[0]+side*span*u*S,origin[1]+(sweep*u-3)*S,z+.2*S),
                      M['HULL'],rot=(0,0,side*.3))
            for b in range(5):
                x=origin[0]+side*(4+b*2.3)*S;y=origin[1]-7*S
                k.wedge('launch_gallery',(1.7*S,3.5*S,1.4*S),(x,y,z-.9*S),M['CORE'],slope=.28)
                k.light_strip('gallery_beacon',(x-.5*S,y+1.78*S,z-.7*S),
                              (x+.5*S,y+1.78*S,z-.7*S),5,.10*S,M['GLOW'])
            lip=[(origin[0]+side*2*S,origin[1]+4*S,z+.12*S),
                 (origin[0]+side*span*.6*S,origin[1]+(3+sweep*.6)*S,z+.12*S),
                 (origin[0]+side*span*S,origin[1]+(3+sweep)*S,z+.12*S)]
            k.tube('wing_gold_edge',lip,[.25*S,.18*S,.035*S],M['GOLD'],bevel_res=1,res=3)

    # A segmented keel tail and five nested, cowled drives carry the carrier's mass.
    tailpts=[(0,Y(.83),-2*S),(0,Y(.94),-1*S),(0,Y(1.03),2*S)]
    k.limb('tail',tailpts,[3.8*S,2.5*S,.4*S],M['TRIM'],core_mat=M['HULL'],
           sides=8,plates=9,squash=.6,up=(0,0,1),tip=1.5)
    for name,x,z,r in [('PORT',-5,-1.3,2.6),('STARBOARD',5,-1.3,2.6),
                       ('KEEL',0,-4,2.1),('UPPER_PORT',-2.5,3.2,1.5),('UPPER_STARBOARD',2.5,3.2,1.5)]:
        drive(k,M,name,(x*S,Y(.90),z*S),r*S)
    fittings(k,M,L,sec,[('FL',.25,-1),('FR',.25,1),('ML',.77,-1),('MR',.77,1)])
    finish(k,L,'thorn_sovereign',rows=(-.22,-.13,-.04,.05,.14,.23))


LOOKS=looks('savanah',L)
