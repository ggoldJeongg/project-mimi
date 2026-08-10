// web ↔ gateway 공유 계약. 순수 TS만 (Node/브라우저 전용 API 금지).
// Phase 0에서는 타입 공유가 실제로 동작하는지 검증하기 위한 최소 타입만 둔다.
// 나머지(MoveCommand, WsMessage envelope 등)는 WebSocket을 붙이는 Phase 1에서 추가.

export interface RobotState {
  sequence: number;
  timestamp: number;
  joints: {
    j1: number;
    j2: number;
    j3: number;
  };
  status: "IDLE" | "RUNNING" | "HOLD" | "ERROR";
}
