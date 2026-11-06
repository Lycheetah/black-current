"""Production tools for Mac's nine original hulls. Dimensions use hundredths of length.

Shared construction, not shared silhouettes: every ship module owns its composition.
Mackenzie Conor James Clark / Lycheetah; authored with Caelorynth.
"""
import math
from mathutils import Vector, Euler
from _atelier import station_section, save_source
from _forge import armour, machinery_bands, conduits, dress_plate, barbette
from _foundry import drive


class Forge:
    def __init__(self,k,length,slug):
        self.k=k;self.L=length;self.s=length/100;self.slug=slug;self.seed=7000
        self.M=k.palette()
        self.M['CORE']=k.material('CORE',(.009,.012,.018),.7,.5)

    def p(self,v): return tuple(q*self.s for q in v)

    def hull(self,name,stations,x=0,detail=True):
        k=self.k;s=self.s;M=self.M
        stations=[tuple(q*s for q in row) for row in stations]
        sec=station_section(stations);length=stations[0][0]-stations[-1][0];y0=stations[0][0]
        ob=k.loft(name,length,sec,rings=38,segs=28,mat=M['HULL'],y0=y0)
        k.panelize(ob,38,28,skip_row=3,skip_col=4,depth=.065*s,thickness=.09*s,
                   keep=lambda i,j:2<i<35)
        k.bevel(ob,.055*s,1);k.weighted_normals(ob);k.smooth(ob)
        if detail:
            import bpy
            before=set(bpy.context.scene.objects)
            armour(k,M,sec,length,y0,lambda t:t,
                dorsal=((.12,.23),(.26,.37),(.42,.53),(.66,.77),(.80,.90)),
                flanks=((.14,.30),(.34,.49),(.53,.68),(.72,.88)),thick=.16*s,seed=self.seed)
            machinery_bands(k,M,sec,length,y0,lambda t:t,.12,.90,.30*s,
                            seed=self.seed+30,dorsal_gap=(.54,.65),density=1)
            conduits(k,M,sec,length,y0,lambda t:t,(.15,.30,.45,.60,.75,.88),.08*s)
            for part in set(bpy.context.scene.objects)-before: part.location.x+=x*s
        ob.location.x=x*s;self.seed+=100
        return ob

    def box(self,name,size,loc,mat='HULL',detail=0,rot=0):
        k=self.k;s=self.s
        ob=k.box(name,self.p(size),self.p(loc),self.M[mat],rot=(0,0,rot))
        k.bevel(ob,min(size)*s*.045,1);k.weighted_normals(ob)
        if detail:
            k.box_kit(name+'_service',self.p(loc),self.p(size),self.M,rot_z=rot,
                      count=detail,h=.16*s,seed=self.seed)
            self.seed+=1
        return ob

    def panel(self,name,outline,loc=(0,0,0),thick=.5,mat='HULL',rot=(0,0,0),kit=None):
        k=self.k;s=self.s
        # Positive winding keeps the actual plate face and its attachments together.
        area=sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(outline,outline[1:]+outline[:1]))
        if area<0:outline=list(reversed(outline))
        ob=k.plate(name,[(x*s,y*s) for x,y in outline],thick*s,self.M[mat],
                   loc=self.p(loc),rot=rot,bevel_w=.07*s)
        k.weighted_normals(ob)
        if kit:
            cx,cy,w,h,count=kit;R=Euler(rot).to_matrix()
            C=Vector(self.p(loc))+R@Vector(self.p((cx,cy,0)))
            dress_plate(k,self.M,ob,R@Vector((1,0,0)),R@Vector((0,1,0)),R@Vector((0,0,1)),
                        C,(w*s,h*s),.18*s,self.seed,count=count,both=True,name=name+'_inlay')
            self.seed+=2
        return ob

    def beam(self,name,pts,r=.3,mat='TRIM'):
        return self.k.tube(name,[self.p(v) for v in pts],[r*self.s]*len(pts),
                           self.M[mat],bevel_res=1,res=2)

    def cable(self,name,pts,r=.16):
        return self.k.conduit(name,[self.p(v) for v in pts],r*self.s,self.M['TRIM'],
                              clamps=8,clamp_mat=self.M['GOLD'])

    def spar(self,name,pts,radii,mat='TRIM',plates=12,squash=.7):
        return self.k.limb(name,[self.p(v) for v in pts],[r*self.s for r in radii],
                           self.M[mat],core_mat=self.M['CORE'],sides=8,
                           squash=squash,plates=plates,n_per=6)

    def ring(self,name,loc,R,r,mat='TRIM',rot=(math.pi/2,0,0),arc=math.tau):
        return self.k.torus(name,R*self.s,r*self.s,self.p(loc),self.M[mat],
                            rot=rot,arc=arc,segs=64,rsegs=8)

    def engine(self,name,loc,r): drive(self.k,self.M,name,self.p(loc),r*self.s)

    def gun(self,bank,loc,r=1.5):
        barbette(self.k,self.M,bank,*self.p(loc),r*self.s,.9*self.s)

    def vent(self,name,loc,w,l,slots=12,rot=(0,0,0)):
        self.k.vent_grille(name,self.p(loc),w*self.s,l*self.s,slots,
                           self.M['TRIM'],self.M['CORE'],rot=rot)

    def done(self,windows=('body',)):
        k=self.k
        k.finish(skip=('body','core','NODE','ENGINE','windows','mach','plate_kit',
            'service','cowl','drive','inlay','lights','spar'))
        if windows:
            k.deck_windows(windows,rows=(-.08,.02,.12),step=self.L/220,
                           size=(self.L*.00015,self.L*.0010,self.L*.0005))
        save_source(self.slug)
