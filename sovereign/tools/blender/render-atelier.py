"""Consistent Cycles studio photographs of the actual exported GLBs.

blender -b -t 6 --python tools/blender/render-atelier.py -- nightglass cinder_cathedral open_hand
Use ATELIER_VIEW=rear for a second angle, ATELIER_SAMPLES to change sample count.
"""
import math
import os
import sys
import bpy
from mathutils import Vector

ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'..','..'))
OUT=os.path.join(ROOT,'captures',os.environ.get('ATELIER_COLLECTION','atelier'))
os.makedirs(OUT,exist_ok=True)
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else sys.argv[1:]
for slug in args or ['nightglass','cinder_cathedral','open_hand']:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    src=os.path.join(ROOT,'tools','blender','out',slug+'_hero.raw.glb')
    if not os.path.exists(src):
        src=os.path.join(ROOT,'src','data','models',slug+'_hero.glb')
    bpy.ops.import_scene.gltf(filepath=src)
    bpy.context.view_layer.update()
    obs=[o for o in bpy.context.scene.objects if o.type=='MESH']
    pts=[o.matrix_world @ Vector(v) for o in obs for v in o.bound_box]
    mn=Vector([min(p[i] for p in pts) for i in range(3)])
    mx=Vector([max(p[i] for p in pts) for i in range(3)])
    c=(mn+mx)*.5
    size=max(mx-mn)
    scene=bpy.context.scene
    world=bpy.data.worlds.new('deep_navy_studio'); world.use_nodes=True
    world.node_tree.nodes['Background'].inputs[0].default_value=(.035,.046,.065,1)
    world.node_tree.nodes['Background'].inputs[1].default_value=.38
    scene.world=world

    def area(name,offset,energy,color,width):
        data=bpy.data.lights.new(name,'AREA'); data.energy=energy*(size/50)**2
        data.color=color; data.shape='DISK'; data.size=size*width
        ob=bpy.data.objects.new(name,data); bpy.context.collection.objects.link(ob)
        ob.location=c+Vector(offset)*size
        ob.rotation_euler=(c-ob.location).to_track_quat('-Z','Y').to_euler()
    area('large_warm_key',(.6,.65,1.2),32000,(1,.91,.80),.9)
    area('cool_edge',(-.9,-.45,.65),42000,(.42,.62,1),.65)
    area('front_softbox',(-.8,1.0,.2),12000,(.75,.86,1),.8)
    area('underside_bounce',(.6,-.4,-.7),8000,(.55,.75,1),.7)
    area('aft_strip',(.5,-1.2,.4),18000,(1,.72,.45),.5)

    camera=bpy.data.cameras.new('portrait_camera'); camera.lens=55
    camera.clip_start=size*.001; camera.clip_end=size*30
    co=bpy.data.objects.new('portrait_camera',camera); bpy.context.collection.objects.link(co)
    view=os.environ.get('ATELIER_VIEW','studio')
    direction=(.98,1.28,.90) if view=='studio' else (-1.05,-1.3,.70)
    co.location=c+Vector(direction)*size
    co.rotation_euler=(c-co.location).to_track_quat('-Z','Y').to_euler()
    scene.camera=co
    scene.render.engine='CYCLES'; scene.cycles.device='CPU'
    scene.cycles.samples=int(os.environ.get('ATELIER_SAMPLES','32'))
    scene.cycles.use_denoising=True
    scene.render.threads_mode='FIXED'; scene.render.threads=6
    scene.render.resolution_x=1440; scene.render.resolution_y=1080
    scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG'
    scene.render.film_transparent=False
    scene.view_settings.view_transform='AgX'
    scene.render.filepath=os.path.join(OUT,slug+'-'+view+'.png')
    bpy.ops.render.render(write_still=True)
    print('ATELIER_STUDIO',slug,view,scene.render.filepath,flush=True)
