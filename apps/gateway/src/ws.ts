// Gateway ↔ Web WebSocket 서버. 이 파일만 ws(WebSocket 서버)를 만진다.
//
// 역할: Gateway는 WebSocket "서버"다. 포트를 열고 브라우저(클라이언트)의
// 접속을 기다리다가, UDP로 받은 RobotState를 접속한 모두에게 push한다.
// 브라우저는 raw UDP를 못 만지므로(보안 샌드박스), Gateway가 UDP↔WebSocket
// 번역기(프로토콜 어댑터) 역할을 한다 — CLAUDE.md "UDP는 gateway 안에만".
//
// 왜 ws 라이브러리인가: Node에는 WebSocket "클라이언트"조차 최근에야 들어왔고
// "서버"는 내장돼 있지 않다. ws가 사실상 표준(의존성 0)이라 이걸 쓴다.

import { WebSocketServer, WebSocket } from "ws";
import type { RobotState } from "@mimi/protocol";

const WS_PORT = 8081; // UDP(8080) 바로 옆. TCP 포트라 UDP 8080과 안 겹친다.

export function startWs() {
  // 서버 생성 = 즉시 8081에서 접속 대기 시작.
  const wss = new WebSocketServer({ port: WS_PORT });
  console.log(`[ws] listening ws://localhost:${WS_PORT} — 브라우저 접속 대기`);

  // 접속한 클라이언트는 wss.clients(Set)로 이미 관리된다. 별도 배열을 두면
  // close 때 직접 지워야 해서 버그의 온상 → ws가 주는 Set을 그대로 쓴다(DRY).
  wss.on("connection", (socket, req) => {
    console.log(`[ws] client 접속 (${req.socket.remoteAddress}), 총 ${wss.clients.size}`);

    // 연결 종료 처리: 브라우저 새로고침·탭 닫기 시 발생. ws가 clients Set에서
    // 자동으로 빼주므로 여기선 로그만. (죽은 소켓에 push하는 문제는 broadcast에서 방어)
    socket.on("close", () => {
      console.log(`[ws] client 종료, 남은 ${wss.clients.size}`);
    });

    // 소켓 에러(비정상 끊김 등)도 잡아둔다 — 안 잡으면 프로세스가 죽을 수 있다.
    socket.on("error", (err) => {
      console.error("[ws] socket error:", err.message);
    });
  });

  // UDP 수신부(udp.ts)가 파싱한 RobotState를 넘기면, 접속한 모두에게 뿌린다.
  // JSON 문자열로 직렬화 — 브라우저는 JSON.parse로 받는다(§7.1 계약).
  function broadcast(state: RobotState) {
    const payload = JSON.stringify(state);
    for (const client of wss.clients) {
      // OPEN 상태만 전송. 닫히는 중(CLOSING)인 소켓에 쓰면 에러 → 방어.
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }

  return { broadcast };
}
