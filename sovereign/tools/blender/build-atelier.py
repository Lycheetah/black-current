"""Run the existing cloud-agent build.py inside installed Blender or a bpy Python.

blender -b -t 6 --python tools/blender/build-atelier.py -- nightglass cinder_cathedral open_hand
NOBAKE=1 makes the silhouette-review pass; omit it for the final Cycles texture bake.
"""
import os
import runpy
import sys
import time
import faulthandler

here=os.path.dirname(os.path.abspath(__file__))
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else sys.argv[1:]
sys.path.insert(0,here)
import shipkit
import bpy

# Progress only: the cloud baker and exporter still execute unchanged.
sys.stdout.reconfigure(line_buffering=True)
if os.environ.get('ATELIER_TRACE'):
    faulthandler.dump_traceback_later(120,repeat=True)
data_samples=int(os.environ.get('ATELIER_DATA_SAMPLES','1'))
ao_samples=int(os.environ.get('ATELIER_AO_SAMPLES','4'))
seen_maps=set()
original_bake=shipkit.bake_textures
def traced_bake(*a,**kw):
    seen_maps.clear()
    kw['samples']=data_samples
    print('ATELIER_BAKE_START',bpy.data.filepath,flush=True)
    result=original_bake(*a,**kw)
    print('ATELIER_BAKE_FINISHED',bpy.data.filepath,flush=True)
    return result
shipkit.bake_textures=traced_bake
original_target=shipkit._bake_target
def traced_target(material,image):
    bpy.context.scene.cycles.samples=ao_samples if image.name.endswith('_ao') else data_samples
    if image.name not in seen_maps:
        print('ATELIER_BAKE_MAP',image.name,'samples',bpy.context.scene.cycles.samples,flush=True)
        seen_maps.add(image.name)
    return original_target(material,image)
shipkit._bake_target=traced_target
started=time.monotonic()
print('ATELIER_BUILD_START',args or ['nightglass','cinder_cathedral','open_hand'],flush=True)
sys.argv=[os.path.join(here,'build.py'),*(args or ['nightglass','cinder_cathedral','open_hand'])]
runpy.run_path(sys.argv[0],run_name='__main__')
faulthandler.cancel_dump_traceback_later()
print('ATELIER_BUILD_FINISHED',round(time.monotonic()-started,1),'seconds',flush=True)
