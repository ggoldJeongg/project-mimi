import { startUdp } from "./udp";
import { startWs } from "./ws";

// Phase 4: 실제 Robot과 UDP 양방향 연결(수신 파싱 + 핸드셰이크 송신).
// Phase 5: WebSocket 서버를 열고, UDP로 받은 RobotState를 web으로 흘려보낸다.
//   Robot → UDP → Gateway → [WebSocket] → Browser
const { broadcast } = startWs();
const { sendCommand } = startUdp(broadcast);

console.log("[gateway] alive. UDP + WebSocket 시작됨.");

// ── 송신 테스트(임시): Enter 누를 때마다 J1 목표각을 0° ↔ 10° 토글해 전송 ──
// ⚠ Joint limit 검증 전이라 작은 각도로만 테스트. Phase 5에서 web 명령으로 대체.
// 참고: watch 모드가 키 입력을 가로챌 수 있으니 이 테스트는 `npm start`로 실행 권장.
console.log("[gateway] Enter → J1 명령 전송(0° ↔ 10° 토글). 종료: Ctrl+C");
let j1Target = 0;
process.stdin.on("data", () => {
  j1Target = j1Target === 0 ? 10 : 0;
  console.log(`[gateway] 명령 전송 → J1=${j1Target}° (J2=0 J3=0)`);
  sendCommand({ j1: j1Target, j2: 0, j3: 0 });
});
