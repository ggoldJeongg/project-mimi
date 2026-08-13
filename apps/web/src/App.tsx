import { useEffect } from "react";
import type { RobotState } from "@mimi/protocol";

// Phase 5: 브라우저는 WebSocket "클라이언트"다. Gateway(서버, ws://localhost:8081)에
// 접속해 RobotState를 받는다. 브라우저엔 WebSocket이 내장돼 있어 라이브러리가 필요없다.
// 이번 단계 완료 기준: 실제 Robot 데이터가 브라우저 콘솔까지 도달하는 것(화면 UI는 다음 Phase).
const WS_URL = "ws://localhost:8081";

export default function App() {
  useEffect(() => {
    // new WebSocket(url) = 접속 시도 시작. 아래 4개 이벤트로 생명주기를 관찰한다.
    const socket = new WebSocket(WS_URL);

    socket.onopen = () => console.log("[ws] open — gateway 연결됨");

    socket.onmessage = (event) => {
      // 서버가 JSON 문자열로 보냄(§7.1 계약) → parse해서 RobotState로 되살린다.
      // 깨진 프레임 하나가 onmessage를 throw로 죽이지 않게 parse만 방어한다.
      try {
        const state: RobotState = JSON.parse(event.data);
        console.log("[ws] message", state.joints);
      } catch {
        console.warn("[ws] JSON parse 실패 — 프레임 버림:", event.data);
      }
    };

    socket.onclose = () => console.log("[ws] close — 연결 종료");
    socket.onerror = () => console.log("[ws] error — gateway 미실행? 포트 확인");

    // cleanup: 컴포넌트가 사라질 때 소켓을 닫는다. StrictMode(dev)는 effect를
    // mount→unmount→mount로 두 번 돌리므로, 여기서 안 닫으면 좀비 연결이 쌓인다.
    return () => socket.close();
  }, []); // []=마운트 시 1회만 연결(재렌더마다 재연결 방지).

  return (
    <main style={{ fontFamily: "monospace", padding: 24, lineHeight: 1.6 }}>
      <h1>project mimi</h1>
      <p>Phase 5 — WebSocket 연결. 브라우저 콘솔(F12)에서 [ws] 로그 확인.</p>
    </main>
  );
}
