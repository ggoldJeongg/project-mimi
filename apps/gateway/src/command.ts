// Gateway → Robot UDP command 인코딩. parseTelemetry(수신)의 역방향(송신).
import type { Joints } from "./parser";

export function encodeCommand(joints: Joints): string {
  // degree → raw(centi-degree). 24.5° → 2450. 소수는 반올림해 정수로.
  const j1 = Math.round(joints.j1 * 100);
  const j2 = Math.round(joints.j2 * 100);
  const j3 = Math.round(joints.j3 * 100);
  return `target;${j1};${j2};${j3};`;
}

// 비상정지 : 로봇이 받으면 모든 작동을 멈추고 모터 힘을 푼다. 
export function encodeStop(): string {
  return "stop";
}
