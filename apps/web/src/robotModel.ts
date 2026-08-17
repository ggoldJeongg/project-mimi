// 3축 로봇 조립 정보. 단위 mm, Y-up.
// 출처: Fusion 모델 실측 뷰어(robot_sim_offline.html). 모델을 다시 받으면 이 파일만 갱신한다.

import type { JointAxis } from "@mimi/protocol";

/** 관절 그룹. base는 고정, g1~g3이 J1~J3을 따라 돈다. */
export type GroupId = "base" | "g1" | "g2" | "g3";

export type Vec3 = [number, number, number];

export interface Part {
  file: string;
  group: GroupId;
  pos: Vec3;
  /** degree. STL이 Z-up이라 대부분 X축 -90° 보정이 들어간다. */
  rot: Vec3;
  color: number;
  /**
   * 3D에서 이 부품을 집었을 때 조작할 관절. 없으면 집히지 않는다(고정 베이스).
   * 소속 그룹과 다를 수 있다 — 모터는 자기가 "구동하는" 관절에 매핑해야 직관에 맞다.
   * 예: J2 모터는 g1에 붙어 있지만(J2가 돌아도 제자리) 집으면 J2를 조작한다.
   */
  pick?: JointAxis;
}

/**
 * 관절 회전 중심(월드 기준, mm).
 * 모터 배치 위치가 아니라 샤프트 위치다 — 28BYJ-48은 축이 몸통 중심에서 약 8mm 치우쳐 있다.
 */
export const PIVOT: Record<Exclude<GroupId, "base">, Vec3> = {
  g1: [0, 20.92, 7.95],
  g2: [10.89, 64.8, 13.72],
  g3: [0.69, 134.72, 22.74],
};

/** 각 관절의 모터는 "고정 쪽(부모)" 그룹에 넣는다. 그 관절이 돌아도 모터는 제자리여야 한다. */
export const PARTS: Part[] = [
  { file: "base.stl", group: "base", pos: [0, 0, 0], rot: [-90, 0, 0], color: 0x4a90e2 },
  { file: "28bjy-48.stl", group: "base", pos: [0, 20.92, 0], rot: [0, 180, 0], color: 0xe08b2c, pick: "j1" },
  { file: "3axis_stepmotor_robot_y.stl", group: "g1", pos: [10, 59, 8], rot: [-90, 0, 90], color: 0xc0392b, pick: "j1" },
  { file: "28bjy-48.stl", group: "g1", pos: [10.89, 59.18, 8.1], rot: [135, 0, 270], color: 0xe08b2c, pick: "j2" },
  { file: "3axis_stepmotor_robot_arm.stl", group: "g2", pos: [20.58, 139.52, 14.34], rot: [-90, -90, 0], color: 0xc0392b, pick: "j2" },
  { file: "28bjy-48.stl", group: "g2", pos: [0.69, 134.72, 14.79], rot: [180, 0, 90], color: 0xe08b2c, pick: "j3" },
  // 밝은 배경에서 옅은 회색은 묻힌다 → 그리퍼만 한 단계 진하게.
  { file: "3axos_stepmotor_robot_hand.stl", group: "g3", pos: [-8.89, 134.71, 22.76], rot: [-180, 90, -90], color: 0x94a3b8, pick: "j3" },
];

export interface JointConfig {
  axis: JointAxis;
  group: Exclude<GroupId, "base">;
  /** Three.js 회전축. */
  rotationAxis: "x" | "y" | "z";
  /**
   * 로봇의 + 방향과 Three.js 회전 + 방향이 반대인가.
   * 세 축 모두 실제 로봇을 움직여 3D와 대조해 확정했다(CAD 뷰어 값과는 j1·j3이 반대).
   * 판단은 반드시 실물 텔레메트리로 해야 한다 — 3D 드래그는 invert와 무관하게
   * 항상 마우스를 따라가므로(드래그 각도와 포즈 변환이 역함수) 검증 근거가 못 된다.
   */
  invert: boolean;
}

export const JOINT_CONFIG: JointConfig[] = [
  { axis: "j1", group: "g1", rotationAxis: "y", invert: true },
  { axis: "j2", group: "g2", rotationAxis: "x", invert: false },
  { axis: "j3", group: "g3", rotationAxis: "x", invert: false },
];

/** 집은 부품의 관절로 설정을 찾을 때 쓴다. */
export const jointConfigOf = (axis: JointAxis): JointConfig =>
  JOINT_CONFIG.find((j) => j.axis === axis)!;
