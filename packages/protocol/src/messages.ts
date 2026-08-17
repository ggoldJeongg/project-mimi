// web ↔ gateway 공유 계약. 순수 TS만 (Node/브라우저 전용 API 금지).

/** 3축 관절 각도(degree). web·gateway 공용 단일 출처. */
export interface Joints {
  j1: number;
  j2: number;
  j3: number;
}

export type JointAxis = keyof Joints;

export const JOINT_AXES = ["j1", "j2", "j3"] as const satisfies readonly JointAxis[];

/** 관절 각도 한계(degree). 전선이 감기는 것을 막는 하드웨어 제약 */
export const JOINT_LIMIT_DEG = { min: -180, max: 180 } as const;

export function findJointsOutOfRange(joints: Partial<Joints> | null | undefined): JointAxis[] {
  return JOINT_AXES.filter((axis) => {
    const deg = joints?.[axis];
    return (
      typeof deg !== "number" ||
      !Number.isFinite(deg) ||
      deg < JOINT_LIMIT_DEG.min ||
      deg > JOINT_LIMIT_DEG.max
    );
  });
}

// state와 command는 구조가 같아(둘 다 joints) type 태그로 구분한다(§7.1 envelope).

/** gateway → web: 로봇 현재값. */
export interface StateMessage {
  type: "state";
  joints: Joints;
}

/** web → gateway: 목표값 이동. */
export interface CommandMessage {
  type: "move";
  joints: Joints;
}

/** web → gateway: 비상 정지(모터 힘 풀기, 안전). */
export interface StopMessage {
  type: "stop";
}

export type ClientMessage = CommandMessage | StopMessage;
