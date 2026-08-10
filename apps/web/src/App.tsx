import type { RobotState } from "@mimi/protocol";

// Phase 0: 공유 타입 import가 브라우저 빌드에서도 동작하는지 검증하는 최소 화면.
const sample: RobotState = {
  sequence: 0,
  timestamp: 0,
  joints: { j1: 0, j2: 0, j3: 0 },
  status: "IDLE",
};

export default function App() {
  return (
    <main style={{ fontFamily: "monospace", padding: 24, lineHeight: 1.6 }}>
      <h1>project mimi</h1>
      <p>Phase 0 — 빈 뼈대. @mimi/protocol 공유 타입 import 검증용.</p>
      <pre>{JSON.stringify(sample, null, 2)}</pre>
    </main>
  );
}
