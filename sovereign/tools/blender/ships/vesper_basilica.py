"""VESPER BASILICA — an inhabited cathedral integrated into a battleship.

Original one-kilometre Amethyst Angels hull for Mackenzie Conor James Clark /
Lycheetah: open lancets, gabled armour, connected buttresses and engineering.
"""
import math,os,sys
sys.path.insert(0,os.path.dirname(__file__))
from _elite import Forge
from _atelier import mesh,windows
from _forge import looks,fang
from mathutils import Vector,Matrix
META={'name':'vesper_basilica_hero.glb','hull':'amethyst_angels_battleship','tile':4,'bake_size':2048}
L=1000.

def arch_outline(w,h):
    return [(-w/2,0),(w/2,0),(w/2,h*.64),(w*.34,h*.84),
            (0,h),(-w*.34,h*.84),(-w/2,h*.64)]

def armour_tile(F,center,U,V,w,h,tone,service=False):
    """Cut plate on a known roof plane, including its own recessed service inset."""
    k=F.k;s=F.s;M=F.M
    C=Vector(center);U=Vector(U).normalized();V=Vector(V).normalized();N=U.cross(V).normalized()
    cut=min(w,h)*.17
    outline=[(-w/2+cut,-h/2),(w/2,-h/2),(w/2,h/2-cut),
             (w/2-cut,h/2),(-w/2,h/2),(-w/2,-h/2+cut)]
    verts=[tuple((C+U*x+V*y+N*z)*s) for z in (.035,.16) for x,y in outline]
    n=len(outline);faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]
    faces.extend((i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n))
    ob=mesh(k,'cut_roof_armour',verts,faces,M[tone],smooth=False)
    k.bevel(ob,.025*s,1);k.weighted_normals(ob)
    R=Matrix((U,V,N)).transposed().to_euler()
    def fitted(name,size,du,dv,dn,mat):
        ob=k.box(name,F.p(size),tuple((C+U*du+V*dv+N*dn)*s),M[mat],rot=R)
        k.bevel(ob,.02*s,1)
        return ob
    # Engineering panels have a dark reveal, a raised rim and protected feed lines.
    if service:
        fitted('roof_service_well',(w*.47,h*.50,.035),0,0,.18,'CORE')
        for edge in (-1,1):
            fitted('service_coaming',(.08,h*.54,.08),edge*w*.25,0,.21,'TRIM')
        for j in range(4):
            fitted('cooling_louvre',(w*.38,.10,.09),0,(-.18+j*.12)*h,.22,'TRIM')
        fitted('service_status',(.23,.10,.04),w*.17,h*.19,.25,'GLOW')
    else:
        fitted('roof_inset',(.075,h*.62,.025),-w*.27,0,.18,'CORE')
        fitted('armour_identifier',(w*.30,.065,.025),w*.12,-h*.28,.18,'GOLD')
    for edge in (-1,1):
        fitted('armour_fastener',(.09,.09,.05),edge*w*.36,-h*.34,.19,'GOLD')

def lancet(F,name,x,y,z,w,h,band,depth):
    """Closed frame with a real opening, extruded through X."""
    k=F.k;s=F.s
    outer=arch_outline(w,h)
    inner=[(a,b+band) for a,b in arch_outline(w-2*band,h-2*band)]
    verts=[]
    for xx in (x-depth/2,x+depth/2):
        for ring in (outer,inner):
            verts.extend(F.p((xx,y+a,z+b)) for a,b in ring)
    n=len(outer);faces=[]
    for i in range(n):
        j=(i+1)%n
        faces.extend(((i,j,n+j,n+i),(2*n+i,3*n+i,3*n+j,2*n+j),
                      (i,2*n+i,2*n+j,j),(n+i,n+j,3*n+j,3*n+i)))
    ob=mesh(k,name,verts,faces,F.M['TRIM'],smooth=False)
    k.bevel(ob,.045*s,2);k.weighted_normals(ob)
    side=1 if x>0 else -1
    line=[(x+side*(depth/2+.035),y+a,z+b) for a,b in inner]
    F.beam(name+'_gold',line+[line[0]],.055,'GOLD')
    return ob

def roof(F,name,y,w,d,eave,ridge):
    """Solid gabled armour with independent ridge, slope and eave faces."""
    profile=[(-w/2,eave-.6),(w/2,eave-.6),(w/2,eave),
             (w*.30,ridge-1.1),(0,ridge),(-w*.30,ridge-1.1),(-w/2,eave)]
    verts=[F.p((x,yy,z)) for yy in (y-d/2,y+d/2) for x,z in profile]
    n=len(profile);faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]
    faces.extend((i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n))
    ob=mesh(F.k,name,verts,faces,F.M['HULL'],smooth=False)
    F.k.bevel(ob,.11*F.s,2);F.k.weighted_normals(ob)
    for side in (-1,1):
        F.beam('gilded_eave',[(side*w/2,y-d/2,eave+.03),(side*w/2,y+d/2,eave+.03)],.075,'GOLD')
        # Split the two real roof slopes into individual overlapping armour courses.
        for band,(a,b) in enumerate((((0,ridge),(w*.30,ridge-1.1)),
                                     ((w*.30,ridge-1.1),(w/2,eave)))):
            A=Vector((side*a[0],0,a[1]));B=Vector((side*b[0],0,b[1]));U=(B-A).normalized()
            V=Vector((0,side,0));span=(B-A).length
            for j in range(4):
                C=(A+B)/2+Vector((0,y-d*.36+j*d*.24,0))
                armour_tile(F,C,U,V,span*.92,d*.215,
                            'TRIM' if (j+band)%3==0 else 'HULL',service=(j+band)%3==1)
        for j in range(4):
            yy=y-d*.34+j*d*.22
            F.beam('roof_armour_rib',[(side*.2,yy,ridge+.1),
                (side*w*.30,yy,ridge-.98),(side*w*.49,yy,eave+.14)],.09,'TRIM')

def build(k):
    F=Forge(k,L,'vesper_basilica');s=F.s;M=F.M
    M['WINDOW']=k.material('WINDOW',(.23,.17,.10),.1,.45,emit=(.23,.17,.10))
    # Broad forequarters and an undercut stern carry the citadel, rather than
    # serving as the dominant repeated form in the silhouette.
    F.hull('body',[(46,.2,.6,1,-1),(34,5,4,5,-1),(18,7,5,6,-1),
        (-7,8,5,6,-1),(-28,7,4,5,-1),(-42,4,2.8,3,-1)])
    bays=[(25,15),(15,22),(5,29),(-5,33),(-15,29),(-25,21)]
    for i,(y,h) in enumerate(bays):
        base=5.5;eave=base+h*.76;ridge=base+h
        # Separate roof cassettes and recessed inner walls create actual depth.
        F.box('nave_core',(8.6,9.4,eave-base),(0,y,(base+eave)/2),'HULL')
        roof(F,'gabled_nave',y,13.8,9.5,eave,ridge)
        for side in (-1,1):
            lancet(F,'nave_lancet',side*6.7,y,base,7.7,h*.70,.43,.65)
            lancet(F,'inner_lancet',side*5.6,y,base+.6,6.6,h*.64,.22,.20)
            F.box('dark_recess',(.22,6.6,h*.58),(side*4.5,y,base+h*.30),'CORE')
            rz=base+h*.49;rr=min(1.65,h*.10)
            F.ring('rose_window',(side*5.85,y,rz),rr,.10,'GOLD',rot=(0,math.pi/2,0))
            for q in range(8):
                a=math.tau*q/8
                F.beam('rose_tracery',[(side*5.86,y,rz),
                    (side*5.86,y+math.cos(a)*rr,rz+math.sin(a)*rr)],.035,'TRIM')
            F.box('rose_ember',(.10,.36,.65),(side*5.9,y,rz),'GLOW')
            for row in range(3):
                zz=base+2+row*max(1.3,h*.10)
                ys=[(y-2.8+q*.34)*s for q in range(17) if (q+row+i)%6 not in (0,1)]
                windows(k,'inhabited_gallery',side*4.66*s,ys,zz*s,M['WINDOW'],F.p((.06,.13,.15)))
                F.box('gallery_deck',(.65,6.3,.18),(side*4.85,y,zz-.25),'TRIM')
            for end in (-1,1):
                F.box('nave_pier',(1.25,.8,eave-base),(side*6.7,y+end*4.35,(base+eave)/2),'TRIM')
                F.box('pier_cap',(1.65,1.2,.5),(side*6.7,y+end*4.35,eave),'GOLD')
            # Purpose-shaped webs have open interiors and anchored maintenance feet.
            ztop=base+h*.67
            web=[(5.5,5),(11.4,4),(14.5,8),(13.8,13),(10.6,ztop-4),
                 (7,ztop+1),(6.2,ztop),(9,ztop-5),(11.4,12),(11.5,8),(7,6.8)]
            F.panel('flying_buttress',[(side*x0,z0) for x0,z0 in web],(0,y-3.2,0),.85,
                    'TRIM',rot=(math.pi/2,0,0))
            F.beam('buttress_inlay',[(side*11.8,y-4.1,5.5),(side*13.7,y-4.1,8.3),
                (side*12.9,y-4.1,12.6),(side*10,y-4.1,ztop-4),(side*6.8,y-4.1,ztop+.2)],.065,'GOLD')
            F.box('buttress_foot',(3.4,4.0,2.2),(side*12,y-3.5,4),'HULL')
            F.vent('foot_heat_sink',(side*12,y-3.5,5.14),2.3,2.5,7)
            for q in (-1,1):
                F.box('foot_fastener',(.2,.2,.12),(side*12+q*1.2,y-2.5,5.17),'GOLD')
        fang(k,'ridge_finial',F.p((0,y-2,ridge-.6)),F.p((0,y-5,ridge+3.7)),.62*s,M['TRIM'],sides=5)
        F.beam('ridge_seam',[(0,y-4.6,ridge+.08),(0,y+4.6,ridge+.08)],.075,'GOLD')

    for side in (-1,1):
        F.hull('aisle',[(34,.2,1,1,0),(25,2.9,3.1,2.8,0),
            (-10,3.2,3.8,3,0),(-34,2.8,2.9,2.7,0)],x=side*11)
        for i,y in enumerate((23,13,3,-7,-17,-27)):
            F.panel('aisle_shield',[(side*x,y0) for x,y0 in [(8,3),(14,2),(15,-3),(10,-4),(8,-1)]],
                (0,y,3.5),.55,'HULL',kit=(side*11.5,-.4,3,2,9))
            F.box('recessed_aisle_port',(.12,3.2,.65),(side*14.15,y,.45),'CORE')
            for q in range(5):
                F.box('aisle_window',(.13,.24,.18),(side*14.23,y-1.15+q*.56,.55),'WINDOW')
        for y in (22,2,-18,-31):
            F.box('aisle_web',(9,2.5,2.5),(side*7,y,-.5),'TRIM')
            F.cable('aisle_power',[(side*5,y,1),(side*8,y-1,1),(side*11,y-2,2)],.12)
        F.spar('spar_prow_guard',[(side*8,20,-1),(side*15,32,-1),
            (side*13,46,1),(side*7,52,2)],[2.5,2.5,1.4,.25],plates=14)
        F.beam('prow_edge',[(side*8,21,1),(side*14.6,32,1.1),
            (side*12.6,45,2),(side*7,51,2.3)],.08,'GOLD')
        F.box('engine_neck',(5.5,12,5.5),(side*10.7,-34,-.5),'HULL')
        F.engine('AISLE_L' if side<0 else 'AISLE_R',(side*10.7,-42,-.5),3.1)
        F.panel('aft_mantle',[(side*x,y) for x,y in [(7,-22),(13,-24),(17,-39),
            (15,-46),(10,-38),(7,-30)]],(0,0,3.6),.85,'TRIM',kit=(side*11,-31,3,8,16))
        F.vent('engineering_radiator',(side*10.7,-32,2.32),3.2,6.5,13)

    chapel=k.wedge('forechapel',F.p((9,14,7)),F.p((0,31,4)),M['HULL'],slope=.22,back=.08)
    k.bevel(chapel,.18*s,2);k.weighted_normals(chapel)
    for side in (-1,1):
        F.panel('chapel_brow',[(side*x,y) for x,y in [(0,0),(3.4,-.4),(4.2,-3),
            (1.5,-4.4),(0,-2.6)]],(0,36,7.55),.35,'TRIM')
        F.box('chapel_optic',(2.7,.16,.28),(side*2.1,36.8,5.3),'GLOW')
    F.panel('ventral_keel',[(-2.5,34),(-4,-22),(0,-45),(4,-22),(2.5,34)],
            (0,0,-6.2),.6,'TRIM',kit=(0,-8,3,18,16))
    F.engine('CRYPT',(0,-43,-3),2.5)
    for bank,loc in [('FL',(-11,22,4.1)),('FR',(11,22,4.1)),
        ('ML',(-12,-3,5)),('MR',(12,-3,5)),('AL',(-11,-27,4)),('AR',(11,-27,4))]:
        F.gun(bank,loc,1.35)
    F.done(('body','aisle','forechapel'))

LOOKS=looks('amethyst_angels',L)
LOOKS['HULL'].update(base=(.032,.023,.046),base2=(.046,.032,.064),rough=.37)
LOOKS['TRIM'].update(base=(.074,.058,.10),base2=(.10,.077,.13),rough=.32)
LOOKS['GOLD'].update(base=(.41,.26,.075),base2=(.55,.36,.12),rough=.29)
LOOKS['GLOW']={'emit':(.22,.025,.52)}
LOOKS['WINDOW']={'emit':(.17,.115,.045)}
