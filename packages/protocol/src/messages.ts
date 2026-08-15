// web ↔ gateway 공유 계약. 순수 TS만 (Node/브라우저 전용 API 금지).

/** 3축 관절 각도(degree). web·gateway 공용 단일 출처. */
export interface Joints {
  j1: number;
  j2: number;
  j3: number;
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
