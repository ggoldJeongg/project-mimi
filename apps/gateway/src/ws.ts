// Gateway ↔ Web WebSocket 서버. 이 파일만 ws를 만진다.
// broadcast(gateway→web 현재값) + onCommand/onStop(web→gateway 명령)의 양방향 어댑터.

import { WebSocketServer, WebSocket } from "ws";
import type { Joints, StateMessage, ClientMessage } from "@mimi/protocol";

const WS_PORT = 8081;

interface WsHandlers {
  onCommand?: (joints: Joints) => void;
  onStop?: () => void;
}

export function startWs(handlers: WsHandlers = {}) {
  const wss = new WebSocketServer({ port: WS_PORT });
  console.log(`[ws] listening ws://localhost:${WS_PORT} — 브라우저 접속 대기`);

  wss.on("connection", (socket, req) => {
    console.log(`[ws] client 접속 (${req.socket.remoteAddress}), 총 ${wss.clients.size}`);

    socket.on("message", (data) => {
      let msg: ClientMessage;
      try {
        msg = JSON.parse(data.toString());
      } catch {
        console.warn("[ws] JSON parse 실패 — 프레임 버림");
        return;
      }
      switch (msg.type) {
        case "move":
          console.log(`[ws] command 수신 → J1=${msg.joints.j1} J2=${msg.joints.j2} J3=${msg.joints.j3}`);
          handlers.onCommand?.(msg.joints);
          break;
        case "stop":
          console.log("[ws] STOP 수신 → 로봇 정지");
          handlers.onStop?.();
          break;
        default:
          console.warn("[ws] 알 수 없는 메시지 타입:", (msg as { type?: string }).type);
      }
    });

    socket.on("close", () => console.log(`[ws] client 종료, 남은 ${wss.clients.size}`));
    socket.on("error", (err) => console.error("[ws] socket error:", err.message));
  });

  function broadcast(joints: Joints) {
    const payload = JSON.stringify({ type: "state", joints } satisfies StateMessage);
    for (const client of wss.clients) {
      // 닫히는 중인 소켓에 쓰면 에러 → OPEN만 전송.
      if (client.readyState === WebSocket.OPEN) client.send(payload);
    }
  }

  return { broadcast };
}
