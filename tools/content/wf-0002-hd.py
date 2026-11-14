"""Render the original Courier cargo transport as 36 transparent HD sprites.

Run: blender -b --factory-startup --python tools/content/wf-0002-hd.py
The saved .blend is the editable master; frames 0..31 cover headings and 32..35
cover cargo ramp stages. Legacy 32x32 C17.SHP inputs are intentionally untouched.
"""
import math
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "game/content/wireframes/hd/WF-0002"
OUT.mkdir(parents=True, exist_ok=True)

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)

def material(name, color, metallic=0.0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    p = m.node_tree.nodes.get("Principled BSDF")
    p.inputs["Base Color"].default_value = (*color, 1)
    p.inputs["Metallic"].default_value = metallic
    p.inputs["Roughness"].default_value = 0.58
    return m

hull = material("Deep teal hull", (0.09, 0.31, 0.29), 0.18)
upper = material("Seafoam upper panels", (0.25, 0.69, 0.57), 0.12)
trim = material("Wing leading edges", (0.56, 0.86, 0.75), 0.25)
glass = material("Blue cockpit glazing", (0.16, 0.38, 0.58), 0.32)
engine = material("Warm nacelle cowling", (0.68, 0.47, 0.23), 0.32)
dark = material("Cargo bay interior", (0.045, 0.10, 0.13))
ramp_mat = material("Cargo ramp", (0.66, 0.53, 0.32), 0.22)

root = bpy.data.objects.new("Courier C17 original aircraft master", None)
bpy.context.collection.objects.link(root)

def mesh(name, verts, faces, mat, parent=root):
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.update()
    obj = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    obj.data.materials.append(mat)
    bevel = obj.modifiers.new("Gentle machined edges", "BEVEL")
    bevel.width = 0.055
    bevel.segments = 2
    obj.modifiers.new("Weighted normals", "WEIGHTED_NORMAL")
    return obj

def slab(name, polygon, z0, z1, mat):
    n = len(polygon)
    verts = [(x,y,z0) for x,y in polygon] + [(x,y,z1) for x,y in polygon]
    faces = [tuple(reversed(range(n))), tuple(range(n,2*n))]
    faces += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    return mesh(name, verts, faces, mat)

def cube(name, location, scale, mat):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    o = bpy.context.object
    o.name = name
    o.dimensions = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.parent = root
    o.data.materials.append(mat)
    bevel = o.modifiers.new("Rounded bodywork", "BEVEL")
    bevel.width = 0.10
    bevel.segments = 3
    o.modifiers.new("Weighted normals", "WEIGHTED_NORMAL")
    return o

def nacelle(name, x):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, location=(x,0.95,0.28))
    obj = bpy.context.object
    obj.name = name
    obj.scale = (0.47,0.82,0.33)
    obj.parent = root
    obj.data.materials.append(engine)
    cube(name+" intake", (x,0.30,0.34), (0.56,0.16,0.23), dark)

# Nose points toward -Y, frame zero is north. High-wing fictional transport.
slab("Tapered freight fuselage", [(-0.47,-3.6),(0.47,-3.6),(0.87,-2.8),(0.88,2.15),
                                (0.58,3.65),(-0.58,3.65),(-0.88,2.15),(-0.87,-2.8)],0,0.75,hull)
slab("Raised dorsal spine", [(-0.58,-2.75),(0.58,-2.75),(0.67,1.65),
                               (0.43,2.75),(-0.43,2.75),(-0.67,1.65)],0.75,0.88,upper)
slab("Port gull wing", [(-0.65,-1.0),(-3.75,-0.23),(-4.65,1.20),(-4.13,1.42),(-0.75,0.80)],0.69,0.86,hull)
slab("Starboard gull wing", [(0.65,-1.0),(3.75,-0.23),(4.65,1.20),(4.13,1.42),(0.75,0.80)],0.69,0.86,hull)
slab("Port wing leading trim",[(-0.76,-0.95),(-3.70,-0.18),(-3.86,0.10),(-0.76,-0.54)],0.87,0.91,trim)
slab("Starboard wing leading trim",[(0.76,-0.95),(3.70,-0.18),(3.86,0.10),(0.76,-0.54)],0.87,0.91,trim)
slab("Twin tailplane port",[(-0.45,2.36),(-2.10,2.45),(-2.65,3.50),(-0.48,3.19)],0.70,0.90,upper)
slab("Twin tailplane starboard",[(0.45,2.36),(2.10,2.45),(2.65,3.50),(0.48,3.19)],0.70,0.90,upper)
slab("Port split fin",[(-2.46,2.83),(-2.10,2.83),(-2.10,3.60),(-2.48,3.76)],0.91,1.20,hull)
slab("Starboard split fin",[(2.46,2.83),(2.10,2.83),(2.10,3.60),(2.48,3.76)],0.91,1.20,hull)
slab("Panoramic blue cockpit",[(-0.46,-3.10),(0.46,-3.10),(0.59,-2.11),(-0.59,-2.11)],0.88,0.98,glass)
slab("Freight spine stripe",[(-0.095,-1.8),(0.095,-1.8),(0.095,1.95),(-0.095,1.95)],0.89,0.91,trim)
nacelle("Port underslung lift nacelle",-2.14)
nacelle("Starboard underslung lift nacelle",2.14)

# Door frames use a fixed north-facing hull; only the hinged bay/ramp moves.
bay = slab("Rear cargo opening",[(-0.58,2.72),(0.58,2.72),(0.58,3.65),(-0.58,3.65)],0.89,0.925,dark)
ramp = slab("Articulated rear loading ramp",[(-0.60,2.80),(0.60,2.80),(0.58,3.60),(-0.58,3.60)],0.93,1.015,ramp_mat)

world = bpy.context.scene.world
world.color = (0.28,0.28,0.28)
world.use_nodes = True
world.node_tree.nodes.get("Background").inputs["Color"].default_value = (0.48,0.58,0.61,1)
world.node_tree.nodes.get("Background").inputs["Strength"].default_value = 0.75

def area(name, xyz, power, size):
    data=bpy.data.lights.new(name,"AREA")
    obj=bpy.data.objects.new(name,data)
    bpy.context.collection.objects.link(obj)
    obj.location=xyz
    direction=Vector((0,0,0))-obj.location
    obj.rotation_euler=direction.to_track_quat('-Z','Y').to_euler()
    data.energy=power
    data.shape="DISK"
    data.size=size

area("Broad cool key",(-5,-7,11),1250,8)
area("Soft warm fill",(6,4,9),750,7)

cam_data = bpy.data.cameras.new("Fixed orthographic production camera")
camera=bpy.data.objects.new("Fixed orthographic production camera",cam_data)
bpy.context.collection.objects.link(camera)
camera.location=(0,0,20)
camera.rotation_euler=(0,0,math.pi)
# Cameras look down their -Z axis, Y remains up in the image.
cam_data.type="ORTHO"
cam_data.ortho_scale=12.7
bpy.context.scene.camera=camera

scene=bpy.context.scene
scene.render.engine="CYCLES"
scene.cycles.samples=8
bpy.context.view_layer.cycles.use_denoising=False
scene.render.resolution_x=512
scene.render.resolution_y=512
scene.render.resolution_percentage=100
scene.render.film_transparent=True
scene.render.image_settings.file_format="PNG"
scene.render.image_settings.color_mode="RGBA"
scene.render.image_settings.color_depth="8"
scene.render.image_settings.compression=35
scene.view_settings.view_transform="Standard"
scene.render.filepath=str(OUT / "preview.png")

bpy.ops.wm.save_as_mainfile(filepath=str(OUT / "Courier-C17-master.blend"))

for frame in range(36):
    root.rotation_euler.z = -frame * math.tau / 32 if frame<32 else 0
    stage = frame-32 if frame>=32 else 0
    bay.hide_render = frame<32 or stage==0
    ramp.hide_render = frame<32
    # Backward hinge translation and graded downward tilt expose bay gradually.
    ramp.location.y = (0, 0.13, 0.47, 0.86)[stage]
    ramp.location.z = (0, 0.04, -0.13, -0.35)[stage]
    ramp.rotation_euler.x = (0, 0.12, 0.30, 0.49)[stage]
    scene.render.filepath=str(OUT / f"{frame:04d}.png")
    bpy.ops.render.render(write_still=True)
    print(f"WF-0002 HD frame {frame:02d}/35 complete", flush=True)
