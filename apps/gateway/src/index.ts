import { startUdp } from "./udp";

// Phase 4: 실제 Robot과 UDP 양방향 연결.
//  - 수신: 로봇 텔레메트리를 받아 파싱 로그를 찍는다.
//  - 송신: 핸드셰이크로 내 IP를 로봇에 알려 텔레메트리를 트리거한다.
// web의 명령을 로봇으로 넘기는 WebSocket 연결은 Phase 5.
startUdp();

console.log("[gateway] alive. UDP 시작됨.");
