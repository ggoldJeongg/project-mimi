// Gateway → Robot UDP command 인코딩. parseTelemetry(수신)의 역방향(송신).
//
// PROTOCOL.md §2.2: 게이트웨이 송신 형식 = "target;j1;j2;j3;"
//   - 맨 앞 "target" 태그(로봇이 목표값 명령으로 인식)
//   - 각 값은 degree×100(centi-degree) 정수, 값 뒤마다 ";"
//   - 세 축(J1/J2/J3)을 항상 모두 보낸다(부분 축 갱신 없음).

import type { Joints } from "./parser";

export function encodeCommand(joints: Joints): string {
  // degree → raw(centi-degree). 24.5° → 2450. 소수는 반올림해 정수로.
  const j1 = Math.round(joints.j1 * 100);
  const j2 = Math.round(joints.j2 * 100);
  const j3 = Math.round(joints.j3 * 100);
  return `target;${j1};${j2};${j3};`;
}
