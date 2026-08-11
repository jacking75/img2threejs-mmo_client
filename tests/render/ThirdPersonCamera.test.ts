import * as THREE from "three";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_CAMERA_DISTANCE,
  MAX_CAMERA_DISTANCE,
  MIN_CAMERA_DISTANCE,
  ThirdPersonCamera,
} from "../../src/render/ThirdPersonCamera";

describe("ThirdPersonCamera", () => {
  it("keeps a stable orbit distance and looks at the target", () => {
    const target = new THREE.Object3D();
    const camera = new THREE.PerspectiveCamera();
    const controller = new ThirdPersonCamera(camera, target);

    controller.update(0);

    const lookAt = new THREE.Vector3(0, 1.35, 0);
    expect(camera.position.distanceTo(lookAt)).toBeCloseTo(DEFAULT_CAMERA_DISTANCE, 5);

    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    const expectedForward = lookAt.clone().sub(camera.position).normalize();
    expect(forward.dot(expectedForward)).toBeCloseTo(1, 5);
  });

  it("orbits and follows a moved target without changing its contract", () => {
    const target = new THREE.Object3D();
    const camera = new THREE.PerspectiveCamera();
    const controller = new ThirdPersonCamera(camera, target);
    controller.update(0);
    const initialPosition = camera.position.clone();

    controller.rotate(140, -35);
    controller.update(1);
    expect(camera.position.distanceTo(initialPosition)).toBeGreaterThan(1);

    target.position.set(5, 0, -3);
    controller.update(1);
    const lookAt = new THREE.Vector3(5, 1.35, -3);
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    expect(forward.dot(lookAt.sub(camera.position).normalize())).toBeCloseTo(1, 5);
  });

  it("updates the perspective aspect ratio on resize", () => {
    const camera = new THREE.PerspectiveCamera();
    const controller = new ThirdPersonCamera(camera, new THREE.Object3D());
    controller.resize(1600, 900);
    expect(camera.aspect).toBeCloseTo(16 / 9, 5);
  });

  it("clamps MMO-style zoom to the documented near and far distances", () => {
    const target = new THREE.Object3D();
    const camera = new THREE.PerspectiveCamera();
    const controller = new ThirdPersonCamera(camera, target);

    controller.zoom(-100);
    controller.update(0);
    expect(camera.position.distanceTo(new THREE.Vector3(0, 1.35, 0))).toBeCloseTo(MIN_CAMERA_DISTANCE, 5);

    controller.zoom(100);
    controller.update(2);
    expect(camera.position.distanceTo(new THREE.Vector3(0, 1.35, 0))).toBeCloseTo(MAX_CAMERA_DISTANCE, 5);
  });
});
