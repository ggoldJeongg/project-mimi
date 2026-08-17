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
  { file: "28bjy-48.stl", group: "base", pos: [0, 20.92, 0], rot: [0, 180, 0], color: 0xe08b2c },
  { file: "3axis_stepmotor_robot_y.stl", group: "g1", pos: [10, 59, 8], rot: [-90, 0, 90], color: 0xc0392b },
  { file: "28bjy-48.stl", group: "g1", pos: [10.89, 59.18, 8.1], rot: [135, 0, 270], color: 0xe08b2c },
  { file: "3axis_stepmotor_robot_arm.stl", group: "g2", pos: [20.58, 139.52, 14.34], rot: [-90, -90, 0], color: 0xc0392b },
  { file: "28bjy-48.stl", group: "g2", pos: [0.69, 134.72, 14.79], rot: [180, 0, 90], color: 0xe08b2c },
  { file: "3axos_stepmotor_robot_hand.stl", group: "g3", pos: [-8.89, 134.71, 22.76], rot: [-180, 90, -90], color: 0xbdc3c7 },
];

export interface JointConfig {
  axis: JointAxis;
  group: Exclude<GroupId, "base">;
  /** Three.js 회전축. */
  rotationAxis: "x" | "y" | "z";
  /**
   * 로봇의 + 방향과 Three.js 회전 + 방향이 반대인가.
   * 세 축 모두 실물로 확인했다. CAD 뷰어의 축 설정과는 부호가 반대다.
   */
  invert: boolean;
}

export const JOINT_CONFIG: JointConfig[] = [
  { axis: "j1", group: "g1", rotationAxis: "y", invert: true },
  { axis: "j2", group: "g2", rotationAxis: "x", invert: true },
  { axis: "j3", group: "g3", rotationAxis: "x", invert: false },
];
