// 실제 STL 지오메트리로 "집기 → 드래그 → 각도"의 배선을 검증한다.
// 브라우저 없이 돌기 때문에 좌표계·부호 오류를 눈으로 찾지 않아도 된다.

import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import type { JointAxis } from "@mimi/protocol";
import { PARTS } from "./robotModel";
import { applyPose, buildHierarchy, pickJoint, placeParts, type Hierarchy } from "./robotScene";
import { applyDragDelta, signedAngleAround, worldAxisOf } from "./jointPicking";

const modelPath = (file: string) => fileURLToPath(new URL(`../public/models/${file}`, import.meta.url));

const loadGeometries = () => {
  const loader = new STLLoader();
  const cache = new Map<string, THREE.BufferGeometry>();
  for (const file of new Set(PARTS.map((p) => p.file))) {
    const buf = fs.readFileSync(modelPath(file));
    // Buffer는 큰 풀을 공유하므로 해당 구간만 잘라 ArrayBuffer로 넘긴다.
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    cache.set(file, loader.parse(ab as ArrayBuffer));
  }
  return cache;
};

/** RobotView와 같은 시점의 카메라. */
const makeCamera = () => {
  const camera = new THREE.PerspectiveCamera(50, 556 / 420, 1, 5000);
  camera.position.set(220, 170, 250);
  camera.lookAt(0, 70, 0);
  camera.updateMatrixWorld(true);
  return camera;
};

let cache: Map<string, THREE.BufferGeometry>;
let solid: Hierarchy;
let camera: THREE.PerspectiveCamera;

beforeAll(() => {
  cache = loadGeometries();
  solid = buildHierarchy();
  placeParts(solid, cache, false);
  applyPose(solid, { j1: 0, j2: 0, j3: 0 });
  solid.root.updateMatrixWorld(true);
  camera = makeCamera();
});

const rayAt = (ndcX: number, ndcY: number) => {
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
  return raycaster;
};

describe("STL 로드", () => {
  it("5개 파트가 모두 삼각형을 가진 지오메트리로 파싱된다", () => {
    expect(cache.size).toBe(5);
    for (const [file, geo] of cache) {
      const position = geo.getAttribute("position");
      expect(position, file).toBeDefined();
      expect(position.count, file).toBeGreaterThan(0);
    }
  });
});

describe("관절 집기", () => {
  it("기본 시점에서 세 관절이 모두 집힌다", () => {
    const found = new Set<JointAxis>();
    for (let x = -0.8; x <= 0.8; x += 0.05) {
      for (let y = -0.8; y <= 0.8; y += 0.05) {
        const axis = pickJoint(rayAt(x, y), [solid.root]);
        if (axis) found.add(axis);
      }
    }
    expect([...found].sort()).toEqual(["j1", "j2", "j3"]);
  });

  it("빈 공간을 겨누면 아무것도 안 집힌다", () => {
    expect(pickJoint(rayAt(-0.98, 0.98), [solid.root])).toBeNull();
  });

  it("pick이 없는 부품(고정 베이스)은 관절을 돌려주지 않는다", () => {
    // base.stl에는 pick이 없다 → 그 메시만 있는 씬에서는 항상 null.
    const baseOnly = buildHierarchy();
    const baseCache = new Map([["base.stl", cache.get("base.stl")!]]);
    placeParts(baseOnly, baseCache, false);
    baseOnly.root.updateMatrixWorld(true);
    for (let x = -0.5; x <= 0.5; x += 0.1) {
      expect(pickJoint(rayAt(x, -0.3), [baseOnly.root])).toBeNull();
    }
  });
});

describe("드래그 → 각도", () => {
  // J1은 Y축 회전이므로 회전 평면이 수평이다.
  const dragFrame = () => {
    const group = solid.groups.g1;
    const axisVec = worldAxisOf(group, "y");
    const pivot = group.getWorldPosition(new THREE.Vector3());
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(axisVec, pivot);
    return { axisVec, pivot, plane };
  };

  const pointAt = (ndcX: number, ndcY: number, plane: THREE.Plane) => {
    const point = new THREE.Vector3();
    const hit = rayAt(ndcX, ndcY).ray.intersectPlane(plane, point);
    expect(hit, `NDC(${ndcX},${ndcY})가 회전 평면과 만나야 한다`).not.toBeNull();
    return point;
  };

  it("J1 회전축은 월드 Y축이다", () => {
    const { axisVec } = dragFrame();
    expect(axisVec.x).toBeCloseTo(0);
    expect(axisVec.y).toBeCloseTo(1);
    expect(axisVec.z).toBeCloseTo(0);
  });

  it("드래그 방향이 반대면 각도 부호도 반대다", () => {
    const { axisVec, pivot, plane } = dragFrame();
    const start = pointAt(0, 0, plane);
    const right = signedAngleAround(axisVec, pivot, start, pointAt(0.2, 0, plane));
    const left = signedAngleAround(axisVec, pivot, start, pointAt(-0.2, 0, plane));

    expect(right).not.toBe(0);
    expect(Math.sign(right)).toBe(-Math.sign(left));
  });

  it("더 멀리 끌수록 각도가 커진다", () => {
    const { axisVec, pivot, plane } = dragFrame();
    const start = pointAt(0, 0, plane);
    const near = Math.abs(signedAngleAround(axisVec, pivot, start, pointAt(0.15, 0, plane)));
    const far = Math.abs(signedAngleAround(axisVec, pivot, start, pointAt(0.35, 0, plane)));

    expect(far).toBeGreaterThan(near);
  });

  it("드래그 결과가 관절 한계 안으로 잘린다", () => {
    const { axisVec, pivot, plane } = dragFrame();
    const start = pointAt(0, 0, plane);
    const delta = signedAngleAround(axisVec, pivot, start, pointAt(0.6, 0, plane));

    // j2는 ±90이라 큰 시작값 + 큰 드래그는 반드시 잘린다.
    const dragged = applyDragDelta("j2", 85, Math.abs(delta) + 1, false);
    expect(dragged).toBeLessThanOrEqual(90);
    expect(dragged).toBeGreaterThanOrEqual(-90);
  });
});

describe("계층 반영", () => {
  it("J1이 돌면 하위 관절의 회전축도 함께 돈다", () => {
    const posed = buildHierarchy();
    placeParts(posed, cache, false);

    applyPose(posed, { j1: 0, j2: 0, j3: 0 });
    posed.root.updateMatrixWorld(true);
    const before = worldAxisOf(posed.groups.g2, "x").clone();

    applyPose(posed, { j1: 90, j2: 0, j3: 0 });
    posed.root.updateMatrixWorld(true);
    const after = worldAxisOf(posed.groups.g2, "x");

    expect(after.angleTo(before)).toBeCloseTo(Math.PI / 2, 2);
  });

  it("고스트와 실선이 다른 자세를 잡으면 부품 위치가 벌어진다", () => {
    const ghost = buildHierarchy();
    placeParts(ghost, cache, true);

    applyPose(solid, { j1: 0, j2: 0, j3: 0 });
    applyPose(ghost, { j1: 45, j2: 0, j3: 0 });
    solid.root.updateMatrixWorld(true);
    ghost.root.updateMatrixWorld(true);

    const a = solid.groups.g3.getWorldPosition(new THREE.Vector3());
    const b = ghost.groups.g3.getWorldPosition(new THREE.Vector3());
    expect(a.distanceTo(b)).toBeGreaterThan(1);
  });
});
