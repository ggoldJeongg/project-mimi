// 3D 드래그를 관절 각도로 바꾸는 순수 계산. Three.js 씬 없이 단위 테스트한다(기획서 §13).

import * as THREE from "three";
import { JOINT_LIMIT_DEG } from "@mimi/protocol";
import type { JointAxis } from "@mimi/protocol";

// 회전 중심을 거의 정확히 집으면 방향 벡터가 0에 수렴해 각도가 튄다. 단위는 mm².
const MIN_RADIUS_SQ = 1;

// 시선이 회전 평면과 나란하면 평면 교차점이 무한대로 발산한다. |ray·axis|가 이보다 작으면 무시.
const MIN_AXIS_DOT = 0.15;

/**
 * pivot을 중심으로 from → to가 axisVec 둘레로 몇 라디안 돌았는지(부호 포함).
 * axisVec는 정규화되어 있어야 하고, from·to는 회전 평면 위의 점이어야 한다.
 */
export function signedAngleAround(
  axisVec: THREE.Vector3,
  pivot: THREE.Vector3,
  from: THREE.Vector3,
  to: THREE.Vector3,
): number {
  const v0 = new THREE.Vector3().subVectors(from, pivot);
  const v1 = new THREE.Vector3().subVectors(to, pivot);
  if (v0.lengthSq() < MIN_RADIUS_SQ || v1.lengthSq() < MIN_RADIUS_SQ) return 0;
  const cross = new THREE.Vector3().crossVectors(v0, v1);
  // atan2를 쓰면 ±π 전 구간에서 부호가 살아난다. acos는 부호를 잃는다.
  return Math.atan2(cross.dot(axisVec), v0.dot(v1));
}

/** 드래그가 시야와 나란해 각도 계산이 불안정한지. */
export function isRayTooParallel(rayDirection: THREE.Vector3, axisVec: THREE.Vector3): boolean {
  return Math.abs(rayDirection.dot(axisVec)) < MIN_AXIS_DOT;
}

/** 관절 한계 안으로 자른다. 드래그는 텍스트 입력과 달리 거부가 아니라 clamp가 맞다. */
export function clampToLimit(axis: JointAxis, deg: number): number {
  const { min, max } = JOINT_LIMIT_DEG[axis];
  return Math.min(max, Math.max(min, deg));
}

/**
 * 드래그로 생긴 Three.js 회전량(radian)을 로봇 각도(degree)에 더한다.
 * invert는 로봇 + 방향과 Three.js 회전 + 방향이 반대임을 뜻하므로 여기서 되돌린다.
 */
export function applyDragDelta(
  axis: JointAxis,
  startDeg: number,
  deltaRad: number,
  invert: boolean,
): number {
  const deltaDeg = THREE.MathUtils.radToDeg(deltaRad) * (invert ? -1 : 1);
  return clampToLimit(axis, startDeg + deltaDeg);
}

/** 그룹의 로컬 회전축을 월드 방향으로 변환. 자기 회전에는 불변이라 부모 자세만 반영된다. */
export function worldAxisOf(group: THREE.Object3D, rotationAxis: "x" | "y" | "z"): THREE.Vector3 {
  const local = new THREE.Vector3(
    rotationAxis === "x" ? 1 : 0,
    rotationAxis === "y" ? 1 : 0,
    rotationAxis === "z" ? 1 : 0,
  );
  const rotation = new THREE.Matrix4().extractRotation(group.matrixWorld);
  return local.applyMatrix4(rotation).normalize();
}
