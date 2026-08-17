import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { applyDragDelta, clampToLimit, isRayTooParallel, signedAngleAround, worldAxisOf } from "./jointPicking";

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const deg = (rad: number) => +THREE.MathUtils.radToDeg(rad).toFixed(4);

describe("signedAngleAround", () => {
  const axisY = v(0, 1, 0);
  const origin = v(0, 0, 0);

  it("Y축 둘레 +90°는 +90으로 나온다", () => {
    // 오른손 법칙: +Y 둘레로 +90°면 +X → -Z
    expect(deg(signedAngleAround(axisY, origin, v(10, 0, 0), v(0, 0, -10)))).toBe(90);
  });

  it("반대로 돌면 부호가 뒤집힌다", () => {
    expect(deg(signedAngleAround(axisY, origin, v(0, 0, -10), v(10, 0, 0)))).toBe(-90);
  });

  it("pivot이 원점이 아니어도 맞는다", () => {
    const pivot = v(5, 20, 5);
    expect(deg(signedAngleAround(axisY, pivot, v(15, 20, 5), v(5, 20, -5)))).toBe(90);
  });

  it("반 바퀴 근처까지 부호가 살아난다", () => {
    // +Y 둘레 +90°가 +X → -Z이므로, z가 양수인 쪽이 음의 각도다.
    expect(deg(signedAngleAround(axisY, origin, v(10, 0, 0), v(-10, 0, 1)))).toBeCloseTo(-174.29, 1);
    expect(deg(signedAngleAround(axisY, origin, v(10, 0, 0), v(-10, 0, -1)))).toBeCloseTo(174.29, 1);
  });

  it("회전 중심을 집으면 0을 돌려준다(방향이 정의되지 않음)", () => {
    expect(signedAngleAround(axisY, origin, v(0.1, 0, 0), v(10, 0, 0))).toBe(0);
    expect(signedAngleAround(axisY, origin, v(10, 0, 0), v(0, 0, 0.1))).toBe(0);
  });
});

describe("clampToLimit", () => {
  it("j2는 ±90에서 잘린다", () => {
    expect(clampToLimit("j2", 120)).toBe(90);
    expect(clampToLimit("j2", -120)).toBe(-90);
    expect(clampToLimit("j2", 45)).toBe(45);
  });

  it("j1·j3은 ±180까지 통과한다", () => {
    expect(clampToLimit("j1", 120)).toBe(120);
    expect(clampToLimit("j3", 200)).toBe(180);
  });
});

describe("applyDragDelta", () => {
  const quarter = Math.PI / 2;

  it("invert=false면 회전량이 그대로 더해진다", () => {
    expect(applyDragDelta("j1", 30, quarter, false)).toBeCloseTo(120);
  });

  it("invert=true면 부호를 되돌린다", () => {
    expect(applyDragDelta("j1", 30, quarter, true)).toBeCloseTo(-60);
  });

  it("한계를 넘으면 잘린다", () => {
    expect(applyDragDelta("j2", 60, quarter, false)).toBe(90);
  });
});

describe("isRayTooParallel", () => {
  it("시선이 회전축과 나란하면 안정적이다", () => {
    expect(isRayTooParallel(v(0, 1, 0), v(0, 1, 0))).toBe(false);
  });

  it("시선이 회전 평면과 나란하면 불안정으로 본다", () => {
    expect(isRayTooParallel(v(1, 0, 0), v(0, 1, 0))).toBe(true);
  });
});

describe("worldAxisOf", () => {
  it("부모가 돌면 자식의 회전축도 함께 돈다", () => {
    const parent = new THREE.Group();
    parent.rotation.z = Math.PI / 2; // +X가 +Y로 감
    const child = new THREE.Group();
    parent.add(child);
    parent.updateMatrixWorld(true);

    const axis = worldAxisOf(child, "x");
    expect(axis.x).toBeCloseTo(0);
    expect(axis.y).toBeCloseTo(1);
  });

  it("자기 회전에는 축이 불변이다", () => {
    const group = new THREE.Group();
    group.rotation.x = 1.234;
    group.updateMatrixWorld(true);

    const axis = worldAxisOf(group, "x");
    expect(axis.x).toBeCloseTo(1);
    expect(axis.y).toBeCloseTo(0);
    expect(axis.z).toBeCloseTo(0);
  });
});
