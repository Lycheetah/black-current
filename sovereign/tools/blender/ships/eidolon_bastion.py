"""EIDOLON BASTION · Hybrid Fused dreadnought · three kilometres.

A sealed port citadel and an open starboard machine skeleton have been surgically
joined around one spinal reactor. Ship architecture, not a symmetrical skin swap.
Original design by Caelorynth for Mackenzie Conor James Clark / Lycheetah.
"""
import math,os,sys
sys.path.insert(0,os.path.dirname(__file__))
from _forge import ss,bump,prow,looks,fang,top_z,dress_plate
from _foundry import body,skin,drive,fittings,finish

META={'name':'eidolon_bastion_hero.glb','hull':'hybrid_fused_dreadnought','tile':35.,'bake_size':2048}
L=3000.;S=L/90.;Y=lambda t:L*(.5-t)


def sec(t):
    p=prow(t,.09)
    w=(3.6+3.9*ss(.06,.4,t)+1.1*bump(.63,.14,t))*(1-.43*ss(.78,1,t))*p*S
    top=(2.7+3.2*ss(.08,.42,t)+2.0*bump(.6,.13,t))*p*S
    bot=(2.4+2.5*ss(.06,.45,t))*p*S
    return w,top,bot,2.65,-.3*S


def build(k):
    M=k.palette();M['CORE']=k.material('CORE',(.005,.003,.008),.5,.4)
    hull,length,y0,local,conv=body(k,M,L,sec,rings=46,segs=34)
    skin(k,M,L,local,length,y0,conv,6100,density=1.55)

    # Port side: a second, bulbous armoured lineage, partly fused into the central hull.
    def graft(t):
        p=prow(t,.08)
        w=(1.8+3.5*ss(.05,.32,t))*(1-.32*ss(.76,1,t))*p*S
        return w,w*.72,w*.65,2.5,0
    graft_len=L*.66;graft_y=Y(.19)
    o=k.loft('grafted_hull',graft_len,graft,rings=34,segs=28,mat=M['HULL'],y0=graft_y)
    k.panelize(o,34,28,skip_row=3,skip_col=4,depth=.07*S,thickness=.10*S,keep=lambda i,j:3<=i<=31)
    k.bevel(o,.06*S,1);k.weighted_normals(o);k.smooth(o)
    o.location=(-5.3*S,0,1.7*S)
    for i in range(7):
        a=.12+i*.115;b=a+.13
        plate=k.shell_patch('graft_armour',graft,graft_len,graft_y,a,b,.3,math.pi-.3,
             M['TRIM'] if i%3==1 else M['HULL'],scale=1.045,flare=.035,
             thickness=.17*S,segs=14,rings=8,panels=.48,seed=6120+i)
        plate.location=(-5.3*S,0,1.7*S)
        lip=k.edge_curve(graft,graft_len,graft_y,b,.3,math.pi-.3,scale=1.09)
        k.tube('graft_bronze_lip',[(x-5.3*S,y,z+1.7*S) for x,y,z in lip],
               [.045*S]*len(lip),M['GOLD'],bevel_res=1,res=2)

    # Starboard side: open vertebrae around a luminous reactor. Large negative spaces stay open.
    bx=11.5*S
    k.tube('reactor_spindle',[(bx,Y(.25),0),(bx,Y(.79),0)],
           [1.65*S,1.35*S],M['CORE'],bevel_res=2,res=2)
    k.tube('reactor_seam',[(bx,Y(.28),1.3*S),(bx,Y(.75),1.1*S)],
           [.20*S,.14*S],M['GLOW'],bevel_res=1,res=2)
    for q in range(11):
        t=.26+q*.045;y=Y(t);r=(3.5+.7*math.sin(q/10*math.pi))*S
        k.armour_ring('reactor_vertebra',r,.35*S,.60*S,(bx,y,0),M,
                      rot=(math.pi/2,0,.05*q),blocks=10,gap=.22,glow=q%3==0)
        for z in (-2.1*S,2.1*S):
            k.tube('graft_stay',[(5.7*S,y,z),(bx,y-.7*S,z)],
                   [.42*S,.34*S],M['TRIM'],bevel_res=1,res=1)
        # Ivory graft clamps are structural, with violet stitches only at the join.
        ob=k.plate('graft_clamp',[(0,0),(4*S,-1*S),(5*S,-2.6*S),(1*S,-2*S)],
                  .35*S,M['GOLD'],loc=(5*S,y,3.7*S),bevel_w=.06*S)
        k.plane_kit('clamp_services',(7*S,y-1*S,4.1*S),(1,0,0),(0,1,0),(0,0,1),
                    (3*S,1.5*S),M,count=7,h=.20*S,seed=6140+q,tiles=False)

    # Three cut, leaning fins carry dense service panels; their separated roots expose the machinery.
    for q,(t,h) in enumerate(((.39,12),(.53,16),(.68,10))):
        w,top,bot,n,zo=sec(t)
        outline=[(0,3*S),(0,-4*S),(h*.38*S,-8*S),(h*S,-12*S),
                 (h*.82*S,-4*S),(h*.46*S,3*S)]
        fin=k.plate('bastion_fin',outline,.55*S,M['TRIM'],
                    loc=(-3*S,Y(t),zo+top*.94),rot=(0,-math.pi/2,0),bevel_w=.09*S)
        dress_plate(k,M,fin,(0,1,0),(0,0,1),(1,0,0),
                    (-3*S,Y(t)-2*S,zo+top+h*.32*S),(6*S,h*.52*S),.30*S,6170+q,count=18)
        k.tube('fin_energy',[(-2.7*S,Y(t)+2*S,zo+top),
              (-2.7*S,Y(t)-4*S,zo+top+h*.75*S),(-2.7*S,Y(t)-11*S,zo+top+h*S)],
              [.09*S,.07*S,.025*S],M['GLOW'],bevel_res=1,res=3)

    # A heavily layered, oblique prow and an offset command blister.
    for side in (-1,1):
        pts=[(side*4*S,Y(.20),-1*S),(side*6*S,Y(.10),-1.8*S),
             (side*4*S,Y(.025),-2.7*S),(side*1.5*S,Y(-.025),-2*S)]
        k.limb('prow_lock',pts,[2.0*S,2.1*S,1.5*S,.18*S],M['TRIM'],
               core_mat=M['HULL'],sides=6,plates=9,up=(0,0,1),flare=1.09,tip=2)
    bridge=k.wedge('command_keep',(5*S,12*S,4*S),(-5*S,Y(.62),8*S),M['HULL'],slope=.30,back=.15)
    k.bevel(bridge,.14*S,2);k.weighted_normals(bridge)
    k.box_kit('command_services',(-5*S,Y(.62),8*S),(5*S,12*S,4*S),M,
              count=22,h=.25*S,seed=6180,faces=('top','left','right'))
    k.sensor_mast('long_range_array',(-5*S,Y(.69),11*S),5*S,M['TRIM'],M['GLOW'],dish=1.4*S)
    # Continuous necks tie the two offset drives into their different hull lineages.
    # Their roots overlap the graft and spindle, rather than leaving unsupported nozzles.
    k.cylinder('port_drive_neck',2.2*S,8*S,(-5.5*S,Y(.86),1*S),
               M['TRIM'],segs=24,r2=2.5*S)
    k.cylinder('reactor_drive_neck',1.45*S,L*.16,(11.5*S,Y(.84),0),
               M['TRIM'],segs=24,r2=1.7*S)
    for q,t in enumerate((.80,.84,.88)):
        k.armour_ring('drive_neck_collar',1.7*S,.20*S,.45*S,
                      (11.5*S,Y(t),0),M,rot=(math.pi/2,0,0),blocks=10,gap=.13,glow=q==1)
    for name,x,z,r in [('PORT',-5.5,1,3.1),('CORE',1,-1,2.5),('GRAFT',11.5,0,2.0)]:
        drive(k,M,name,(x*S,Y(.91),z*S),r*S)
    fittings(k,M,L,sec,[(bank+side,t,s) for bank,t in [('F',.25),('M',.50),('A',.77)]
                        for side,s in [('L',-1),('R',1)]])
    finish(k,L,'eidolon_bastion',targets=('body','grafted_hull'),rows=(-.20,-.10,.02,.12,.22))


LOOKS=looks('hybrid_fused',L)
LOOKS['HULL'].update(base=(.12,.13,.14),base2=(.17,.17,.17),mottle_col=(.09,.10,.11))
LOOKS['GOLD'].update(base=(.46,.36,.22),base2=(.39,.29,.17),edge=(.69,.57,.36),metal=.55)
