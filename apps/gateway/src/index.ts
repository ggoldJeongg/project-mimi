import { startUdp } from "./udp";

// Phase 4: 실제 Robot과 UDP 양방향 연결.
//  - 수신: 로봇 텔레메트리를 받아 파싱한다(1초 집계 로그).
//  - 송신: 핸드셰이크로 내 IP를 로봇에 알려 텔레메트리를 트리거한다.
// web의 명령을 로봇으로 넘기는 WebSocket 연결은 Phase 5.
const { sendCommand } = startUdp();

console.log("[gateway] alive. UDP 시작됨.");

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
