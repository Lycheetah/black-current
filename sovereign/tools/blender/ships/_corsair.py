"""Surface construction for the frontier hulls; each ship owns its main geometry."""
import math
from mathutils import Vector,Matrix
from _atelier import mesh


def solid(F,name,verts,faces,mat='HULL',bevel=.055):
    ob=mesh(F.k,name,[F.p(v) for v in verts],faces,F.M[mat],smooth=False)
    if bevel:F.k.bevel(ob,bevel*F.s,2);F.k.weighted_normals(ob)
    return ob


def mix(a,b,t):return Vector(a).lerp(Vector(b),t)


def facet(F,name,corners,mat='HULL',service=False,outward=None):
    """A cut, inset plate on its real quad, with a few deliberately placed fittings."""
    A,B,C,D=map(Vector,corners)
    U=(B-A).normalized();V=(D-A).normalized();N=U.cross(V).normalized()
    center=(A+B+C+D)/4
    if outward is not None and N.dot(Vector(outward))<0:N=-N
    if N.length<.1:return
    def p(u,v):return mix(mix(A,B,u),mix(D,C,u),v)
    uv=[(.08,.07),(.88,.07),(.94,.15),(.94,.89),(.14,.92),(.07,.84)]
    ring=[p(u,v) for u,v in uv]
    verts=[tuple(q+N*d) for d in (.025,.12) for q in ring]
    n=len(ring);faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]
    faces.extend((i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n))
    solid(F,name,verts,faces,mat,bevel=.025)
    # Fittings use a local orthonormal basis; their base follows the actual face.
    V=N.cross(U).normalized();R=Matrix((U,V,N)).transposed().to_euler()
    w=(B-A).length;h=(D-A).length
    def fitted(label,size,u,v,d,material):
        loc=p(u,v)+N*d
        ob=F.k.box(label,F.p(size),F.p(loc),F.M[material],rot=R)
        F.k.bevel(ob,.015*F.s,1)
    if service and min(w,h)>.8:
        fitted('recessed_service',(.45*w,.38*h,.03),.5,.5,.14,'CORE')
        for j in range(4):fitted('service_louvre',(.37*w,.065,.07),.5,.35+j*.10,.18,'TRIM')
        fitted('service_indicator',(.11,.11,.035),.72,.72,.18,'GLOW')
    else:
        fitted('armour_latch',(.18,.10,.06),.22,.2,.17,'GOLD')
        fitted('armour_latch',(.18,.10,.06),.79,.8,.17,'GOLD')


def chine(F,name,stations,mat='HULL',plate=True):
    """Eight-sided hard chines. Stations are (y,width,top,bottom,centre_x)."""
    rings=[]
    for y,w,top,bot,x in stations:
        rings.append([(x, y,top+.45),(x+w*.72,y,top),(x+w,y,top*.12),
            (x+w*.84,y,bot*.72),(x,y,bot),(x-w*.84,y,bot*.72),
            (x-w,y,top*.12),(x-w*.72,y,top)])
    verts=[p for r in rings for p in r];n=8
    faces=[tuple(reversed(range(n))),tuple((len(rings)-1)*n+j for j in range(n))]
    faces.extend((i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j)
                 for i in range(len(rings)-1) for j in range(n))
    solid(F,name,verts,faces,mat,.075)
    if plate:
        for i in range(1,len(rings)-2):
            for j in (0,1,6,7):
                A=Vector(rings[i][j]);B=Vector(rings[i][(j+1)%8])
                C=Vector(rings[i+1][(j+1)%8]);D=Vector(rings[i+1][j])
                for q in range(2):
                    corners=[mix(A,D,q/2),mix(B,C,q/2),mix(B,C,(q+1)/2),mix(A,D,(q+1)/2)]
                    direction=(sum(v.x for v in corners)/4-stations[i][4],0,2)
                    facet(F,name+'_cut_plate',corners,mat,
                          service=(i+j+q)%4==0,outward=direction)
    return rings


def casing(F,name,outline,z,depth,rise,mat='HULL',center=None):
    """A sculpted solid casing: bevel belt, inward sloping crown, raised ridge."""
    if sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(outline,outline[1:]+outline[:1]))<0:
        outline=list(reversed(outline))
    cx,cy=center or (sum(p[0] for p in outline)/len(outline),sum(p[1] for p in outline)/len(outline))
    low=[(x,y,z-depth) for x,y in outline]
    rim=[(x,y,z) for x,y in outline]
    crown=[(cx+(x-cx)*.72,cy+(y-cy)*.72,z+rise*.82) for x,y in outline]
    n=len(outline);verts=low+rim+crown+[(cx,cy,z+rise)]
    faces=[tuple(reversed(range(n)))]
    for i in range(n):
        j=(i+1)%n
        faces.extend(((i,j,n+j,n+i),(n+i,n+j,2*n+j,2*n+i),(2*n+i,2*n+j,3*n)))
    solid(F,name,verts,faces,mat,.09)
    for i in range(n):
        j=(i+1)%n
        facet(F,name+'_edge_armour',[rim[i],rim[j],crown[j],crown[i]],
              'TRIM' if i%3==0 else mat,service=i%3==1,outward=(0,0,1))
    return rim,crown


def drive(F,name,loc,r):
    """Recessed bell inside four armoured petals, integrated by the ship's root geometry."""
    k=F.k;M=F.M;x,y,z=loc;s=F.s
    k.nozzle('recessed_bell',F.p(loc),r*s,2*r*s,M,glow='GLOW')
    for i in range(4):
        a=math.pi/4+i*math.pi/2
        ob=k.wedge('drive_armour',F.p((r*.8,r*2.7,r*.7)),
            F.p((x+math.cos(a)*r*1.05,y+r*.7,z+math.sin(a)*r*1.05)),
            M['HULL'],slope=.18,rot=(0,-a,0),back=.10)
        k.bevel(ob,.10*s,2);k.weighted_normals(ob)
    F.ring('drive_retaining_band',(x,y+r*.7,z),r*1.22,.14,'GOLD')
    k.empty('ENGINE_'+name,F.p((x,y-r*1.3,z)),r*.85*s)
