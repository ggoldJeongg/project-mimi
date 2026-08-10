import type { RobotState } from "@mimi/protocol";

// Phase 0: gateway가 살아있고, packages/protocol의 공유 타입을 import해
// 컴파일된다는 것만 검증한다. UDP/WebSocket은 Phase 1 이후.

const sample: RobotState = {
  sequence: 0,
  timestamp: Date.now(),
  joints: { j1: 0, j2: 0, j3: 0 },
  status: "IDLE",
};

console.log("[gateway] alive. shared RobotState import OK:", sample);
