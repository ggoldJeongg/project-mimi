// web ↔ gateway 공유 계약. 순수 TS만 (Node/브라우저 전용 API 금지).
//
// 최소 계약 원칙(YAGNI): 지금 실제로 쓰는 값만 둔다.
// 로봇이 실제로 보내는 것은 J1/J2/J3 세 각도뿐이므로(→ docs/PROTOCOL.md),
// RobotState도 joints만 갖는다.
//
// 아래는 "필요해질 때 다시 추가"할 후보다. 지금 넣지 않는 이유:
//  - sequence : UDP 손실 감지(§19)를 실제로 구현할 때. 지금은 감지 로직이 없다.
//  - timestamp: 지연/차트 시간축이 필요할 때. 지금은 소비처가 없다.
//  - status   : 상태 UX(Phase 13)를 붙일 때. 지금은 표시 화면이 없다.

/** 3축 관절 각도(degree). 로봇이 실제로 보내는 값. web·gateway 공용 단일 출처. */
export interface Joints {
  j1: number;
  j2: number;
  j3: number;
}

export interface RobotState {
  joints: Joints;
}
