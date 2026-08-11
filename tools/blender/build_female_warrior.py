"""Build the concept-matched female warrior as a rigged Blender/GLB asset.

Blender coordinates are Z-up with the character facing -Y. The glTF exporter
converts this to Three.js Y-up with the character facing +Z.
"""

from __future__ import annotations

import math
import os
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
GLB_PATH = ROOT / "public" / "assets" / "characters" / "female-warrior.glb"
BLEND_PATH = ROOT / "docs_working" / "blender" / "female-warrior.blend"


def reset_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.armatures):
        for item in list(collection):
            if item.users == 0:
                collection.remove(item)


def material(name: str, color: tuple[float, float, float, float], roughness: float = 0.65,
             metallic: float = 0.0) -> bpy.types.Material:
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = color
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if "Coat Weight" in bsdf.inputs:
        bsdf.inputs["Coat Weight"].default_value = 0.16 if metallic == 0 else 0.28
    return mat


def smooth(obj: bpy.types.Object) -> None:
    if obj.type != "MESH":
        return
    for polygon in obj.data.polygons:
        polygon.use_smooth = True


def apply_transform(obj: bpy.types.Object) -> None:
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.select_set(False)


def uv_sphere(name: str, location: tuple[float, float, float], scale: tuple[float, float, float],
              mat: bpy.types.Material, segments: int = 32, rings: int = 20) -> bpy.types.Object:
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    apply_transform(obj)
    obj.data.materials.append(mat)
    smooth(obj)
    return obj


def cylinder_between(name: str, start: tuple[float, float, float], end: tuple[float, float, float],
                     radius: float, mat: bpy.types.Material, vertices: int = 24,
                     end_radius: float | None = None) -> bpy.types.Object:
    a, b = Vector(start), Vector(end)
    direction = b - a
    midpoint = (a + b) * 0.5
    radius2 = radius if end_radius is None else end_radius
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radius,
        radius2=radius2,
        depth=direction.length,
        location=midpoint,
    )
    obj = bpy.context.object
    obj.name = name
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = direction.to_track_quat("Z", "Y")
    obj.data.materials.append(mat)
    smooth(obj)
    return obj


def capsule_parts(prefix: str, start: tuple[float, float, float], end: tuple[float, float, float],
                  radius: float, mat: bpy.types.Material) -> list[bpy.types.Object]:
    return [
        cylinder_between(prefix + ".shaft", start, end, radius, mat),
        uv_sphere(prefix + ".root", start, (radius, radius, radius), mat, 24, 16),
        uv_sphere(prefix + ".tip", end, (radius, radius, radius), mat, 24, 16),
    ]


def anatomical_limb_parts(
    prefix: str,
    joints: list[tuple[float, float, float]],
    radii: list[float],
    mat: bpy.types.Material,
    depth_scales: list[float] | None = None,
) -> list[bpy.types.Object]:
    """Build a tapered limb without the bead-like joints produced by equal-radius capsules."""
    if len(joints) != len(radii):
        raise ValueError("anatomical limb joints and radii must have matching lengths")
    depth_scales = depth_scales or [0.88] * len(joints)
    parts: list[bpy.types.Object] = []
    for index in range(len(joints) - 1):
        parts.append(cylinder_between(
            f"{prefix}.segment.{index + 1}",
            joints[index],
            joints[index + 1],
            radii[index],
            mat,
            32,
            radii[index + 1],
        ))
    for index, (joint, radius, depth_scale) in enumerate(zip(joints, radii, depth_scales), 1):
        parts.append(uv_sphere(
            f"{prefix}.joint.{index}",
            joint,
            (radius * 1.02, radius * depth_scale, radius * 1.08),
            mat,
            32,
            20,
        ))
    return parts


def create_hand(side: str, sign: int, mat: bpy.types.Material) -> bpy.types.Object:
    """Create a readable stylized hand with a palm, four fingers, and an inward thumb."""
    center_x = 0.7 * sign
    parts = [
        uv_sphere(
            f"body.hand.{side}.palm",
            (center_x, -0.055, 2.11),
            (0.12, 0.078, 0.155),
            mat,
            32,
            22,
        )
    ]
    finger_offsets = (-0.075, -0.025, 0.025, 0.075)
    finger_lengths = (0.135, 0.18, 0.19, 0.16)
    for index, (offset, length) in enumerate(zip(finger_offsets, finger_lengths), 1):
        start = (center_x + offset, -0.068, 2.035)
        end = (center_x + offset + offset * 0.08, -0.078, 2.035 - length)
        parts.append(cylinder_between(
            f"body.hand.{side}.finger.{index}",
            start,
            end,
            0.026,
            mat,
            16,
            0.019,
        ))
        parts.append(uv_sphere(
            f"body.hand.{side}.finger-tip.{index}",
            end,
            (0.019, 0.018, 0.025),
            mat,
            16,
            10,
        ))
    thumb_start = (center_x - sign * 0.09, -0.064, 2.095)
    thumb_end = (center_x - sign * 0.145, -0.085, 1.99)
    parts.append(cylinder_between(
        f"body.hand.{side}.thumb",
        thumb_start,
        thumb_end,
        0.034,
        mat,
        18,
        0.024,
    ))
    hand = join_objects(parts, f"body.hand.{side}")
    bpy.context.view_layer.objects.active = hand
    hand.select_set(True)
    hand.data.remesh_voxel_size = 0.012
    hand.data.remesh_voxel_adaptivity = 0.0
    bpy.ops.object.voxel_remesh()
    smooth(hand)
    hand.select_set(False)
    return hand


def join_objects(objects: list[bpy.types.Object], name: str) -> bpy.types.Object:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    result = bpy.context.object
    result.name = name
    return result


def bevel(obj: bpy.types.Object, width: float = 0.025, segments: int = 3) -> None:
    modifier = obj.modifiers.new("soft-bevel", "BEVEL")
    modifier.width = width
    modifier.segments = segments
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    smooth(obj)


def cube(name: str, location: tuple[float, float, float], scale: tuple[float, float, float],
         mat: bpy.types.Material, bevel_width: float = 0.02) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    apply_transform(obj)
    obj.data.materials.append(mat)
    if bevel_width:
        bevel(obj, bevel_width, 3)
    return obj


def torus(name: str, location: tuple[float, float, float], major_radius: float, minor_radius: float,
          mat: bpy.types.Material, scale: tuple[float, float, float] = (1, 1, 1)) -> bpy.types.Object:
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major_radius,
        minor_radius=minor_radius,
        major_segments=32,
        minor_segments=10,
        location=location,
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    apply_transform(obj)
    obj.data.materials.append(mat)
    smooth(obj)
    return obj


def curve_tube(name: str, points: list[tuple[float, float, float]], radius: float,
               mat: bpy.types.Material, resolution: int = 3) -> bpy.types.Object:
    curve_data = bpy.data.curves.new(name + ".curve", "CURVE")
    curve_data.dimensions = "3D"
    curve_data.resolution_u = resolution
    curve_data.bevel_depth = radius
    curve_data.bevel_resolution = 3
    spline = curve_data.splines.new("BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for point, coordinate in zip(spline.bezier_points, points):
        point.co = coordinate
        point.handle_left_type = "AUTO"
        point.handle_right_type = "AUTO"
    obj = bpy.data.objects.new(name, curve_data)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    obj.select_set(False)
    smooth(obj)
    return obj


def panel(name: str, points: list[tuple[float, float]], depth: float, y: float,
          mat: bpy.types.Material, bevel_width: float = 0.018) -> bpy.types.Object:
    vertices = []
    for x, z in points:
        vertices.append((x, y - depth * 0.5, z))
    for x, z in points:
        vertices.append((x, y + depth * 0.5, z))
    count = len(points)
    faces = [tuple(range(count)), tuple(range(count, count * 2))[::-1]]
    for index in range(count):
        nxt = (index + 1) % count
        faces.append((index, nxt, count + nxt, count + index))
    mesh = bpy.data.meshes.new(name + ".mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    bevel(obj, bevel_width, 2)
    return obj


def create_anime_head(mat: bpy.types.Material) -> bpy.types.Object:
    """Create a clean high-resolution head with a broad cranium and tapered jaw."""
    head = uv_sphere("body.head", (0, -0.015, 4.3), (0.44, 0.36, 0.5), mat, 64, 48)
    for vertex in head.data.vertices:
        point = vertex.co
        lower_face = max(0.0, min(1.0, (0.14 - point.z) / 0.56))
        upper_cranium = max(0.0, min(1.0, (point.z - 0.1) / 0.28))
        point.x *= (1.0 - lower_face * 0.19) * (1.0 + upper_cranium * 0.035)
        if point.y < 0:
            point.y += lower_face * 0.025
    mesh_data = bmesh.new()
    mesh_data.from_mesh(head.data)
    bmesh.ops.recalc_face_normals(mesh_data, faces=mesh_data.faces)
    mesh_data.to_mesh(head.data)
    mesh_data.free()
    head.data.update()
    smooth(head)
    return head


def create_armature() -> tuple[bpy.types.Object, dict[str, tuple[Vector, Vector]]]:
    armature_data = bpy.data.armatures.new("female-warrior.rig")
    armature = bpy.data.objects.new("Armature", armature_data)
    bpy.context.collection.objects.link(armature)
    armature.show_in_front = True
    bpy.context.view_layer.objects.active = armature
    armature.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")

    definitions = [
        ("root.bone", None, (0, 0, 0.16), (0, 0, 2.25)),
        ("pelvis", "root.bone", (0, 0, 2.18), (0, 0, 2.72)),
        ("chest", "pelvis", (0, 0, 2.68), (0, 0, 3.72)),
        ("neck", "chest", (0, 0, 3.68), (0, 0, 4.0)),
        ("head", "neck", (0, 0, 3.95), (0, 0, 4.56)),
        ("arm.L.upper", "chest", (0.48, 0, 3.58), (0.66, 0, 2.9)),
        ("arm.L.lower", "arm.L.upper", (0.66, 0, 2.9), (0.7, -0.01, 2.27)),
        ("hand.L", "arm.L.lower", (0.7, -0.01, 2.27), (0.7, -0.08, 2.02)),
        ("arm.R.upper", "chest", (-0.48, 0, 3.58), (-0.66, 0, 2.9)),
        ("arm.R.lower", "arm.R.upper", (-0.66, 0, 2.9), (-0.7, -0.01, 2.27)),
        ("hand.R", "arm.R.lower", (-0.7, -0.01, 2.27), (-0.7, -0.08, 2.02)),
        ("leg.L.upper", "pelvis", (0.25, 0, 2.25), (0.26, 0, 1.3)),
        ("leg.L.lower", "leg.L.upper", (0.26, 0, 1.3), (0.26, 0, 0.42)),
        ("ankle.L", "leg.L.lower", (0.26, 0, 0.42), (0.26, -0.18, 0.12)),
        ("leg.R.upper", "pelvis", (-0.25, 0, 2.25), (-0.26, 0, 1.3)),
        ("leg.R.lower", "leg.R.upper", (-0.26, 0, 1.3), (-0.26, 0, 0.42)),
        ("ankle.R", "leg.R.lower", (-0.26, 0, 0.42), (-0.26, -0.18, 0.12)),
        ("back", "chest", (0, 0.26, 3.45), (0, 0.28, 3.7)),
    ]
    segments: dict[str, tuple[Vector, Vector]] = {}
    for name, parent_name, head, tail in definitions:
        bone = armature_data.edit_bones.new(name)
        bone.head = head
        bone.tail = tail
        if parent_name:
            bone.parent = armature_data.edit_bones[parent_name]
        segments[name] = (Vector(head), Vector(tail))
    bpy.ops.object.mode_set(mode="OBJECT")
    armature.select_set(False)
    return armature, segments


def point_segment_distance(point: Vector, start: Vector, end: Vector) -> float:
    segment = end - start
    if segment.length_squared == 0:
        return (point - start).length
    t = max(0.0, min(1.0, (point - start).dot(segment) / segment.length_squared))
    return (point - (start + segment * t)).length


def candidate_bones(point: Vector) -> list[str]:
    if point.z > 3.86:
        return ["head", "neck"]
    if abs(point.x) > 0.46 and point.z > 2.0:
        side = "L" if point.x > 0 else "R"
        return [f"arm.{side}.upper", f"arm.{side}.lower", f"hand.{side}"]
    if point.z < 2.32:
        side = "L" if point.x >= 0 else "R"
        return [f"leg.{side}.upper", f"leg.{side}.lower", f"ankle.{side}", "pelvis"]
    return ["pelvis", "chest", "neck"]


def skin_object(obj: bpy.types.Object, armature: bpy.types.Object,
                segments: dict[str, tuple[Vector, Vector]], forced_bone: str | None = None) -> None:
    if obj.type != "MESH":
        return
    if forced_bone:
        group = obj.vertex_groups.new(name=forced_bone)
        group.add(list(range(len(obj.data.vertices))), 1.0, "REPLACE")
    else:
        groups = {name: obj.vertex_groups.new(name=name) for name in segments}
        for vertex in obj.data.vertices:
            point = obj.matrix_world @ vertex.co
            scored = []
            for bone_name in candidate_bones(point):
                start, end = segments[bone_name]
                distance = point_segment_distance(point, start, end)
                scored.append((distance, bone_name))
            scored.sort(key=lambda item: item[0])
            selected = scored[:2]
            raw = [1.0 / max(distance, 0.035) ** 3 for distance, _ in selected]
            total = sum(raw)
            for weight, (_, bone_name) in zip(raw, selected):
                groups[bone_name].add([vertex.index], weight / total, "REPLACE")
    modifier = obj.modifiers.new("Armature", "ARMATURE")
    modifier.object = armature
    obj.parent = armature


def create_socket(armature: bpy.types.Object, name: str, bone: str,
                  location: tuple[float, float, float]) -> bpy.types.Object:
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    obj.empty_display_type = "ARROWS"
    obj.empty_display_size = 0.12
    obj.location = location
    obj.parent = armature
    obj.parent_type = "BONE"
    obj.parent_bone = bone
    obj.matrix_parent_inverse = armature.matrix_world.inverted()
    return obj


def build() -> None:
    reset_scene()

    skin = material("skin.warm", (0.93, 0.66, 0.52, 1), 0.68)
    skin_shadow = material("skin.shadow", (0.72, 0.39, 0.32, 1), 0.72)
    blue = material("cloth.warrior.blue", (0.035, 0.23, 0.55, 1), 0.72)
    blue_dark = material("cloth.warrior.shadow", (0.025, 0.09, 0.2, 1), 0.77)
    cream = material("cloth.trim.cream", (0.93, 0.9, 0.79, 1), 0.8)
    shorts = material("cloth.shorts", (0.12, 0.09, 0.08, 1), 0.82)
    leather = material("leather.dark", (0.16, 0.075, 0.035, 1), 0.74)
    leather_light = material("leather.light", (0.31, 0.14, 0.07, 1), 0.72)
    steel = material("metal.steel", (0.52, 0.58, 0.64, 1), 0.25, 0.85)
    brass = material("metal.brass", (0.55, 0.33, 0.08, 1), 0.3, 0.72)
    hair_base = material("hair.chestnut", (0.19, 0.065, 0.035, 1), 0.48)
    hair_highlight = material("hair.highlight", (0.34, 0.12, 0.065, 1), 0.44)
    eye_white = material("eye.white", (0.98, 0.97, 0.91, 1), 0.2)
    eye_green = material("eye.green", (0.08, 0.46, 0.17, 1), 0.18)
    eye_dark = material("eye.dark", (0.012, 0.015, 0.012, 1), 0.25)
    blush = material("face.blush", (0.8, 0.27, 0.25, 1), 0.7)

    body_parts: list[bpy.types.Object] = []
    hand_meshes: list[tuple[bpy.types.Object, str]] = []
    body_parts += [uv_sphere("body.torso.upper", (0, 0, 3.25), (0.5, 0.34, 0.63), skin)]
    body_parts += [uv_sphere("body.torso.waist", (0, 0, 2.72), (0.38, 0.28, 0.46), skin)]
    body_parts += [uv_sphere("body.pelvis", (0, 0, 2.32), (0.46, 0.34, 0.37), skin)]
    body_parts += capsule_parts("body.neck", (0, 0, 3.62), (0, 0, 4.02), 0.15, skin)
    for side, sign in (("L", 1), ("R", -1)):
        shoulder = (0.48 * sign, 0, 3.58)
        elbow = (0.66 * sign, 0, 2.9)
        wrist = (0.7 * sign, -0.01, 2.27)
        body_parts += anatomical_limb_parts(
            f"body.arm.{side}",
            [shoulder, elbow, wrist],
            [0.165, 0.118, 0.092],
            skin,
            [0.82, 0.86, 0.82],
        )
        hand_meshes.append((create_hand(side, sign, skin), f"hand.{side}"))
        hip = (0.25 * sign, 0, 2.28)
        knee = (0.26 * sign, 0, 1.3)
        calf = (0.26 * sign, 0.012, 0.92)
        ankle = (0.26 * sign, 0, 0.42)
        body_parts += anatomical_limb_parts(
            f"body.leg.{side}",
            [hip, knee, calf, ankle],
            [0.225, 0.15, 0.178, 0.112],
            skin,
            [0.88, 0.82, 0.84, 0.78],
        )
        body_parts += [uv_sphere(f"body.foot.{side}", (0.26 * sign, -0.16, 0.18), (0.19, 0.34, 0.16), skin, 24, 16)]

    body = join_objects(body_parts, "body.continuous")
    bpy.context.view_layer.objects.active = body
    body.select_set(True)
    body.data.remesh_voxel_size = 0.03
    body.data.remesh_voxel_adaptivity = 0.0
    bpy.ops.object.voxel_remesh()
    body_smooth = body.modifiers.new("anatomy-surface-relax", "SMOOTH")
    body_smooth.factor = 0.34
    body_smooth.iterations = 4
    bpy.ops.object.modifier_apply(modifier=body_smooth.name)
    smooth(body)
    body.select_set(False)

    armature, segments = create_armature()
    skin_object(body, armature, segments)
    for hand_mesh, hand_bone in hand_meshes:
        skin_object(hand_mesh, armature, segments, hand_bone)
    head_mesh = create_anime_head(skin)
    skin_object(head_mesh, armature, segments, "head")

    wardrobe: list[tuple[bpy.types.Object, str]] = []
    outfit_root = bpy.data.objects.new("outfit.glb.warrior-starter", None)
    bpy.context.collection.objects.link(outfit_root)
    outfit_root.parent = armature

    bpy.ops.mesh.primitive_cone_add(vertices=40, radius1=0.43, radius2=0.52, depth=1.2, location=(0, 0, 3.15))
    tunic = bpy.context.object
    tunic.name = "outfit.warrior.tunic"
    tunic.scale.y = 0.76
    apply_transform(tunic)
    tunic.data.materials.append(blue)
    smooth(tunic)
    wardrobe.append((tunic, "chest"))

    inset = panel("outfit.warrior.inset", [(-0.13, 3.63), (0.13, 3.63), (0.11, 2.68), (0, 2.57), (-0.11, 2.68)], 0.035, -0.39, blue_dark)
    wardrobe.append((inset, "chest"))
    for side, sign in (("L", 1), ("R", -1)):
        collar = cube(f"outfit.warrior.collar.{side}", (0.11 * sign, -0.405, 3.52), (0.035, 0.025, 0.27), cream, 0.012)
        collar.rotation_euler.y = sign * -0.42
        wardrobe.append((collar, "chest"))
        sleeve = cylinder_between(f"outfit.warrior.short-sleeve.{side}", (0.49 * sign, 0, 3.57), (0.57 * sign, 0, 3.26), 0.205, blue, 28, 0.17)
        wardrobe.append((sleeve, f"arm.{side}.upper"))
        cuff = torus(f"outfit.warrior.sleeve-cuff.{side}", (0.57 * sign, 0, 3.25), 0.17, 0.022, cream, (1, 0.78, 1))
        wardrobe.append((cuff, f"arm.{side}.upper"))
        shorts_leg = cylinder_between(f"outfit.warrior.shorts.{side}", (0.25 * sign, 0, 2.25), (0.255 * sign, 0, 1.86), 0.225, shorts, 28, 0.21)
        wardrobe.append((shorts_leg, f"leg.{side}.upper"))
        boot = cylinder_between(f"boot.{side}.shaft", (0.26 * sign, 0, 1.18), (0.26 * sign, 0, 0.36), 0.205, leather, 28, 0.182)
        wardrobe.append((boot, f"leg.{side}.lower"))
        boot_cuff = cylinder_between(f"boot.{side}.cuff", (0.26 * sign, 0, 1.23), (0.26 * sign, 0, 1.04), 0.238, leather_light, 28, 0.216)
        wardrobe.append((boot_cuff, f"leg.{side}.lower"))
        boot_foot = uv_sphere(f"boot.{side}.foot", (0.26 * sign, -0.18, 0.18), (0.21, 0.36, 0.18), leather, 28, 18)
        wardrobe.append((boot_foot, f"ankle.{side}"))
        glove = cylinder_between(f"outfit.warrior.glove.{side}", (0.7 * sign, -0.01, 2.39), (0.7 * sign, -0.04, 2.08), 0.14, leather, 24, 0.125)
        wardrobe.append((glove, f"arm.{side}.lower"))

    left_border = panel("outfit.warrior.skirt-border.L", [(0.02, 2.64), (0.53, 2.55), (0.57, 1.72), (0.11, 1.62)], 0.075, -0.08, cream)
    right_border = panel("outfit.warrior.skirt-border.R", [(-0.02, 2.64), (-0.53, 2.55), (-0.57, 1.72), (-0.11, 1.62)], 0.075, -0.08, cream)
    left_panel = panel("outfit.warrior.skirt.L", [(0.05, 2.59), (0.48, 2.51), (0.51, 1.8), (0.14, 1.7)], 0.085, -0.13, blue)
    right_panel = panel("outfit.warrior.skirt.R", [(-0.05, 2.59), (-0.48, 2.51), (-0.51, 1.8), (-0.14, 1.7)], 0.085, -0.13, blue)
    for item in (left_border, right_border, left_panel, right_panel):
        wardrobe.append((item, "pelvis"))

    belt = torus("outfit.warrior.belt", (0, 0, 2.5), 0.43, 0.045, leather, (1, 0.73, 1))
    wardrobe.append((belt, "pelvis"))
    buckle = torus("outfit.warrior.buckle", (0, -0.37, 2.5), 0.09, 0.018, brass, (1.1, 0.65, 0.8))
    buckle.rotation_euler.x = math.pi / 2
    wardrobe.append((buckle, "pelvis"))
    strap = cube("outfit.warrior.strap", (0, -0.405, 3.2), (0.045, 0.025, 0.82), leather, 0.018)
    strap.rotation_euler.y = -0.52
    wardrobe.append((strap, "chest"))
    pouch = cube("outfit.warrior.pouch", (0.5, -0.28, 2.3), (0.17, 0.11, 0.23), leather_light, 0.045)
    wardrobe.append((pouch, "pelvis"))
    pauldron = uv_sphere("outfit.warrior.pauldron", (0.56, -0.005, 3.58), (0.34, 0.29, 0.17), steel, 32, 18)
    wardrobe.append((pauldron, "arm.L.upper"))

    for obj, bone in wardrobe:
        skin_object(obj, armature, segments, bone)
        obj["outfitId"] = "outfit.warrior-starter"

    traveler = bpy.data.objects.new("outfit.glb.traveler", None)
    bpy.context.collection.objects.link(traveler)
    traveler.parent = armature
    traveler.hide_render = True
    traveler.hide_viewport = True
    traveler_coat = cube("outfit.traveler.coat", (0, 0, 3.13), (0.48, 0.3, 0.63), material("cloth.traveler", (0.06, 0.28, 0.31, 1), 0.76), 0.11)
    skin_object(traveler_coat, armature, segments, "chest")
    traveler_coat["outfitId"] = "outfit.traveler"

    face_parts: list[tuple[bpy.types.Object, str]] = []
    for side, sign in (("L", 1), ("R", -1)):
        center = 0.145 * sign
        eye = panel(
            f"face.eye.{side}.white",
            [
                (center - 0.102, 4.34), (center - 0.055, 4.392),
                (center + 0.045, 4.397), (center + 0.102, 4.35),
                (center + 0.05, 4.292), (center - 0.047, 4.29),
            ],
            0.014,
            -0.386,
            eye_white,
            0.006,
        )
        iris = uv_sphere(f"face.eye.{side}.iris", (center, -0.402, 4.338), (0.036, 0.008, 0.044), eye_green, 24, 16)
        pupil = uv_sphere(f"face.eye.{side}.pupil", (center, -0.411, 4.338), (0.014, 0.004, 0.025), eye_dark, 20, 12)
        catch = uv_sphere(f"face.eye.{side}.catchlight", (center - 0.012 * sign, -0.417, 4.358), (0.007, 0.003, 0.01), eye_white, 12, 8)
        lid = curve_tube(
            f"face.eye.{side}.upper-lid",
            [(center - 0.095, -0.405, 4.35), (center, -0.414, 4.401), (center + 0.095, -0.405, 4.36)],
            0.008,
            hair_base,
        )
        brow = curve_tube(f"face.brow.{side}", [(center - 0.075, -0.392, 4.47), (center, -0.4, 4.49), (center + 0.075, -0.388, 4.465)], 0.009, hair_base)
        cheek = uv_sphere(f"face.cheek.{side}", (0.235 * sign, -0.386, 4.22), (0.045, 0.006, 0.018), blush, 16, 10)
        face_parts += [(eye, "head"), (iris, "head"), (pupil, "head"), (catch, "head"), (lid, "head"), (brow, "head"), (cheek, "head")]
    nose = uv_sphere("face.nose", (0, -0.396, 4.235), (0.018, 0.008, 0.028), skin_shadow, 16, 10)
    mouth = curve_tube("face.mouth", [(-0.06, -0.397, 4.13), (0, -0.405, 4.112), (0.06, -0.397, 4.13)], 0.007, blush)
    face_parts += [(nose, "head"), (mouth, "head")]

    hair_parts: list[bpy.types.Object] = []
    rear_mass = uv_sphere("hair.rear-mass", (0, 0.18, 4.34), (0.46, 0.34, 0.5), hair_base, 36, 24)
    crown_mass = uv_sphere("hair.crown-mass", (0, -0.015, 4.55), (0.45, 0.34, 0.28), hair_highlight, 36, 22)
    hair_parts += [rear_mass, crown_mass]
    bang_roots = [-0.3, -0.18, -0.06, 0.07, 0.19, 0.3]
    for index, x in enumerate(bang_roots, 1):
        tip_x = x * 0.9 + (0.025 if index % 2 else -0.015)
        hair_parts.append(curve_tube(f"hair.bang.{index}", [(x * 0.75, -0.31, 4.7), (x, -0.38, 4.52), (tip_x, -0.385, 4.32 + (index % 3) * 0.035)], 0.052, hair_highlight if index in (2, 5) else hair_base))
    for side, sign in (("L", 1), ("R", -1)):
        hair_parts.append(curve_tube(f"hair.temple.{side}", [(0.34 * sign, -0.18, 4.62), (0.42 * sign, -0.29, 4.3), (0.35 * sign, -0.25, 3.96)], 0.065, hair_base))
    tie = torus("hair.ponytail.tie", (0.08, 0.42, 4.52), 0.11, 0.026, blue_dark, (1, 0.8, 1))
    tie.rotation_euler.x = math.pi / 2
    hair_parts.append(tie)
    for index, offset in enumerate((-0.24, -0.16, -0.08, 0, 0.09, 0.17, 0.25), 1):
        hair_parts.append(curve_tube(
            f"hair.ponytail.{index}",
            [(0.08, 0.41, 4.5), (0.14 + offset * 0.45, 0.5, 4.13), (0.2 + offset, 0.44, 3.62), (0.11 + offset * 0.55, 0.28, 3.0 + (index % 2) * 0.08)],
            0.075 if abs(offset) > 0.18 else 0.09,
            hair_highlight if index in (2, 5) else hair_base,
        ))

    for obj, bone in face_parts + [(obj, "head") for obj in hair_parts]:
        skin_object(obj, armature, segments, bone)

    create_socket(armature, "socket.hand.R", "hand.R", (-0.7, -0.12, 2.08))
    create_socket(armature, "socket.hand.L", "hand.L", (0.7, -0.12, 2.08))
    create_socket(armature, "socket.head", "head", (0, 0, 4.72))
    create_socket(armature, "socket.back", "back", (0, 0.3, 3.42))

    armature["asset.pipeline"] = "blender-glb"
    armature["asset.reference"] = "female-warrior-turnaround-v1.png"
    armature["asset.version"] = 2

    os.makedirs(GLB_PATH.parent, exist_ok=True)
    os.makedirs(BLEND_PATH.parent, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(
        filepath=str(GLB_PATH),
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_skins=True,
        export_animations=True,
        export_extras=True,
    )
    print(f"WROTE_GLTF {GLB_PATH}")
    print(f"WROTE_BLEND {BLEND_PATH}")


if __name__ == "__main__":
    build()
