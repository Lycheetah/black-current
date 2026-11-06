"""Second collection: the same layered construction used by Savanah Apex.

Shared production operations only. Each hull owns its silhouette and composition.
Original hulls commissioned by Mackenzie Conor James Clark / Lycheetah.
"""
import math
from _forge import armour, machinery_bands, conduits, barbette, looks, dress_plate, top_z
from _atelier import save_source


def body(k,M,L,sec,start=.08,end=.92,rings=42,segs=30):
    length=L*(end-start); y0=L*(.5-start)
    local=lambda t:sec(start+t*(end-start))
    convert=lambda t:(t-start)/(end-start)
    ob=k.loft('body',length,local,rings=rings,segs=segs,mat=M['HULL'],y0=y0)
    k.panelize(ob,rings,segs,skip_row=3,skip_col=4,depth=L*.0007,
               thickness=L*.00085,keep=lambda i,j:3<=i<=rings-3)
    k.bevel(ob,L*.00045,1,30); k.weighted_normals(ob); k.smooth(ob)
    return ob,length,y0,local,convert


def skin(k,M,L,local,length,y0,convert,seed,density=1):
    armour(k,M,local,length,y0,convert,
        dorsal=((.15,.25),(.27,.37),(.40,.49),(.72,.81),(.82,.90)),
        flanks=((.17,.30),(.32,.45),(.48,.62),(.65,.78),(.80,.90)),
        thick=L*.0017,seed=seed)
    machinery_bands(k,M,local,length,y0,convert,.15,.89,L*.0037,
                    seed=seed+20,dorsal_gap=(.50,.70),density=density)
    conduits(k,M,local,length,y0,convert,(.18,.30,.43,.56,.70,.86),L*.0009)


def drive(k,M,name,loc,r):
    x,y,z=loc
    k.nozzle('drive_'+name,loc,r,r*2.3,M,glow='GLOW')
    k.cowl('drive_cowl_'+name,(x,y+r*.45,z),r,r*2.8,M,sides=10,fins_n=18)
    # Longitudinal equipment modules and a segmented retaining collar.
    for a in range(6):
        q=a*math.tau/6
        ob=k.box('drive_service',(.24*r,1.9*r,.28*r),
                 (x+math.cos(q)*r*1.31,y+r*.9,z+math.sin(q)*r*1.31),M['HULL'])
        k.bevel(ob,r*.035,1);k.weighted_normals(ob)
    k.empty('ENGINE_'+name,(x,y-r*1.4,z),r*.9)


def fittings(k,M,L,sec,placements):
    for bank,t,side in placements:
        w,top,bot,n,zo=sec(t)
        barbette(k,M,bank,side*w*.58,L*(.5-t),zo+top*.94,L*.016,L*.011)


def finish(k,L,slug,targets=('body',),rows=(-.16,-.04,.08,.20)):
    k.finish(skip=('body','core','NODE','ENGINE','windows','mach','plate_kit',
                   'service','cowl','drive','mandible','crown_vein','lights'))
    print('FOUNDY_WINDOWS',k.deck_windows(targets,rows=rows,step=L/190,
               size=(L*.00022,L*.0014,L*.0007)),flush=True)
    save_source(slug)
